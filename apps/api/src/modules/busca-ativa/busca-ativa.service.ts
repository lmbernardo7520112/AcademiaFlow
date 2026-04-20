import { createHash } from 'crypto';
import { promises as fsp } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { AbsenceImportModel } from '../../models/AbsenceImport.js';
import { CasoBuscaAtivaModel } from '../../models/CasoBuscaAtiva.js';
import { AlunoModel } from '../../models/Aluno.js';
import { TurmaModel } from '../../models/Turma.js';
import {
  parseAbsenceList,
  normalizeStudentName,
  computePreviewHash,
} from '@academiaflow/shared';
import {
  MANUAL_TIMELINE_ACTIONS,
  CASE_STATUS,
  validateTransition,
} from '@academiaflow/shared';
import type { ParseResult, PhoneResult, CaseStatus, AddTimelineEntryPayload } from '@academiaflow/shared';

// ─── Import ──────────────────────────────────────────────────────────────────

interface ImportResult {
  importId: string;
  casesCreated: number;
  warnings: ParseResult['warnings'];
  stats: ParseResult['stats'];
  hashMatch: boolean | null;
}

export async function importAbsenceList(
  tenantId: string,
  userId: string,
  rawText: string,
  previewHash?: string,
): Promise<{ status: number; data: ImportResult | Record<string, unknown> }> {
  // Guard: check backfill
  const missingBackfill = await AlunoModel.countDocuments({
    tenantId,
    normalizedName: null,
    isActive: true,
  });
  if (missingBackfill > 0) {
    return {
      status: 503,
      data: {
        message: `Backfill pendente: ${missingBackfill} alunos sem normalizedName. Execute backfill-names.`,
      },
    };
  }

  // Parse server-side (authoritative)
  const parseResult = parseAbsenceList(rawText);

  // Hash comparison
  let hashMatch: boolean | null = null;
  if (previewHash) {
    const serverHash = await computePreviewHash(parseResult.entries);
    hashMatch = previewHash === serverHash;
  }

  if (!parseResult.date) {
    return {
      status: 400,
      data: { message: 'Data não encontrada na listagem.' },
    };
  }

  // Check existing import (409)
  const existing = await AbsenceImportModel.findOne({
    tenantId,
    date: parseResult.date,
  });

  if (existing) {
    return {
      status: 409,
      data: {
        existingImport: {
          id: existing._id,
          version: existing.version,
          date: existing.date,
          stats: existing.stats,
          casesCreated: existing.casesCreated,
        },
        message: 'Importação já existe para esta data.',
      },
    };
  }

  // Create import
  const absenceImport = await AbsenceImportModel.create({
    tenantId,
    date: parseResult.date,
    rawText,
    previewHash: previewHash || null,
    serverHash: previewHash ? await computePreviewHash(parseResult.entries) : null,
    hashMatch,
    stats: parseResult.stats,
    warnings: parseResult.warnings,
    importedBy: userId,
    casesCreated: parseResult.entries.length,
  });

  // Create cases
  let casesCreated = 0;
  for (const entry of parseResult.entries) {
    const normalizedName = normalizeStudentName(entry.alunoName);

    // Deterministic matching
    const matchResult = await matchAluno(tenantId, normalizedName, entry.turmaName);

    // Build contacts with hasValidPhone
    const contacts = entry.contacts.map(c => ({
      role: c.role,
      name: c.name,
      phones: c.phones,
      hasValidPhone: c.phones.some((p: PhoneResult) => p.phoneE164 !== null),
      correctedPhone: null,
    }));

    await CasoBuscaAtivaModel.create({
      tenantId,
      importId: absenceImport._id,
      date: parseResult.date,
      alunoName: entry.alunoName,
      normalizedAlunoName: normalizedName,
      alunoId: matchResult.alunoId,
      turmaName: entry.turmaName,
      turmaId: matchResult.turmaId,
      contacts,
      flags: {
        justified_in_source: entry.flags.justified_in_source,
        possible_transfer: entry.flags.possible_transfer,
        unmatched_aluno: matchResult.status === 'unmatched',
        ambiguous_aluno: matchResult.status === 'ambiguous',
      },
      matchCandidates: matchResult.candidates || [],
      observations: entry.observations,
      status: CASE_STATUS.NOVO,
      timeline: [{
        action: 'CASE_CREATED',
        createdBy: userId,
        createdAt: new Date(),
      }],
      attachments: [],
    });
    casesCreated++;
  }

  return {
    status: 201,
    data: {
      importId: absenceImport._id.toString(),
      casesCreated,
      warnings: parseResult.warnings,
      stats: parseResult.stats,
      hashMatch,
    },
  };
}

