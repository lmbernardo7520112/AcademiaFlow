/**
 * @module siage.service
 * SIAGE sync business logic: run management, matching engine, idempotent import.
 *
 * Architecture rules:
 * - API is the authority of write (worker never touches DB directly)
 * - Nota upsert is intra-process via NotaModel.updateOne (not HTTP loopback)
 * - Credentials never stored in SiageRun documents
 */
import { SiageRunModel } from '../../models/SiageRun.js';
import { SiageRunItemModel } from '../../models/SiageRunItem.js';
import { SiageDisciplinaAliasModel } from '../../models/SiageDisciplinaAlias.js';
import { NotaModel } from '../../models/Nota.js';
import { AlunoModel } from '../../models/Aluno.js';
import type { Types } from 'mongoose';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CreateRunInput {
  tenantId: string;
  year: number;
  bimester: number;
  turmaFilter?: string;
  createdBy: string;
}

interface IngestItemInput {
  alunoName: string;
  matriculaSiage: string;
  disciplinaName: string;
  turmaName: string;
  bimester: number;
  value: number | null;
}

interface IngestResult {
  total: number;
  matched: number;
  unmatched: number;
  pending: number;
}

const NON_TERMINAL_STATUSES = ['QUEUED', 'RUNNING', 'EXTRACTING', 'MATCHING', 'IMPORTING'];

// ─── Pilot Scope Policy ──────────────────────────────────────────────────────
//
// The SIAGE product supports bimesters 1–4. The pilot policy may restrict
// which bimesters are allowed for operations. This is an OPERATIONAL POLICY,
// not a product limitation.
//
// Config: env SIAGE_PILOT_BIMESTERS (comma-separated, e.g. '1' or '1,2,3,4')
// When empty: all bimesters are allowed (full capability).

export interface PilotPolicy {
  /** True if the pilot restricts bimesters (not all 1-4 are allowed) */
  isRestricted: boolean;
  /** Which bimesters are currently allowed by the policy */
  allowedBimesters: number[];
  /** Check if a specific bimester is allowed */
  isBimesterAllowed(bimester: number): boolean;
}

function parsePilotPolicy(): PilotPolicy {
  const raw = process.env.SIAGE_PILOT_BIMESTERS ?? '';
  const trimmed = raw.trim();

  // Unrestricted: empty or all bimesters
  if (trimmed === '' || trimmed === '1,2,3,4') {
    return {
      isRestricted: false,
      allowedBimesters: [1, 2, 3, 4],
      isBimesterAllowed: (b: number) => b >= 1 && b <= 4,
    };
  }

  const allowed = trimmed.split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => !isNaN(n) && n >= 1 && n <= 4);

  // Validation: if config is non-empty but parsing yields nothing, fallback safely
  if (allowed.length === 0) {
    console.warn(
      `[SIAGE] SIAGE_PILOT_BIMESTERS="${raw}" parsed to empty set. Falling back to all bimesters.`,
    );
    return {
      isRestricted: false,
      allowedBimesters: [1, 2, 3, 4],
      isBimesterAllowed: (b: number) => b >= 1 && b <= 4,
    };
  }

  return {
    isRestricted: allowed.length < 4,
    allowedBimesters: allowed,
    isBimesterAllowed: (b: number) => allowed.includes(b),
  };
}

