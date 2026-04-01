import { z } from 'zod';
import { objectIdSchema, nonEmptyStringSchema, emailSchema, timestampFieldsSchema } from './primitives.js';

export const alunoSchema = z.object({
  id: objectIdSchema,
  name: nonEmptyStringSchema,
  email: emailSchema.optional().nullable(),
  matricula: nonEmptyStringSchema.describe('Número de matrícula único'),
  turmaId: objectIdSchema,
  dataNascimento: z.coerce.date().max(new Date(), 'Data de nascimento não pode estar no futuro'),
  isActive: z.boolean().default(true),
  ...timestampFieldsSchema.shape,
});

export type Aluno = z.infer<typeof alunoSchema>;

export const createAlunoSchema = alunoSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateAlunoPayload = z.infer<typeof createAlunoSchema>;

export const updateAlunoSchema = createAlunoSchema.partial();

export type UpdateAlunoPayload = z.infer<typeof updateAlunoSchema>;
