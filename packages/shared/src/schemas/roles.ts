/**
 * Role definitions for the AcademiaFlow system.
 * Specification: Three roles with hierarchical access control.
 */
export const ROLES = {
  PROFESSOR: 'professor',
  SECRETARIA: 'secretaria',
  ADMIN: 'admin',
  ADMINISTRADOR: 'administrador',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/** Roles que possuem acesso à área administrativa (secretaria/*) */
export const ADMIN_ROLES: Role[] = [ROLES.ADMIN, ROLES.SECRETARIA, ROLES.ADMINISTRADOR];

/** Todas as roles válidas como array */
export const ALL_ROLES: Role[] = Object.values(ROLES);
