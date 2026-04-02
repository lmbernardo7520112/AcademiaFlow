import { z } from 'zod';
import { objectIdSchema, nonEmptyStringSchema, timestampFieldsSchema, tenantIdSchema } from './primitives.js';

const feedbackEntrySchema = z.object({
  atividadeId: objectIdSchema,
  comentario: nonEmptyStringSchema,
  qualidadeIA: z.number().min(0).max(10).describe('Nota de qualidade da IA (0-10)'),
  data: z.coerce.date().default(() => new Date()),
});

export type FeedbackEntry = z.infer<typeof feedbackEntrySchema>;

export const validacaoPedagogicaSchema = z.object({
  id: objectIdSchema,
  tenantId: tenantIdSchema,
  professorId: objectIdSchema,
  disciplinaId: objectIdSchema,
  atividadesValidadas: z.number().int().min(0).default(0),
  feedbacks: z.array(feedbackEntrySchema).default([]),
  ultimaValidacao: z.coerce.date().optional().nullable(),
  ...timestampFieldsSchema.shape,
});

export type ValidacaoPedagogica = z.infer<typeof validacaoPedagogicaSchema>;

export const createValidacaoFeedbackSchema = z.object({
  atividadeId: objectIdSchema,
  comentario: nonEmptyStringSchema,
  qualidadeIA: z.number().min(0).max(10),
});

export type CreateValidacaoFeedbackPayload = z.infer<typeof createValidacaoFeedbackSchema>;