// ─── Replace ─────────────────────────────────────────────────────────────────

export async function replaceImport(
  tenantId: string,
  userId: string,
  importId: string,
  rawText: string,
): Promise<{ status: number; data: Record<string, unknown> }> {
  const existing = await AbsenceImportModel.findOne({ _id: importId, tenantId });
  if (!existing) {
    return { status: 404, data: { message: 'Importação não encontrada.' } };
  }

  // Find all cases for this import
  const cases = await CasoBuscaAtivaModel.find({ importId: existing._id, tenantId });

  // Check hasManualWork
  const casesWithWork = cases.filter(c => {
    const hasManualTimeline = c.timeline.some(
      (e: { action: string }) => (MANUAL_TIMELINE_ACTIONS as readonly string[]).includes(e.action)
    );
    return hasManualTimeline || c.attachments.length > 0;
  });

  if (casesWithWork.length > 0) {
    return {
      status: 422,
      data: {
        blockedReason: 'MANUAL_WORK_EXISTS',
        casesWithWork: casesWithWork.map(c => ({
          caseId: c._id,
          alunoName: c.alunoName,
          status: c.status,
          manualActions: c.timeline
            .filter((e: { action: string }) => (MANUAL_TIMELINE_ACTIONS as readonly string[]).includes(e.action))
            .map((e: { action: string }) => e.action),
          attachmentCount: c.attachments.length,
        })),
        message: `Importação não pode ser substituída: ${casesWithWork.length} caso(s) já possuem registro operacional.`,
      },
    };
  }

  // Soft-archive existing cases
  for (const c of cases) {
    c.status = CASE_STATUS.SUPERSEDED;
    c.timeline.push({
      action: 'IMPORT_SUPERSEDED',
      replacedByImportVersion: (existing.version || 1) + 1,
      createdBy: userId,
      createdAt: new Date(),
    });
    await c.save();
  }

  // Update import
  existing.previousRawText = existing.rawText;
  existing.rawText = rawText;
  existing.version = (existing.version || 1) + 1;
  existing.replacedAt = new Date();
  existing.replacedBy = userId as unknown as typeof existing.replacedBy;

  // Re-parse and create new cases
  const parseResult = parseAbsenceList(rawText);
  existing.stats = parseResult.stats;
  existing.warnings = parseResult.warnings as typeof existing.warnings;
  existing.casesCreated = parseResult.entries.length;
  await existing.save();

  let casesCreated = 0;
  for (const entry of parseResult.entries) {
    const normalizedName = normalizeStudentName(entry.alunoName);
    const matchResult = await matchAluno(tenantId, normalizedName, entry.turmaName);

    const contacts = entry.contacts.map(c => ({
      role: c.role,
      name: c.name,
      phones: c.phones,
      hasValidPhone: c.phones.some((p: PhoneResult) => p.phoneE164 !== null),
      correctedPhone: null,
    }));

    await CasoBuscaAtivaModel.create({
      tenantId,
      importId: existing._id,
      date: existing.date,
      alunoName: entry.alunoName,
      normalizedAlunoName: normalizedName,
      alunoId: matchResult.alunoId,
      turmaName: entry.turmaName,
      turmaId: matchResult.turmaId,
      contacts,
      flags: {
        justified_in_source: entry.flags.justified_in_source,
        possible_transfer: entry.flags.possible_transfer,
        unmatched_aluno: matchResult.status === 'unmatched',
        ambiguous_aluno: matchResult.status === 'ambiguous',
      },
      matchCandidates: matchResult.candidates || [],
      observations: entry.observations,
      status: CASE_STATUS.NOVO,
      timeline: [{
        action: 'CASE_CREATED',
        createdBy: userId,
        createdAt: new Date(),
      }],
      attachments: [],
    });
    casesCreated++;
  }

  return {
    status: 200,
    data: {
      casesArchived: cases.length,
      casesCreated,
      importVersion: existing.version,
    },
  };
}

