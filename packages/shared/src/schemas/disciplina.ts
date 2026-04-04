import { z } from 'zod';
import { objectIdSchema, nonEmptyStringSchema, timestampFieldsSchema, tenantIdSchema } from './primitives.js';

/** Regex for discipline code: 2-4 uppercase letters, dash, 3 digits (e.g. MAT-001) */
export const codigoDisciplinaSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2,4}-\d{3}$/, 'Código deve seguir o padrão XX-000 (ex: MAT-001)');

export const disciplinaSchema = z.object({
  id: objectIdSchema,
  tenantId: tenantIdSchema,
  name: nonEmptyStringSchema.describe('Course or Subject name (e.g. Matemática)'),
  codigo: codigoDisciplinaSchema.describe('Código único da disciplina (ex: MAT-001)'),
  professorId: objectIdSchema.optional().nullable().describe('Professor atribuído'),
  turmaIds: z.array(objectIdSchema).default([]).describe('Turmas vinculadas'),
  cargaHoraria: z.number().int().min(10).max(400).default(60).describe('Carga horária em horas'),
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
