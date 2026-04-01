import { z } from 'zod';
import {
  objectIdSchema,
  academicYearSchema,
  bimesterSchema,
  gradeValueSchema,
  timestampFieldsSchema,
} from './primitives.js';

export const notaSchema = z.object({
  id: objectIdSchema,
  alunoId: objectIdSchema,
  disciplinaId: objectIdSchema,
  turmaId: objectIdSchema,
  year: academicYearSchema,
  bimester: bimesterSchema,
  value: gradeValueSchema,
  ...timestampFieldsSchema.shape,
});

export type Nota = z.infer<typeof notaSchema>;

export const createNotaSchema = notaSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateNotaPayload = z.infer<typeof createNotaSchema>;

export const createBulkNotasSchema = z.array(createNotaSchema).min(1);

export type CreateBulkNotasPayload = z.infer<typeof createBulkNotasSchema>;

export const updateNotaSchema = createNotaSchema.partial();

export type UpdateNotaPayload = z.infer<typeof updateNotaSchema>;
