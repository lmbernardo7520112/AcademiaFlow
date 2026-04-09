import { z } from 'zod';
import {
  objectIdSchema,
  academicYearSchema,
  bimesterSchema,
  gradeValueSchema,
  timestampFieldsSchema,
  tenantIdSchema,
} from './primitives.js';

export const notaSchema = z.object({
  id: objectIdSchema,
  tenantId: tenantIdSchema,
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
  tenantId: true,
});

export type CreateNotaPayload = z.infer<typeof createNotaSchema>;

export const createBulkNotasSchema = z.array(createNotaSchema).min(1);

export type CreateBulkNotasPayload = z.infer<typeof createBulkNotasSchema>;


export const updateNotaSchema = createNotaSchema.partial();

export type UpdateNotaPayload = z.infer<typeof updateNotaSchema>;

/** Schema para o Boletim Individual do Aluno */
export const boletimIndividualSchema = z.object({
  aluno: z.object({
    id: z.string(),
    name: z.string(),
    matricula: z.string(),
    turmaName: z.string().optional(),
  }),
  year: z.number(),
  disciplinas: z.array(z.object({
    id: z.string(),
    name: z.string(),
    notas: z.object({
      bimestre1: z.number().nullable(),
      bimestre2: z.number().nullable(),
      bimestre3: z.number().nullable(),
      bimestre4: z.number().nullable(),
      pf: z.number().nullable(),
    }),
    nf: z.number().nullable(),
    mg: z.number().nullable(),
    mf: z.number().nullable(),
    situacao: z.string(),
  })),
});

export type BoletimIndividualResponse = z.infer<typeof boletimIndividualSchema>;