// ─── List Imports ────────────────────────────────────────────────────────────

export async function listImports(tenantId: string, dateFrom?: string, dateTo?: string) {
  const query: Record<string, unknown> = { tenantId };
  if (dateFrom || dateTo) {
    query.date = {};
    if (dateFrom) (query.date as Record<string, unknown>).$gte = new Date(dateFrom);
    if (dateTo) (query.date as Record<string, unknown>).$lte = new Date(dateTo);
  }
  return AbsenceImportModel.find(query).sort({ date: -1 }).lean();
}

// ─── List Cases ──────────────────────────────────────────────────────────────

export async function listCases(
  tenantId: string,
  filters: { date?: string; status?: string; turmaName?: string },
) {
  const query: Record<string, unknown> = {
    tenantId,
    status: { $ne: CASE_STATUS.SUPERSEDED }, // Exclude SUPERSEDED from operational queue
  };
  if (filters.date) query.date = new Date(filters.date);
  if (filters.status) query.status = filters.status;
  if (filters.turmaName) query.turmaName = { $regex: filters.turmaName, $options: 'i' };

  return CasoBuscaAtivaModel.find(query).sort({ date: -1 }).lean();
}

// ─── Get Case Detail ─────────────────────────────────────────────────────────

export async function getCaseById(tenantId: string, caseId: string) {
  return CasoBuscaAtivaModel.findOne({ _id: caseId, tenantId }).lean();
}

// ─── Update Status ───────────────────────────────────────────────────────────

export async function updateCaseStatus(
  tenantId: string,
  userId: string,
  caseId: string,
  newStatus: string,
) {
  const caso = await CasoBuscaAtivaModel.findOne({ _id: caseId, tenantId });
  if (!caso) return null;

  // ── State machine guard ──
  const previousStatus = caso.status as CaseStatus;
  const result = validateTransition(previousStatus, newStatus as CaseStatus);
  if (!result.valid) {
    throw new Error(result.reason);
  }

  caso.status = newStatus as typeof caso.status;
  caso.timeline.push({
    action: 'STATUS_CHANGED',
    previousStatus,
    newStatus,
    createdBy: userId,
    createdAt: new Date(),
  });
  await caso.save();
  return caso;
}

// ─── Correct Contact ─────────────────────────────────────────────────────────

export async function correctContact(
  tenantId: string,
  userId: string,
  caseId: string,
  contactId: string,
  correctedPhone: PhoneResult,
) {
  const caso = await CasoBuscaAtivaModel.findOne({ _id: caseId, tenantId });
  if (!caso) return { status: 404, data: { message: 'Caso não encontrado.' } };

  const contact = caso.contacts.id(contactId);
  if (!contact) return { status: 404, data: { message: 'Contato não encontrado.' } };

  const oldValue = contact.correctedPhone?.phoneDigitsOnly || contact.phones[0]?.phoneDigitsOnly || '';

  contact.correctedPhone = correctedPhone;
  contact.hasValidPhone = correctedPhone.phoneE164 !== null;

  caso.timeline.push({
    action: 'CONTACT_CORRECTED',
    contactId,
    field: 'phone',
    oldValue,
    newValue: correctedPhone.phoneE164 || correctedPhone.phoneDigitsOnly,
    createdBy: userId,
    createdAt: new Date(),
  });

  await caso.save();
  return { status: 200, data: caso };
}

