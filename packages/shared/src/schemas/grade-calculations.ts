import { z } from 'zod';

/**
 * @module grade-calculations
 * Motor de cálculos acadêmicos do AcademiaFlow.
 * Regras de aprovação alinhadas à v1 (NF, MG, MF, PF, Situação).
 */

export const SITUACAO_VALUES = ['Aprovado', 'Reprovado', 'Recuperação', 'Pendente'] as const;

export const situacaoSchema = z.enum(SITUACAO_VALUES);
export type SituacaoAluno = z.infer<typeof situacaoSchema>;

/** Threshold de aprovação direta */
const APROVACAO_THRESHOLD = 6.0;
/** Threshold mínimo para direito a recuperação */
const RECUPERACAO_THRESHOLD = 4.0;

/**
 * Calcula a Nota Final (NF) — média simples das avaliações preenchidas.
 * Ignora valores null/undefined.
 */
export function calculateNF(notas: (number | null | undefined)[]): number | null {
  const validNotas = notas.filter((n): n is number => n != null && !isNaN(n));
  if (validNotas.length === 0) return null;
  const sum = validNotas.reduce((acc, val) => acc + val, 0);
  return parseFloat((sum / validNotas.length).toFixed(2));
}

/**
 * Calcula a Média Global (MG).
 * Atualmente igual à NF, mas extensível para ponderações futuras.
 */
export function calculateMG(nf: number | null): number | null {
  return nf;
}

/**
 * Calcula a Média Final (MF) após prova de recuperação (PF).
 * MF = (MG + PF) / 2
 */
export function calculateMF(mg: number | null, pf: number | null | undefined): number | null {
  if (mg == null) return null;
  if (pf == null) return mg;
  return parseFloat(((mg + pf) / 2).toFixed(2));
}

/**
 * Determina a situação do aluno com base nas regras acadêmicas:
 * - MG >= 6.0 → Aprovado
 * - MG >= 4.0 e < 6.0 → Recuperação
 * - MG < 4.0 → Reprovado
 * - Se PF preenchida: recalcula MF e reavalia
 */
export function determineSituacao(
  mg: number | null,
  pf?: number | null
): SituacaoAluno {
  if (mg == null) return 'Pendente';

  // Aprovação direta
  if (mg >= APROVACAO_THRESHOLD) return 'Aprovado';

  // Se tem PF, calcular média final
  if (pf != null) {
    const mf = calculateMF(mg, pf);
    if (mf != null && mf >= APROVACAO_THRESHOLD) return 'Aprovado';
    return 'Reprovado';
  }

  // Sem PF: verificar se tem direito a recuperação
  if (mg >= RECUPERACAO_THRESHOLD) return 'Recuperação';

  return 'Reprovado';
}

/**
 * Boletim Consolidado — agrega 4 bimestres + PF + cálculos
 */
export const boletimConsolidadoSchema = z.object({
  alunoId: z.string(),
  alunoName: z.string(),
  matricula: z.string(),
  disciplinaId: z.string(),
  disciplinaName: z.string(),
  turmaId: z.string(),
  year: z.number(),
  notas: z.object({
    bimestre1: z.number().nullable(),
    bimestre2: z.number().nullable(),
    bimestre3: z.number().nullable(),
    bimestre4: z.number().nullable(),
    pf: z.number().nullable().optional(),
  }),
  nf: z.number().nullable().describe('Nota Final (média simples dos bimestres)'),
  mg: z.number().nullable().describe('Média Global'),
  mf: z.number().nullable().describe('Média Final (com PF se aplicável)'),
  situacao: situacaoSchema,
});

export type BoletimConsolidado = z.infer<typeof boletimConsolidadoSchema>;
