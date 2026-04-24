/**
 * @module schemas/normalized
 * Normalized types that represent the bridge's OUTPUT.
 * These are the clean, domain-friendly shapes that the worker/API will consume.
 *
 * These types are internal to the bridge. The canonical frontier contract
 * (SiageSourceRecord) lives in @academiaflow/shared — the normalizer
 * maps FROM these types TO SiageSourceRecord.
 */
import { z } from 'zod';

// ─── Target Period ───────────────────────────────────────────────────────────

export const targetPeriodSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

export type TargetPeriod = z.infer<typeof targetPeriodSchema>;

// ─── BNCC Filter ─────────────────────────────────────────────────────────────

/**
 * Components classified as "Formação Geral Básica" (BNCC) in the SIAGE.
 * This is the positive-match for the BNCC filter.
 * Non-BNCC components (e.g. "Educação Digital", "Recomposição") are excluded.
 */
export const BNCC_COMPONENT_TYPE = 'Formação Geral Básica' as const;

/**
 * Checks if a component's tipoEstruturaComponente qualifies as BNCC.
 * Centralized rule — single place to update if SIAGE changes naming.
 */
export function isBnccComponent(tipoEstruturaComponente: string): boolean {
  return tipoEstruturaComponente.trim() === BNCC_COMPONENT_TYPE;
}

// ─── Boletim Header (from cabecario-listagem) ───────────────────────────────

export const boletimHeaderSchema = z.object({
  escolaId: z.string(),
  turmaEtapa: z.string(),
  componenteCurricular: z.string(),
  turno: z.string(),
  sala: z.string(),
  tipoEstruturaComponente: z.string(),
  isBncc: z.boolean(),
  professores: z.array(z.object({
    nome: z.string(),
    matricula: z.string(),
  })),
});

export type BoletimHeader = z.infer<typeof boletimHeaderSchema>;

// ─── Normalized Student Record ───────────────────────────────────────────────

export const normalizedStudentRecordSchema = z.object({
  nome: z.string(),
  matriculaSiage: z.string().describe('SIAGE internal UUID for the student enrollment'),
  formacaoTurmaAlunoId: z.string(),
  situacao: z.string(),
  frequencia: z.string(),
  isIngressante: z.boolean(),
  isRemanejado: z.boolean(),
  dataIngresso: z.string().nullable(),
  /** The grade for the target period (null = no grade recorded) */
  notaPeriodo: z.number().nullable(),
  /** Detailed sub-grades for the target period (array of nullable numbers) */
  notasDetalhadas: z.array(z.number().nullable()),
  /** Which period this data refers to (1-4) */
  targetPeriod: targetPeriodSchema,
});

export type NormalizedStudentRecord = z.infer<typeof normalizedStudentRecordSchema>;

// ─── Extraction Result ───────────────────────────────────────────────────────

export const extractionResultSchema = z.object({
  header: boletimHeaderSchema,
  students: z.array(normalizedStudentRecordSchema),
  meta: z.object({
    quantidadeAlunos: z.number(),
    quantidadeRemanejados: z.number(),
    nomeEscola: z.string(),
    targetPeriod: targetPeriodSchema,
    extractedAt: z.string(),
  }),
});

export type ExtractionResult = z.infer<typeof extractionResultSchema>;
