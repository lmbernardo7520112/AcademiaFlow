/**
 * Role definitions for the AcademiaFlow system.
 * Specification: Three roles with hierarchical access control.
 */
export const ROLES = {
  PROFESSOR: 'professor',
  SECRETARIA: 'secretaria',
  ADMIN: 'admin',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
