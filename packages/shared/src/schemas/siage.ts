/**
 * @module siage
 * Zod schemas, enums and types for the SIAGE Interoperability feature.
 * This is the single source of truth for data contracts between
 * apps/api, apps/worker-siage, packages/siage-bridge, and apps/web.
 */
import { z } from 'zod';
import {
  objectIdSchema,
  tenantIdSchema,
  academicYearSchema,
  bimesterSchema,
  gradeValueSchema,
  timestampFieldsSchema,
} from './primitives.js';

// ─── Run Status (State Machine) ──────────────────────────────────────────────

export const SIAGE_RUN_STATUS = {
  QUEUED: 'QUEUED',
  RUNNING: 'RUNNING',
  EXTRACTING: 'EXTRACTING',
  MATCHING: 'MATCHING',
  IMPORTING: 'IMPORTING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;

export type SiageRunStatus = (typeof SIAGE_RUN_STATUS)[keyof typeof SIAGE_RUN_STATUS];

export const siageRunStatusSchema = z.nativeEnum(SIAGE_RUN_STATUS);

/** Terminal statuses — a run in these states cannot transition further. */
export const SIAGE_TERMINAL_STATUSES: readonly SiageRunStatus[] = [
  SIAGE_RUN_STATUS.COMPLETED,
  SIAGE_RUN_STATUS.FAILED,
  SIAGE_RUN_STATUS.CANCELLED,
] as const;

// ─── Match Status ────────────────────────────────────────────────────────────

export const SIAGE_MATCH_STATUS = {
  AUTO_MATCHED: 'AUTO_MATCHED',
  MANUAL_PENDING: 'MANUAL_PENDING',
  UNMATCHED: 'UNMATCHED',
  SKIPPED: 'SKIPPED',
} as const;

export type SiageMatchStatus = (typeof SIAGE_MATCH_STATUS)[keyof typeof SIAGE_MATCH_STATUS];

export const siageMatchStatusSchema = z.nativeEnum(SIAGE_MATCH_STATUS);

// ─── Import Status ───────────────────────────────────────────────────────────

export const SIAGE_IMPORT_STATUS = {
  IMPORTED: 'imported',
  SKIPPED: 'skipped',
  ERROR: 'error',
} as const;

export type SiageImportStatus = (typeof SIAGE_IMPORT_STATUS)[keyof typeof SIAGE_IMPORT_STATUS];

export const siageImportStatusSchema = z.nativeEnum(SIAGE_IMPORT_STATUS);

// ─── Source Record (normalized data from SIAGE) ──────────────────────────────

export const siageSourceRecordSchema = z.object({
  alunoName: z.string().min(1).describe('Student name as extracted from SIAGE'),
  matricula: z.string().min(1).describe('Student enrollment number from SIAGE'),
  disciplinaName: z.string().min(1).describe('Subject name as displayed in SIAGE'),
  turmaName: z.string().min(1).describe('Class name as displayed in SIAGE'),
  bimester: bimesterSchema,
  value: gradeValueSchema,
});

export type SiageSourceRecord = z.infer<typeof siageSourceRecordSchema>;

// ─── Run Stats ───────────────────────────────────────────────────────────────

export const siageRunStatsSchema = z.object({
  total: z.number().int().min(0).describe('Total items extracted'),
  matched: z.number().int().min(0).describe('Items auto-matched'),
  imported: z.number().int().min(0).describe('Items successfully imported'),
  skipped: z.number().int().min(0).describe('Items skipped (already up-to-date)'),
  errors: z.number().int().min(0).describe('Items that failed import'),
});

export type SiageRunStats = z.infer<typeof siageRunStatsSchema>;

// ─── SiageRun ────────────────────────────────────────────────────────────────

export const siageRunSchema = z.object({
  id: objectIdSchema,
  tenantId: tenantIdSchema,
  status: siageRunStatusSchema,
  startedAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
  turmaFilter: z.string().optional().describe('Optional turma filter; null/empty = all turmas'),
  year: academicYearSchema,
  bimester: bimesterSchema,
  stats: siageRunStatsSchema,
  createdBy: objectIdSchema.describe('User who initiated the sync'),
  errorMessage: z.string().optional(),
  ...timestampFieldsSchema.shape,
});

export type SiageRun = z.infer<typeof siageRunSchema>;

// ─── Create SiageRun Payload ─────────────────────────────────────────────────

export const createSiageRunSchema = z.object({
  turmaFilter: z.string().optional(),
  year: academicYearSchema,
  bimester: bimesterSchema,
  credentials: z.object({
    user: z.string().min(1),
    password: z.string().min(1),
  }).describe('Ephemeral SIAGE credentials — never persisted'),
});

export type CreateSiageRunPayload = z.infer<typeof createSiageRunSchema>;

// ─── SiageRunItem ────────────────────────────────────────────────────────────

export const siageRunItemSchema = z.object({
  id: objectIdSchema,
  runId: objectIdSchema,
  tenantId: tenantIdSchema,
  source: siageSourceRecordSchema,
  matchResult: z.object({
    alunoId: objectIdSchema.optional(),
    disciplinaId: objectIdSchema.optional(),
    turmaId: objectIdSchema.optional(),
    matchStatus: siageMatchStatusSchema,
  }),
  importResult: z.object({
    notaId: objectIdSchema.optional(),
    status: siageImportStatusSchema,
    reason: z.string().optional(),
  }).optional(),
  ...timestampFieldsSchema.shape,
});

export type SiageRunItem = z.infer<typeof siageRunItemSchema>;
