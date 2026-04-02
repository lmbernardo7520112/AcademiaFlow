import { z } from 'zod';
import { objectIdSchema, nonEmptyStringSchema, timestampFieldsSchema, tenantIdSchema } from './primitives.js';

export const disciplinaSchema = z.object({
  id: objectIdSchema,
  tenantId: tenantIdSchema,
  name: nonEmptyStringSchema.describe('Course or Subject name (e.g. Matemática)'),
  isActive: z.boolean().default(true),
  ...timestampFieldsSchema.shape,
});

export type Disciplina = z.infer<typeof disciplinaSchema>;

export const createDisciplinaSchema = disciplinaSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  tenantId: true,
});

export type CreateDisciplinaPayload = z.infer<typeof createDisciplinaSchema>;

export const updateDisciplinaSchema = createDisciplinaSchema.partial();

export type UpdateDisciplinaPayload = z.infer<typeof updateDisciplinaSchema>;