// ─── Add Timeline Entry ──────────────────────────────────────────────────────

export async function addTimelineEntry(
  tenantId: string,
  userId: string,
  caseId: string,
  entry: AddTimelineEntryPayload,
) {
  const caso = await CasoBuscaAtivaModel.findOne({ _id: caseId, tenantId });
  if (!caso) return null;

  caso.timeline.push({
    ...entry,
    createdBy: userId,
    createdAt: new Date(),
  });

  // Auto-transition: first CONTACT_ATTEMPT_CONFIRMED → CONTATO_INICIADO
  if (
    entry.action === 'CONTACT_ATTEMPT_CONFIRMED' &&
    entry.outcome !== 'cancelled' &&
    caso.status === CASE_STATUS.NOVO
  ) {
    caso.status = CASE_STATUS.CONTATO_INICIADO;
    caso.timeline.push({
      action: 'STATUS_CHANGED',
      previousStatus: CASE_STATUS.NOVO,
      newStatus: CASE_STATUS.CONTATO_INICIADO,
      createdBy: userId,
      createdAt: new Date(),
    });
  }

  await caso.save();
  return caso;
}

// ─── Dossiê ──────────────────────────────────────────────────────────────────

export async function getDossie(tenantId: string, alunoId: string) {
  return CasoBuscaAtivaModel.find({
    tenantId,
    alunoId,
  }).sort({ date: -1 }).lean();
}

// ─── Matching Helper ─────────────────────────────────────────────────────────

interface MatchResult {
  status: 'matched' | 'unmatched' | 'ambiguous';
  alunoId: string | null;
  turmaId: string | null;
  candidates: string[];
}

async function matchAluno(
  tenantId: string,
  normalizedName: string,
  turmaName: string,
): Promise<MatchResult> {
  // Step 1: Find turma
  let turmaId: string | null = null;
  const turmaMatch = turmaName.match(/^(\d+)[ªº]?\s*S[EÉ]RIE\s+([A-Z])/i);
  if (turmaMatch) {
    const turma = await TurmaModel.findOne({
      tenantId,
      name: { $regex: turmaName, $options: 'i' },
    });
    if (turma) turmaId = turma._id.toString();
  }

  // Step 2: Find aluno by normalizedName + turmaId + isActive
  const query: Record<string, unknown> = {
    tenantId,
    normalizedName,
    isActive: true,
  };
  if (turmaId) query.turmaId = turmaId;

  const candidates = await AlunoModel.find(query).select('_id name').lean();

  if (candidates.length === 1) {
    return {
      status: 'matched',
      alunoId: candidates[0]!._id.toString(),
      turmaId,
      candidates: [],
    };
  }
  if (candidates.length > 1) {
    return {
      status: 'ambiguous',
      alunoId: null,
      turmaId,
      candidates: candidates.map(c => c._id.toString()),
    };
  }

  // Step 3: Try without turma restriction
  if (turmaId) {
    const broadCandidates = await AlunoModel.find({
      tenantId,
      normalizedName,
      isActive: true,
    }).select('_id name').lean();

    if (broadCandidates.length === 1) {
      return {
        status: 'matched',
        alunoId: broadCandidates[0]!._id.toString(),
        turmaId,
        candidates: [],
      };
    }
    if (broadCandidates.length > 1) {
      return {
        status: 'ambiguous',
        alunoId: null,
        turmaId,
        candidates: broadCandidates.map(c => c._id.toString()),
      };
    }
  }

  return {
    status: 'unmatched',
    alunoId: null,
    turmaId,
    candidates: [],
  };
}