/** Re-parsed on each call to allow test overrides of process.env */
export function getPilotPolicy(): PilotPolicy {
  return parsePilotPolicy();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

// ─── UNMATCHED Sub-Classification ────────────────────────────────────────────
//
// UNMATCHED reasons (operational taxonomy):
//   DOM_PLACEHOLDER  — scraping artifact ("-", empty, "Nenhum registro foi encontrado")
//   NAME_MISMATCH    — real student with similar but divergent name in local cadastro
//   NO_LOCAL_STUDENT — real student name not found at all in local cadastro
//
// This is NOT the same as notRegistered (which means the student was matched
// but their grade was null in SIAGE).

const DOM_PLACEHOLDER_PATTERNS = ['-', '', 'nenhum registro foi encontrado', 'nenhum registro encontrado'];

export function isDomPlaceholder(name: string): boolean {
  const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  return DOM_PLACEHOLDER_PATTERNS.includes(normalized);
}

/**
 * Detect NAME_MISMATCH: a student exists locally with the same first AND last name
 * but the full normalized name differs (typo, middle name variation, preposition).
 * This is a lightweight heuristic — not fuzzy matching — to separate reconciliable
 * divergences from truly absent students.
 */
async function classifyUnmatchedReason(tenantId: string, alunoName: string): Promise<string> {
  if (isDomPlaceholder(alunoName)) return 'DOM_PLACEHOLDER';

  const normalized = normalizeName(alunoName);
  const parts = normalized.split(' ');
  if (parts.length < 2) return 'NO_LOCAL_STUDENT';

  const firstName = parts[0];
  const lastName = parts[parts.length - 1];

  // Search for local students whose normalizedName starts with the same first name
  // and ends with the same last name (but full name differs — that's the mismatch)
  const candidate = await AlunoModel.findOne({
    tenantId,
    normalizedName: {
      $regex: `^${firstName}\\b.*\\b${lastName}$`,
      $ne: normalized,
    },
  }).select('_id name').lean();

  return candidate ? 'NAME_MISMATCH' : 'NO_LOCAL_STUDENT';
}

function normalizeTurmaFilter(filter?: string | null): string {
  return filter?.trim() || '__ALL__';
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class SiageService {

  // ── Run Management ──

  async createRun(input: CreateRunInput) {
    // Pilot scope policy enforcement (operational restriction, not product limitation)
    const policy = getPilotPolicy();
    if (!policy.isBimesterAllowed(input.bimester)) {
      throw new Error(
        `Operação bloqueada pela política do piloto: apenas os bimestres [${policy.allowedBimesters.join(', ')}] estão habilitados. ` +
        `Bimestre solicitado: ${input.bimester}º.`,
      );
    }

    const normalizedFilter = normalizeTurmaFilter(input.turmaFilter);

    // Deduplication: reject if a non-terminal run exists for the same scope
    const existing = await SiageRunModel.findOne({
      tenantId: input.tenantId,
      year: input.year,
      bimester: input.bimester,
      turmaFilter: normalizedFilter,
      status: { $in: NON_TERMINAL_STATUSES },
    });

    if (existing) {
      throw new Error(
        'Já existe uma sincronização em andamento para este escopo. ' +
        'Aguarde a conclusão ou cancele a anterior.',
      );
    }

    const run = await SiageRunModel.create({
      tenantId: input.tenantId,
      year: input.year,
      bimester: input.bimester,
      turmaFilter: normalizedFilter,
      createdBy: input.createdBy,
      status: 'QUEUED',
      stats: { total: 0, matched: 0, imported: 0, notRegistered: 0, errors: 0 },
    });

    return run;
  }

  async getRun(tenantId: string, runId: string) {
    return SiageRunModel.findOne({ _id: runId, tenantId });
  }

  async listRuns(tenantId: string) {
    return SiageRunModel.find({ tenantId }).sort({ createdAt: -1 }).lean();
  }

  async updateRunStatus(runId: string, status: string, errorMessage?: string) {
    const update: Record<string, unknown> = { status };
    if (status === 'RUNNING') update.startedAt = new Date();
    if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(status)) {
      update.completedAt = new Date();
    }
    if (errorMessage) update.errorMessage = errorMessage;

    return SiageRunModel.findByIdAndUpdate(runId, update, { new: true });
  }

  async cancelRun(tenantId: string, runId: string) {
    const run = await SiageRunModel.findOne({ _id: runId, tenantId });
    if (!run) throw new Error('Run não encontrada');
    if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(run.status)) {
      throw new Error('Run já finalizada, não pode ser cancelada');
    }
    return this.updateRunStatus(runId, 'CANCELLED');
  }

  // ── Ingest Items (from Worker via internal endpoint) ──

  async ingestItems(
    runId: string,
    tenantId: string,
    items: IngestItemInput[],
  ): Promise<IngestResult> {
    const results = { total: items.length, matched: 0, unmatched: 0, pending: 0 };

    for (const item of items) {
      const matchResult = await this.matchItem(tenantId, item);

      await SiageRunItemModel.create({
        runId,
        tenantId,
        source: item,
        matchResult,
      });

      if (matchResult.matchStatus === 'AUTO_MATCHED') results.matched++;
      else if (matchResult.matchStatus === 'MANUAL_PENDING') results.pending++;
      else results.unmatched++;
    }

    // Update run stats
    await SiageRunModel.findByIdAndUpdate(runId, {
      $inc: {
        'stats.total': results.total,
        'stats.matched': results.matched,
      },
    });

    return results;
  }

  // ── Matching Engine ──

  private async matchItem(
    tenantId: string,
    item: IngestItemInput,
  ): Promise<{
    alunoId: Types.ObjectId | null;
    disciplinaId: Types.ObjectId | null;
    turmaId: Types.ObjectId | null;
    matchStatus: string;
    reason?: string;
  }> {
    // 0. Detect DOM placeholder artifacts before any DB lookup
    if (isDomPlaceholder(item.alunoName)) {
      return {
        alunoId: null,
        disciplinaId: null,
        turmaId: null,
        matchStatus: 'UNMATCHED',
        reason: 'DOM_PLACEHOLDER',
      };
    }

    // 1. Match aluno by normalizedName
    const normalizedStudentName = normalizeName(item.alunoName);
    const aluno = await AlunoModel.findOne({
      tenantId,
      normalizedName: normalizedStudentName,
    }).select('_id turmaId').lean();

    if (!aluno) {
      return {
        alunoId: null,
        disciplinaId: null,
        turmaId: null,
        matchStatus: 'UNMATCHED',
        reason: await classifyUnmatchedReason(tenantId, item.alunoName),
      };
    }

    // 2. Match disciplina by alias table
    const normalizedDisciplinaName = normalizeName(item.disciplinaName);
    const alias = await SiageDisciplinaAliasModel.findOne({
      tenantId,
      siageNameNormalized: normalizedDisciplinaName,
    }).select('disciplinaId').lean();

    if (!alias) {
      return {
        alunoId: aluno._id as Types.ObjectId,
        disciplinaId: null,
        turmaId: aluno.turmaId as Types.ObjectId,
        matchStatus: 'MANUAL_PENDING',
      };
    }

    // 3. Resolve turma from aluno
    const turmaId = aluno.turmaId as Types.ObjectId;

    return {
      alunoId: aluno._id as Types.ObjectId,
      disciplinaId: alias.disciplinaId as Types.ObjectId,
      turmaId,
      matchStatus: 'AUTO_MATCHED',
    };
  }

  // ── Import Matched Items ──

  async importMatchedItems(runId: string, tenantId: string, promotedBy?: string): Promise<{
    imported: number;
    notRegistered: number;
    errors: number;
  }> {
    // Pilot scope policy enforcement (operational restriction, not product limitation)
    const run = await SiageRunModel.findOne({ _id: runId, tenantId }).lean();
    if (!run) throw new Error('Run não encontrada.');
    const policy = getPilotPolicy();
    if (!policy.isBimesterAllowed(run.bimester)) {
      throw new Error(
        `Operação bloqueada pela política do piloto: promoção para Nota permitida apenas para os bimestres [${policy.allowedBimesters.join(', ')}]. ` +
        `Este run é do ${run.bimester}º bimestre.`,
      );
    }

    const items = await SiageRunItemModel.find({
      runId,
      'matchResult.matchStatus': 'AUTO_MATCHED',
      'importResult.status': null,
    });

    let imported = 0;
    let notRegistered = 0;
    let errors = 0;

    for (const item of items) {
      try {
        if (!item.source) {
          item.importResult = { notaId: null, status: 'error', reason: 'Missing source data' };
          errors++;
          await item.save();
          continue;
        }
        if (item.source.value === null || item.source.value === undefined) {
          // No grade to import — record as not registered (NOT zero)
          item.importResult = { notaId: null, status: 'not_registered', reason: 'Nota não registrada no SIAGE' };
          notRegistered++;
        } else {
          // run already fetched at top of method (pilot scope check)
          const result = await NotaModel.updateOne(
            {
              tenantId,
              alunoId: item.matchResult?.alunoId,
              disciplinaId: item.matchResult?.disciplinaId,
              year: run.year,
              bimester: item.source.bimester,
            },
            {
              $set: {
                value: item.source.value,
                turmaId: item.matchResult?.turmaId,
                source: 'siage',
              },
            },
            { upsert: true },
          );

          const notaId = result.upsertedId ?? null;
          item.importResult = {
            notaId: notaId as Types.ObjectId | null,
            status: 'imported',
            reason: null,
          };
          imported++;
        }
      } catch (error) {
        item.importResult = {
          notaId: null,
          status: 'error',
          reason: error instanceof Error ? error.message : 'Unknown error',
        };
        errors++;
      }

      await item.save();
    }

    // Update run stats + audit trail
    const auditEntry = {
      promotedBy: promotedBy || 'system',
      promotedAt: new Date(),
      imported,
      notRegistered,
      errors,
    };
    await SiageRunModel.findByIdAndUpdate(runId, {
      $inc: {
        'stats.imported': imported,
        'stats.notRegistered': notRegistered,
        'stats.errors': errors,
      },
      $push: { promotionLog: auditEntry },
    });

    return { imported, notRegistered, errors };
  }

  // ── Promotion Preview ──

  async getPromotionPreview(runId: string, tenantId: string) {
    const run = await SiageRunModel.findOne({ _id: runId, tenantId }).lean();
    if (!run) throw new Error('Run não encontrada.');

    // Count importable items (AUTO_MATCHED, not yet imported)
    const items = await SiageRunItemModel.find({
      runId,
      'matchResult.matchStatus': 'AUTO_MATCHED',
      'importResult.status': null,
    }).lean();

    const withGrade = items.filter(i => i.source?.value != null);
    const withoutGrade = items.filter(i => i.source?.value == null);

    // Group by discipline
    const byDiscipline: Record<string, number> = {};
    for (const item of withGrade) {
      const disc = item.source?.disciplinaName || 'Desconhecida';
      byDiscipline[disc] = (byDiscipline[disc] || 0) + 1;
    }

    return {
      runId,
      bimester: run.bimester,
      year: run.year,
      turmaFilter: run.turmaFilter,
      totalImportable: withGrade.length,
      totalNotRegistered: withoutGrade.length,
      byDiscipline,
      pilotBimesterAllowed: getPilotPolicy().isBimesterAllowed(run.bimester),
      alreadyImported: await SiageRunItemModel.countDocuments({
        runId,
        'importResult.status': 'imported',
      }),
    };
  }

  // ── Item Queries ──

  async listItems(runId: string, tenantId: string, matchStatus?: string) {
    const filter: Record<string, unknown> = { runId, tenantId };
    if (matchStatus) filter['matchResult.matchStatus'] = matchStatus;
    return SiageRunItemModel.find(filter).lean();
  }

  // ── Alias Management ──

  async createAlias(tenantId: string, siageName: string, disciplinaId: string) {
    const siageNameNormalized = normalizeName(siageName);
    return SiageDisciplinaAliasModel.findOneAndUpdate(
      { tenantId, siageNameNormalized },
      { tenantId, siageName, siageNameNormalized, disciplinaId },
      { upsert: true, new: true },
    );
  }

  async listAliases(tenantId: string) {
    return SiageDisciplinaAliasModel.find({ tenantId })
      .populate('disciplinaId', 'name codigo')
      .lean();
  }

  /**
   * Auto-create aliases by EXACT name match only.
   * No fuzzy matching, no heuristics. Strict 1:1 mapping.
   */
  async autoCreateAliases(tenantId: string): Promise<{
    created: { siageName: string; disciplinaName: string; disciplinaId: string }[];
    skipped: { siageName: string; reason: string }[];
    alreadyExisted: string[];
  }> {
    // 1. Get all distinct SIAGE discipline names from items
    const siageNames: string[] = await SiageRunItemModel.distinct('source.disciplinaName', { tenantId });

    // 2. Get all local disciplines
    const { DisciplinaModel } = await import('../../models/Disciplina.js');
    const localDisciplinas = await DisciplinaModel.find({ tenantId }).select('_id name').lean();

    const created: { siageName: string; disciplinaName: string; disciplinaId: string }[] = [];
    const skipped: { siageName: string; reason: string }[] = [];
    const alreadyExisted: string[] = [];

    for (const siageName of siageNames) {
      if (!siageName) { skipped.push({ siageName: '(null)', reason: 'Nome vazio' }); continue; }

      const normalized = normalizeName(siageName);

      // Check if alias already exists
      const existing = await SiageDisciplinaAliasModel.findOne({ tenantId, siageNameNormalized: normalized });
      if (existing) { alreadyExisted.push(siageName); continue; }

      // EXACT match only: normalized SIAGE name must equal normalized local name
      const match = localDisciplinas.find(d => normalizeName(d.name) === normalized);
      if (!match) {
        skipped.push({ siageName, reason: 'Sem correspondência exata local' });
        continue;
      }

      await SiageDisciplinaAliasModel.create({
        tenantId,
        siageName,
        siageNameNormalized: normalized,
        disciplinaId: match._id,
      });

      created.push({
        siageName,
        disciplinaName: match.name,
        disciplinaId: String(match._id),
      });
    }

    return { created, skipped, alreadyExisted };
  }

  // ── Manual Resolution ──

  async resolveItem(
    tenantId: string,
    itemId: string,
    resolution: { alunoId?: string; disciplinaId?: string },
    resolvedBy: string,
  ) {
    const item = await SiageRunItemModel.findOne({ _id: itemId, tenantId });
    if (!item) throw new Error('Item não encontrado');
    if (!item.matchResult) throw new Error('Item sem resultado de matching');

    if (item.matchResult.matchStatus !== 'MANUAL_PENDING' &&
        item.matchResult.matchStatus !== 'UNMATCHED') {
      throw new Error('Item não está pendente de resolução');
    }

    // Determine audit action
    const hasAluno = !!resolution.alunoId;
    const hasDisciplina = !!resolution.disciplinaId;
    let action: 'link_aluno' | 'link_disciplina' | 'link_both' | 'mark_pending';
    if (hasAluno && hasDisciplina) action = 'link_both';
    else if (hasAluno) action = 'link_aluno';
    else if (hasDisciplina) action = 'link_disciplina';
    else action = 'mark_pending';

    // Record audit trail
    const previousStatus = item.matchResult.matchStatus;
    item.resolution = {
      resolvedBy: resolvedBy as unknown as Types.ObjectId,
      resolvedAt: new Date(),
      action,
      previousStatus,
    };

    if (resolution.alunoId) {
      item.matchResult.alunoId = resolution.alunoId as unknown as Types.ObjectId;
    }
    if (resolution.disciplinaId) {
      item.matchResult.disciplinaId = resolution.disciplinaId as unknown as Types.ObjectId;
    }

    // If both aluno and disciplina are now resolved, mark as RESOLVED
    if (item.matchResult.alunoId && item.matchResult.disciplinaId) {
      item.matchResult.matchStatus = 'RESOLVED';

      // Resolve turma from aluno
      const aluno = await AlunoModel.findById(item.matchResult.alunoId)
        .select('turmaId').lean();
      if (aluno) {
        item.matchResult.turmaId = aluno.turmaId as Types.ObjectId;
      }

      // Increment run stats.matched
      await SiageRunModel.findByIdAndUpdate(item.runId, {
        $inc: { 'stats.matched': 1 },
      });
    }

    await item.save();
    return item;
  }

  // ── Dismiss DOM Placeholders (batch) ──

  async dismissPlaceholders(runId: string, tenantId: string, dismissedBy: string): Promise<{
    dismissed: number;
  }> {
    const result = await SiageRunItemModel.updateMany(
      {
        runId,
        tenantId,
        'matchResult.matchStatus': 'UNMATCHED',
        'matchResult.reason': 'DOM_PLACEHOLDER',
      },
      {
        $set: {
          'matchResult.matchStatus': 'DISMISSED',
          'resolution.resolvedBy': dismissedBy,
          'resolution.resolvedAt': new Date(),
          'resolution.action': 'mark_pending',
          'resolution.previousStatus': 'UNMATCHED',
        },
      },
    );

    return { dismissed: result.modifiedCount };
  }

  // ── Dismiss single item (NO_LOCAL_STUDENT or any) ──

  async dismissItem(itemId: string, tenantId: string, dismissedBy: string): Promise<{ success: boolean }> {
    const item = await SiageRunItemModel.findOne({ _id: itemId, tenantId });
    if (!item) throw new Error('Item não encontrado');

    if (item.matchResult?.matchStatus !== 'UNMATCHED') {
      throw new Error('Apenas itens UNMATCHED podem ser descartados');
    }

    item.matchResult.matchStatus = 'DISMISSED';
    item.resolution = {
      resolvedBy: dismissedBy as unknown as Types.ObjectId,
      resolvedAt: new Date(),
      action: 'mark_pending',
      previousStatus: 'UNMATCHED',
    };

    await item.save();
    return { success: true };
  }

  // ── UNMATCHED Breakdown (operational metrics) ──

  async getUnmatchedBreakdown(runId: string, tenantId: string): Promise<{
    total: number;
    domPlaceholders: number;
    nameMismatch: number;
    noLocalStudent: number;
    noReason: number;
    dismissed: number;
    resolved: number;
  }> {
    const [total, domPlaceholders, nameMismatch, noLocalStudent, noReason, dismissed, resolved] = await Promise.all([
      SiageRunItemModel.countDocuments({ runId, tenantId, 'matchResult.matchStatus': 'UNMATCHED' }),
      SiageRunItemModel.countDocuments({ runId, tenantId, 'matchResult.matchStatus': 'UNMATCHED', 'matchResult.reason': 'DOM_PLACEHOLDER' }),
      SiageRunItemModel.countDocuments({ runId, tenantId, 'matchResult.matchStatus': 'UNMATCHED', 'matchResult.reason': 'NAME_MISMATCH' }),
      SiageRunItemModel.countDocuments({ runId, tenantId, 'matchResult.matchStatus': 'UNMATCHED', 'matchResult.reason': 'NO_LOCAL_STUDENT' }),
      SiageRunItemModel.countDocuments({ runId, tenantId, 'matchResult.matchStatus': 'UNMATCHED', 'matchResult.reason': { $in: [null, 'NO_REASON'] } }),
      SiageRunItemModel.countDocuments({ runId, tenantId, 'matchResult.matchStatus': 'DISMISSED' }),
      SiageRunItemModel.countDocuments({ runId, tenantId, 'matchResult.matchStatus': 'RESOLVED' }),
    ]);

    return { total, domPlaceholders, nameMismatch, noLocalStudent, noReason, dismissed, resolved };
  }
}

export const siageService = new SiageService();
