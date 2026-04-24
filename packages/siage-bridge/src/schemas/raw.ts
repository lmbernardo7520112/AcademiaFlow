/**
 * @module schemas/raw
 * Zod schemas that model the EXACT shape of SIAGE XHR responses.
 * These are internal to the anti-corruption layer — not exported from shared.
 *
 * Source of truth: real SIAGE API responses captured during discovery.
 */
import { z } from 'zod';

// ─── boletim-curriculo response ──────────────────────────────────────────────

export const siageRawBoletimAlunoSchema = z.object({
  matricula: z.string(),
  situacaoAluno: z.string(),
  nome: z.string(),
  periodo1: z.number().nullable(),
  periodo2: z.number().nullable(),
  periodo3: z.number().nullable(),
  periodo4: z.number().nullable(),
  mediaGeral: z.number().nullable(),
  provaFinal: z.number().nullable(),
  mediaPonderadaAnual: z.number().nullable(),
  frequenciaAluno: z.string(),
  isIngressante: z.boolean(),
  isRemanejado: z.boolean(),
  dataIngresso: z.string().nullable(),
  formacaoTurmaAlunoId: z.string(),
  periodo1Notas: z.array(z.number().nullable()),
  periodo2Notas: z.array(z.number().nullable()),
  periodo3Notas: z.array(z.number().nullable()),
  periodo4Notas: z.array(z.number().nullable()),
});

export type SiageRawBoletimAluno = z.infer<typeof siageRawBoletimAlunoSchema>;

export const siageRawChartDataSchema = z.object({
  name: z.string(),
  value: z.number(),
});

export const siageRawBoletimResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    boletimAlunos: z.array(siageRawBoletimAlunoSchema),
    chartData: z.array(siageRawChartDataSchema),
    quantidadeAlunos: z.number(),
    quantidadeRemanejados: z.number(),
    nomeEscola: z.string(),
  }),
});

export type SiageRawBoletimResponse = z.infer<typeof siageRawBoletimResponseSchema>;

// ─── get-cabecario-listagem response ─────────────────────────────────────────

export const siageRawProfessorSchema = z.object({
  nome: z.string(),
  cpf: z.string(),
  matricula: z.string(),
  email: z.string(),
});

export type SiageRawProfessor = z.infer<typeof siageRawProfessorSchema>;

export const siageRawCabecarioResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    escolaId: z.string(),
    anoSerieCicloId: z.string(),
    turmaEtapa: z.string(),
    componenteCurricular: z.string(),
    turno: z.string(),
    sala: z.string(),
    tipoEstruturaComponente: z.string(),
    cursoQualificacaoTecnica: z.string().nullable(),
    eMultiplaLotacao: z.boolean(),
    professores: z.array(siageRawProfessorSchema),
  }),
});

export type SiageRawCabecarioResponse = z.infer<typeof siageRawCabecarioResponseSchema>;
