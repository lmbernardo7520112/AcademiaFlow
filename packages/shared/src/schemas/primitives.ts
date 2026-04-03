/**
 * @module primitives
 * Reusable Zod primitives for the AcademiaFlow domain.
 * These are the building blocks for all entity schemas (SDD).
 */
import { z } from 'zod';

/** MongoDB ObjectId as string (24 hex chars) */
export const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, 'ID inválido: deve ser um ObjectId MongoDB válido');

/** Tenant ID for B2B Isolation */
export const tenantIdSchema = objectIdSchema.describe('Identificador do Cliente/Escola (B2B)');

/** Email with normalization */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Email inválido');

/** Non-empty trimmed string */
export const nonEmptyStringSchema = z
  .string()
  .trim()
  .min(1, 'Campo obrigatório');

/** Password with minimum security requirements */
export const passwordSchema = z
  .string()
  .min(6, 'Senha deve ter no mínimo 6 caracteres')
  .max(128, 'Senha deve ter no máximo 128 caracteres');

/** Grade value: 0 to 10, one decimal place */
export const gradeValueSchema = z
  .number()
  .min(0, 'Nota mínima é 0')
  .max(10, 'Nota máxima é 10');

/** Bimester: 1, 2, 3, 4, or 5 (5 represents PF - Prova Final) */
export const bimesterSchema = z
  .number()
  .int()
  .min(1, 'Bimestre mínimo é 1')
  .max(5, 'O BIMESTRE 5 é reservado para a Prova Final (PF)');

/** Year: reasonable academic year range */
export const academicYearSchema = z
  .number()
  .int()
  .min(2020)
  .max(2050);

/** Pagination query params */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/** Standard API response envelope */
export function apiResponseSchema<T extends z.ZodType>(dataSchema: T) {
  return z.object({
    success: z.boolean(),
    data: dataSchema,
    message: z.string().optional(),
  });
}

/** Timestamp fields for database records */
export const timestampFieldsSchema = z.object({
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

/** Generic Success Schema */
export const genericSuccessSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

/** Pagination Metadata Schema */
export const paginationMetadataSchema = z.object({
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  pages: z.number().int().min(0),
});
