/**
 * @module busca-ativa
 * Zod schemas, enums and types for the "Busca Ativa de Alunos Faltosos" feature.
 * This is the single source of truth for the feature's data contracts (SDD).
 */
import { z } from 'zod';

// ─── Status Enum (Case Lifecycle) ────────────────────────────────────────────

export const CASE_STATUS = {
  NOVO: 'NOVO',
  PENDENTE: 'PENDENTE',
  CONTATO_INICIADO: 'CONTATO_INICIADO',
  AGUARDANDO_RESPOSTA: 'AGUARDANDO_RESPOSTA',
  RESPONDIDO: 'RESPONDIDO',
  JUSTIFICADO: 'JUSTIFICADO',
  SEM_RETORNO: 'SEM_RETORNO',
  REVISAO_ADMINISTRATIVA: 'REVISAO_ADMINISTRATIVA',
  TELEFONE_INVALIDO: 'TELEFONE_INVALIDO',
  ENCERRADO: 'ENCERRADO',
  SUPERSEDED: 'SUPERSEDED',
} as const;

export type CaseStatus = (typeof CASE_STATUS)[keyof typeof CASE_STATUS];

export const caseStatusSchema = z.nativeEnum(CASE_STATUS);

// ─── Timeline Action Enum ────────────────────────────────────────────────────

export const TIMELINE_ACTION = {
  CASE_CREATED: 'CASE_CREATED',
  STATUS_CHANGED: 'STATUS_CHANGED',
  CONTACT_CORRECTED: 'CONTACT_CORRECTED',
  MESSAGE_PREPARED: 'MESSAGE_PREPARED',
  WHATSAPP_OPENED: 'WHATSAPP_OPENED',
  CONTACT_ATTEMPT_CONFIRMED: 'CONTACT_ATTEMPT_CONFIRMED',
  RESPONSE_RECEIVED: 'RESPONSE_RECEIVED',
  ATTACHMENT_UPLOADED: 'ATTACHMENT_UPLOADED',
  CASE_RESOLVED: 'CASE_RESOLVED',
  IMPORT_SUPERSEDED: 'IMPORT_SUPERSEDED',
} as const;

export type TimelineAction = (typeof TIMELINE_ACTION)[keyof typeof TIMELINE_ACTION];

export const timelineActionSchema = z.nativeEnum(TIMELINE_ACTION);

/**
 * Manual timeline actions — only these count as real human operational work.
 * Used by the `hasManualWork()` predicate to determine if a case import
 * can be replaced or must be blocked.
 *
 * Automatic/telemetry actions (CASE_CREATED, STATUS_CHANGED, MESSAGE_PREPARED,
 * WHATSAPP_OPENED, IMPORT_SUPERSEDED) are explicitly excluded.
 */
export const MANUAL_TIMELINE_ACTIONS: readonly TimelineAction[] = [
  TIMELINE_ACTION.CONTACT_ATTEMPT_CONFIRMED,
  TIMELINE_ACTION.RESPONSE_RECEIVED,
  TIMELINE_ACTION.ATTACHMENT_UPLOADED,
  TIMELINE_ACTION.CONTACT_CORRECTED,
  TIMELINE_ACTION.CASE_RESOLVED,
] as const;

// ─── Channel Enum ────────────────────────────────────────────────────────────

export const CONTACT_CHANNEL = {
  WHATSAPP_MANUAL: 'whatsapp_manual',
  WHATSAPP_API: 'whatsapp_api',
  PHONE: 'phone',
  IN_PERSON: 'in_person',
  SMS: 'sms',
} as const;

export type ContactChannel = (typeof CONTACT_CHANNEL)[keyof typeof CONTACT_CHANNEL];

export const contactChannelSchema = z.nativeEnum(CONTACT_CHANNEL);

// ─── Contact Outcome Enum ────────────────────────────────────────────────────

export const CONTACT_OUTCOME = {
  SENT: 'sent',
  FAILED: 'failed',
  NO_ANSWER: 'no_answer',
  BUSY: 'busy',
  ANSWERED: 'answered',
  CANCELLED: 'cancelled',
} as const;

