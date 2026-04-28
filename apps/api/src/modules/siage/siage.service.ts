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

/**
 * Pilot scope constraint: only bimester 1 is allowed for all SIAGE operations.
 * This guard is enforced at the service layer (defense-in-depth).
 * To expand scope, update this constant and the route schema.
 */
const PILOT_ALLOWED_BIMESTER = 1;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeTurmaFilter(filter?: string | null): string {
  return filter?.trim() || '__ALL__';
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class SiageService {

  // ── Run Management ──

  async createRun(input: CreateRunInput) {
    // Pilot scope enforcement
    if (input.bimester !== PILOT_ALLOWED_BIMESTER) {
      throw new Error(
        `Operação bloqueada: o piloto atual permite apenas o ${PILOT_ALLOWED_BIMESTER}º bimestre. ` +
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
  }> {
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
    // Pilot scope enforcement: verify run bimester before import
    const run = await SiageRunModel.findOne({ _id: runId, tenantId }).lean();
    if (!run) throw new Error('Run não encontrada.');
    if (run.bimester !== PILOT_ALLOWED_BIMESTER) {
      throw new Error(
        `Operação bloqueada: promoção para Nota permitida apenas para o ${PILOT_ALLOWED_BIMESTER}º bimestre. ` +
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
      pilotBimesterAllowed: run.bimester === PILOT_ALLOWED_BIMESTER,
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

    // If both aluno and disciplina are now resolved, auto-match
    if (item.matchResult.alunoId && item.matchResult.disciplinaId) {
      item.matchResult.matchStatus = 'AUTO_MATCHED';

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
}

export const siageService = new SiageService();