export const buscaAtivaService = {
  importAbsenceList,
  replaceImport,
  listImports,
  listCases,
  getCaseById,
  updateCaseStatus,
  correctContact,
  addTimelineEntry,
  getDossie,
  uploadAttachment,
  downloadAttachment,
};

// ─── Attachment Helpers ───────────────────────────────────────────────────────

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

function sanitizeFilename(name: string): string {
  // Keep only alphanumeric, dots, underscores and hyphens; collapse sequences
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
}

export async function uploadAttachment(
  tenantId: string,
  userId: string,
  caseId: string,
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string,
  description?: string,
): Promise<{ status: number; data: Record<string, unknown> }> {
  if (!ALLOWED_MIME.has(mimeType)) {
    return {
      status: 422,
      data: {
        message: `Tipo de arquivo não permitido: ${mimeType}. Aceitos: PDF, JPEG, PNG, WEBP.`,
      },
    };
  }

  const kaso = await CasoBuscaAtivaModel.findOne({ _id: caseId, tenantId });
  if (!kaso) return { status: 404, data: { message: 'Caso não encontrado.' } };

  const sha256 = createHash('sha256').update(fileBuffer).digest('hex');
  const safeName = sanitizeFilename(originalName);
  const filename = `${randomUUID()}-${safeName}`;
  const dir = path.join(process.cwd(), 'uploads', 'busca-ativa', caseId);
  const storagePath = path.join(dir, filename);

  await fsp.mkdir(dir, { recursive: true });
  await fsp.writeFile(storagePath, fileBuffer);

  kaso.attachments.push({
    filename,
    originalName: safeName,
    mimeType,
    size: fileBuffer.length,
    sha256,
    storagePath,
    description: description ?? null,
    uploadedBy: userId,
  } as never);

  kaso.timeline.push({
    action: 'ATTACHMENT_UPLOADED',
    attachmentId: (kaso.attachments[kaso.attachments.length - 1] as { _id: unknown })._id,
    notes: description ?? null,
    createdBy: userId,
  } as never);

  await kaso.save();

  const att = kaso.attachments[kaso.attachments.length - 1] as {
    _id: unknown; filename: string; originalName: string; mimeType: string;
    size: number; sha256: string; uploadedAt?: Date; description?: string | null;
  };

  return {
    status: 201,
    data: {
      attachmentId: att._id,
      filename: att.filename,
      originalName: att.originalName,
      mimeType: att.mimeType,
      size: att.size,
      sha256: att.sha256,
      uploadedAt: att.uploadedAt,
    },
  };
}

// ─── Uploads Root (canonical, resolved once) ─────────────────────────────────
const UPLOADS_ROOT = path.resolve(process.cwd(), 'uploads');

export async function downloadAttachment(
  tenantId: string,
  caseId: string,
  attachId: string,
): Promise<{ status: number; data: Record<string, unknown> | Buffer; meta?: { mimeType: string; originalName: string } }> {
  const kaso = await CasoBuscaAtivaModel.findOne({ _id: caseId, tenantId });
  if (!kaso) return { status: 404, data: { message: 'Caso não encontrado.' } };

  const att = (kaso.attachments as Array<{
    _id: { toString(): string };
    storagePath: string;
    mimeType: string;
    originalName: string;
  }>).find(a => a._id.toString() === attachId);

  if (!att) return { status: 404, data: { message: 'Anexo não encontrado.' } };

  // ── Path traversal guard ──
  const resolvedPath = path.resolve(att.storagePath);
  if (!resolvedPath.startsWith(UPLOADS_ROOT + path.sep)) {
    return { status: 403, data: { message: 'Acesso negado ao arquivo solicitado.' } };
  }

  try {
    const buffer = await fsp.readFile(resolvedPath);
    return {
      status: 200,
      data: buffer,
      meta: { mimeType: att.mimeType, originalName: att.originalName },
    };
  } catch {
    return { status: 404, data: { message: 'Arquivo físico não encontrado no servidor.' } };
  }
}