export type ContactOutcome = (typeof CONTACT_OUTCOME)[keyof typeof CONTACT_OUTCOME];

export const contactOutcomeSchema = z.nativeEnum(CONTACT_OUTCOME);

// ─── Resolution Type Enum ────────────────────────────────────────────────────

export const RESOLUTION_TYPE = {
  JUSTIFIED: 'justified',
  MEDICAL: 'medical',
  FAMILY_ISSUE: 'family_issue',
  TRANSPORTATION: 'transportation',
  OTHER: 'other',
  UNJUSTIFIED: 'unjustified',
} as const;

export type ResolutionType = (typeof RESOLUTION_TYPE)[keyof typeof RESOLUTION_TYPE];

export const resolutionTypeSchema = z.nativeEnum(RESOLUTION_TYPE);

// ─── Phone Issue Enum ────────────────────────────────────────────────────────

export const PHONE_ISSUE = {
  MISSING_AREA_CODE: 'missing_area_code',
  INCOMPLETE_PHONE: 'incomplete_phone',
} as const;

export type PhoneIssue = (typeof PHONE_ISSUE)[keyof typeof PHONE_ISSUE];

export const phoneIssueSchema = z.nativeEnum(PHONE_ISSUE);

// ─── Phone Result Schema ─────────────────────────────────────────────────────

export const phoneResultSchema = z.object({
  phoneRaw: z.string().describe('Original text: "47 99955-1961", "9 8616-4092"'),
  phoneDigitsOnly: z.string().describe('Digits only: "47999551961", "986164092"'),
  phoneE164: z.string().nullable().describe('E.164 or null: "5547999551961", null'),
  phoneIssue: phoneIssueSchema.nullable().describe('null if valid, issue type otherwise'),
});

export type PhoneResult = z.infer<typeof phoneResultSchema>;

// ─── Contact Schema (Case Subdocument) ───────────────────────────────────────

export const caseContactSchema = z.object({
  _id: z.string().optional(),
  role: z.string().describe('Mãe, Pai, Resp., Avó, Tia, Sogra, etc.'),
  name: z.string(),
  phones: z.array(phoneResultSchema),
  hasValidPhone: z.boolean(),
  correctedPhone: phoneResultSchema.nullable().optional()
    .describe('Filled via manual correction PATCH'),
});

export type CaseContact = z.infer<typeof caseContactSchema>;

// ─── Timeline Entry Schema ───────────────────────────────────────────────────

export const timelineEntrySchema = z.object({
  _id: z.string().optional(),
  action: timelineActionSchema,
  channel: contactChannelSchema.optional(),
  contactId: z.string().optional(),
  phoneUsed: z.string().optional(),
  messageText: z.string().optional().describe('Text prepared/opened (not "sent")'),
  waUrl: z.string().optional().describe('wa.me URL generated'),
  previousStatus: caseStatusSchema.optional(),
  newStatus: caseStatusSchema.optional(),
  outcome: contactOutcomeSchema.optional(),
  responseText: z.string().optional(),
  notes: z.string().optional(),
  field: z.string().optional().describe('For CONTACT_CORRECTED'),
  oldValue: z.string().optional(),
  newValue: z.string().optional(),
  attachmentId: z.string().optional(),
  replacedByImportVersion: z.number().optional(),
  resolutionType: resolutionTypeSchema.optional(),
  justification: z.string().optional(),
  createdBy: z.string().optional(),
  createdAt: z.coerce.date().optional(),
});

export type TimelineEntry = z.infer<typeof timelineEntrySchema>;

// ─── Timeline Entry Creation Payloads ────────────────────────────────────────

export const addTimelineEntrySchema = z.object({
  action: timelineActionSchema,
  channel: contactChannelSchema.optional(),
  contactId: z.string().optional(),
  phoneUsed: z.string().optional(),
  messageText: z.string().optional(),
  waUrl: z.string().optional(),
  outcome: contactOutcomeSchema.optional(),
  responseText: z.string().optional(),
  notes: z.string().optional(),
  resolutionType: resolutionTypeSchema.optional(),
  justification: z.string().optional(),
});

