import { z } from 'zod';
import { objectIdSchema, emailSchema, passwordSchema, nonEmptyStringSchema, timestampFieldsSchema } from './primitives.js';
import { ROLES } from './roles.js';

/**
 * Base User Schema
 */
export const userSchema = z.object({
  id: objectIdSchema,
  name: nonEmptyStringSchema,
  email: emailSchema,
  role: z.enum([ROLES.PROFESSOR, ROLES.SECRETARIA, ROLES.ADMIN]),
  isActive: z.boolean().default(true),
  ...timestampFieldsSchema.shape,
});

/**
 * Infer TypeScript type from Zod schema
 */
export type User = z.infer<typeof userSchema>;

/**
 * Schema for user creation payload
 */
export const createUserSchema = z.object({
  name: nonEmptyStringSchema,
  email: emailSchema,
  password: passwordSchema,
  role: z.enum([ROLES.PROFESSOR, ROLES.SECRETARIA, ROLES.ADMIN]).default(ROLES.PROFESSOR),
});

export type CreateUserPayload = z.infer<typeof createUserSchema>;

/**
 * Schema for user login payload
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type LoginPayload = z.infer<typeof loginSchema>;
