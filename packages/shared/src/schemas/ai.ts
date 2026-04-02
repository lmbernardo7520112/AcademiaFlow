import { z } from 'zod';
import { nonEmptyStringSchema, objectIdSchema } from './primitives.js';

export const AI_PROVIDERS = ['gemini', 'n8n', 'openai'] as const;

/**
 * Payload entry to process a student's pedagogical report
 */
export const analyzeStudentPayloadSchema = z.object({
  alunoId: objectIdSchema,
  focoAtividade: nonEmptyStringSchema.describe('Exemplo: reforco-matematica, quiz-historia'),
});

export type AnalyzeStudentPayload = z.infer<typeof analyzeStudentPayloadSchema>;

/**
 * The Strict Output Schema requested from the LLM (Structured JSON)
 */
export const questaoSchema = z.object({
  titulo: nonEmptyStringSchema,
  enunciado: nonEmptyStringSchema,
  alternativas: z.array(nonEmptyStringSchema).min(2).max(5),
  correta: z.number().int().min(0).max(4).describe('Índice da alternativa correta (0-indexed)'),
});

export const atividadeGeradaSchema = z.object({
  tituloDaAtividade: nonEmptyStringSchema,
  resumoPedagogico: nonEmptyStringSchema.describe('Diagnóstico resumido das lacunas do aluno e objetivo desta atividade'),
  pontosDeAtencao: z.array(nonEmptyStringSchema).describe('Lista de dicas e focos sugeridos para o professor'),
  questoes: z.array(questaoSchema).min(1).describe('A atividade prática (questões de múltipla escolha)'),
});

export type AtividadeGerada = z.infer<typeof atividadeGeradaSchema>;

