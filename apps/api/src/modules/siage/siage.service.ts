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

  async importMatchedItems(runId: string, tenantId: string): Promise<{
    imported: number;
    notRegistered: number;
    errors: number;
  }> {
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
          // Find the run to get year info
          const run = await SiageRunModel.findById(runId).select('year').lean();
          if (!run) throw new Error('Run not found');

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

    // Update run stats
    await SiageRunModel.findByIdAndUpdate(runId, {
      $inc: {
        'stats.imported': imported,
        'stats.notRegistered': notRegistered,
        'stats.errors': errors,
      },
    });

    return { imported, notRegistered, errors };
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

  // ── Manual Resolution ──

  async resolveItem(
    tenantId: string,
    itemId: string,
    resolution: { alunoId?: string; disciplinaId?: string },
  ) {
    const item = await SiageRunItemModel.findOne({ _id: itemId, tenantId });
    if (!item) throw new Error('Item não encontrado');
    if (!item.matchResult) throw new Error('Item sem resultado de matching');

    if (item.matchResult.matchStatus !== 'MANUAL_PENDING' &&
        item.matchResult.matchStatus !== 'UNMATCHED') {
      throw new Error('Item não está pendente de resolução');
    }

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
    }

    await item.save();
    return item;
  }
}

export const siageService = new SiageService();
