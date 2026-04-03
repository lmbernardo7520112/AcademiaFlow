import { z } from 'zod';
import { objectIdSchema, timestampFieldsSchema, tenantIdSchema } from './primitives.js';

export const VALIDACAO_TYPES = ['ANALYSIS', 'EXERCISES'] as const;

export const exerciseSchema = z.object({
  question: z.string(),
  options: z.array(z.string()),
  correctAnswer: z.string(),
  explanation: z.string().optional(),
});

export const validacaoPedagogicaSchema = z.object({
  id: objectIdSchema,
  tenantId: tenantIdSchema,
  professorId: objectIdSchema,
  turmaId: objectIdSchema,
  disciplinaId: objectIdSchema,
  bimester: z.number().int().min(1).max(5),
  year: z.number().int().min(2000).max(2100),
  type: z.enum(VALIDACAO_TYPES),
  content: z.string().optional().nullable(),
  exercises: z.array(exerciseSchema).optional().default([]),
  targetStudents: z.array(objectIdSchema).optional().default([]),
  ...timestampFieldsSchema.shape,
});

export type ValidacaoPedagogica = z.infer<typeof validacaoPedagogicaSchema>;

export const validacaoPedagogicaHistorySchema = z.object({
  turmaId: z.string().optional(),
  disciplinaId: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type AiHistoryFilters = z.infer<typeof validacaoPedagogicaHistorySchema>;

export const validacaoPedagogicaQuerySchema = z.object({
  turmaId: objectIdSchema.optional(),
  disciplinaId: objectIdSchema.optional(),
  year: z.coerce.number().optional(),
  bimester: z.coerce.number().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ValidacaoPedagogicaQuery = z.infer<typeof validacaoPedagogicaQuerySchema>;
