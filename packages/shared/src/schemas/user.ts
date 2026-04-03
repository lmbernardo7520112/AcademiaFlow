import { z } from 'zod';
import { objectIdSchema, emailSchema, passwordSchema, nonEmptyStringSchema, timestampFieldsSchema, tenantIdSchema } from './primitives.js';
import { ROLES } from './roles.js';

const roleValues = [ROLES.PROFESSOR, ROLES.SECRETARIA, ROLES.ADMIN, ROLES.ADMINISTRADOR] as const;

/**
 * Base User Schema
 */
export const userSchema = z.object({
  id: objectIdSchema,
  tenantId: tenantIdSchema,
  name: nonEmptyStringSchema,
  email: emailSchema,
  role: z.enum(roleValues),
  isActive: z.boolean().default(true),
  refreshToken: z.string().optional().nullable(),
  lastLoginAt: z.coerce.date().optional().nullable(),
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
  role: z.enum(roleValues).default(ROLES.PROFESSOR),
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


/**
 * Public User Response (Security: Omit sensitive fields)
 */
export const userResponseSchema = userSchema.omit({
  refreshToken: true,
  createdAt: true,
  updatedAt: true,
});

export type UserResponse = z.infer<typeof userResponseSchema>;


