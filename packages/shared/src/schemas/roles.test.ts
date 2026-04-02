import { describe, it, expect } from 'vitest';
import { ROLES, ADMIN_ROLES, ALL_ROLES } from './roles.js';
import type { Role } from './roles.js';

describe('ROLES', () => {
  it('should define exactly four roles', () => {
    const roleValues = Object.values(ROLES);
    expect(roleValues).toHaveLength(4);
  });

  it('should contain professor, secretaria, admin, and administrador', () => {
    expect(ROLES.PROFESSOR).toBe('professor');
    expect(ROLES.SECRETARIA).toBe('secretaria');
    expect(ROLES.ADMIN).toBe('admin');
    expect(ROLES.ADMINISTRADOR).toBe('administrador');
  });

  it('should enforce type safety for Role type', () => {
    const validRole: Role = 'administrador';
    expect(validRole).toBe('administrador');
  });

  it('should export ADMIN_ROLES with admin, secretaria, and administrador', () => {
    expect(ADMIN_ROLES).toContain('admin');
    expect(ADMIN_ROLES).toContain('secretaria');
    expect(ADMIN_ROLES).toContain('administrador');
    expect(ADMIN_ROLES).not.toContain('professor');
    expect(ADMIN_ROLES).toHaveLength(3);
  });

  it('should export ALL_ROLES with all four roles', () => {
    expect(ALL_ROLES).toHaveLength(4);
    expect(ALL_ROLES).toContain('professor');
    expect(ALL_ROLES).toContain('administrador');
  });
});