export type AddTimelineEntryPayload = z.infer<typeof addTimelineEntrySchema>;

// ─── Attachment Metadata Schema ──────────────────────────────────────────────

export const attachmentMetaSchema = z.object({
  _id: z.string().optional(),
  filename: z.string().describe('System-generated UUID filename'),
  originalName: z.string(),
  mimeType: z.enum(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  size: z.number().max(5 * 1024 * 1024, 'Max 5MB per file'),
  sha256: z.string(),
  storagePath: z.string(),
  description: z.string().optional(),
  uploadedBy: z.string(),
  uploadedAt: z.coerce.date(),
});

export type AttachmentMeta = z.infer<typeof attachmentMetaSchema>;

// ─── Parsed Entry (Parser Output) ────────────────────────────────────────────

export const parsedEntrySchema = z.object({
  rawBlock: z.string(),
  turmaName: z.string(),
  turmaId: z.string().nullable().optional(),
  alunoName: z.string(),
  alunoId: z.string().nullable().optional(),
  contacts: z.array(z.object({
    role: z.string(),
    name: z.string(),
    phones: z.array(phoneResultSchema),
  })),
  flags: z.object({
    justified_in_source: z.boolean(),
    possible_transfer: z.boolean(),
    multiple_contacts: z.boolean(),
    multiple_numbers: z.boolean(),
  }),
  observations: z.array(z.string()),
});

export type ParsedEntry = z.infer<typeof parsedEntrySchema>;

// ─── Parse Warning Schema ────────────────────────────────────────────────────

export const parseWarningSchema = z.object({
  type: z.enum([
    'unmatched_aluno',
    'unmatched_turma',
    'missing_area_code',
    'incomplete_phone',
    'unparseable_line',
    'duplicate_entry',
    'missing_date',
  ]),
  message: z.string(),
  rawLine: z.string(),
});

export type ParseWarning = z.infer<typeof parseWarningSchema>;

// ─── Parse Result Schema ─────────────────────────────────────────────────────

export const parseResultSchema = z.object({
  date: z.coerce.date().nullable(),
  entries: z.array(parsedEntrySchema),
  warnings: z.array(parseWarningSchema),
  stats: z.object({
    totalEntries: z.number(),
    withPhone: z.number(),
    withoutPhone: z.number(),
    justified: z.number(),
    transfers: z.number(),
  }),
});

export type ParseResult = z.infer<typeof parseResultSchema>;

// ─── Import Payload Schema ───────────────────────────────────────────────────

export const importAbsenceListSchema = z.object({
  rawText: z.string().min(10, 'Listagem muito curta'),
  previewHash: z.string().optional(),
});

export type ImportAbsenceListPayload = z.infer<typeof importAbsenceListSchema>;

// ─── Update Status Payload ───────────────────────────────────────────────────

export const updateCaseStatusSchema = z.object({
  status: caseStatusSchema,
});

export type UpdateCaseStatusPayload = z.infer<typeof updateCaseStatusSchema>;

// ─── Correct Contact Payload ─────────────────────────────────────────────────

export const correctContactSchema = z.object({
  correctedPhone: phoneResultSchema,
});

export type CorrectContactPayload = z.infer<typeof correctContactSchema>;

// ─── hasManualWork Predicate (Pure Function) ─────────────────────────────────

/**
 * Determines if a case has real human operational work,
 * which prevents its parent import from being replaced.
 *
 * Checks:
 * 1. Timeline contains at least one MANUAL_TIMELINE_ACTIONS entry
 * 2. OR attachments array is non-empty
 */
export function hasManualWork(
  timeline: Array<{ action: string }>,
  attachmentsLength: number,
): boolean {
  return (
    timeline.some(e => (MANUAL_TIMELINE_ACTIONS as readonly string[]).includes(e.action)) ||
    attachmentsLength > 0
  );
}
