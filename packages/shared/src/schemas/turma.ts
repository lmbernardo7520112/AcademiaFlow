import { z } from 'zod';
import { objectIdSchema, nonEmptyStringSchema, academicYearSchema, timestampFieldsSchema, tenantIdSchema } from './primitives.js';

export const TURMA_PERIODOS = ['matutino', 'vespertino', 'noturno'] as const;

export const turmaSchema = z.object({
  id: objectIdSchema,
  tenantId: tenantIdSchema,
  name: nonEmptyStringSchema.describe('Nome da Turma, ex: 3º Ano A'),
  year: academicYearSchema,
  periodo: z.enum(TURMA_PERIODOS).default('matutino'),
  professorId: objectIdSchema.optional().nullable().describe('Professor responsável pela turma'),
  isActive: z.boolean().default(true),
  ...timestampFieldsSchema.shape,
});

export type Turma = z.infer<typeof turmaSchema>;

export const createTurmaSchema = turmaSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  tenantId: true,
});

export type CreateTurmaPayload = z.infer<typeof createTurmaSchema>;

export const updateTurmaSchema = createTurmaSchema.partial();

export type UpdateTurmaPayload = z.infer<typeof updateTurmaSchema>;

/**
 * Turma List Response
 */
export const turmaListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(turmaSchema),
});

export type TurmaListResponse = z.infer<typeof turmaListResponseSchema>;
