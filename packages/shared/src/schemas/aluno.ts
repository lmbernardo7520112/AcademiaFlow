import { z } from 'zod';
import { objectIdSchema, nonEmptyStringSchema, emailSchema, timestampFieldsSchema, tenantIdSchema } from './primitives.js';
import { turmaSchema } from './turma.js';

export const alunoSchema = z.object({
  id: objectIdSchema,
  tenantId: tenantIdSchema,
  name: nonEmptyStringSchema,
  email: emailSchema.optional().nullable(),
  matricula: nonEmptyStringSchema.describe('Número de matrícula único'),
  turmaId: z.union([objectIdSchema, z.any()]), // Permite ID ou objeto populado para evitar casts no frontend
  dataNascimento: z.coerce.date().max(new Date(), 'Data de nascimento não pode estar no futuro'),
  isActive: z.boolean().default(true),
  transferido: z.boolean().default(false).describe('Aluno transferido para outra instituição'),
  abandono: z.boolean().default(false).describe('Aluno evadido/abandonou o curso'),
  ...timestampFieldsSchema.shape,
});

export type Aluno = z.infer<typeof alunoSchema>;

/** Tipo para Aluno com Turma Populada */
export const populatedAlunoSchema = alunoSchema.extend({
  turmaId: turmaSchema
});

export type PopulatedAluno = z.infer<typeof populatedAlunoSchema>;

export const createAlunoSchema = alunoSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  tenantId: true,
});

export type CreateAlunoPayload = z.infer<typeof createAlunoSchema>;

export const updateAlunoSchema = createAlunoSchema.partial();

export type UpdateAlunoPayload = z.infer<typeof updateAlunoSchema>;

/**
 * Semantic status update (Exclusive: transferido OR abandono)
 */
export const alunoStatusUpdateSchema = z.object({
  transferido: z.boolean().optional(),
  abandono: z.boolean().optional(),
}).refine(data => {
  if (data.transferido && data.abandono) return false;
  return data.transferido !== undefined || data.abandono !== undefined;
}, {
  message: "Transferido e Abandono são mutuamente exclusivos e ao menos um deve ser fornecido",
  path: ["status"]
});

export type AlunoStatusUpdatePayload = z.infer<typeof alunoStatusUpdateSchema>;

