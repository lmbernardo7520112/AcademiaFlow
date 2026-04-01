import { describe, it, expect } from 'vitest';
import { ROLES } from './roles.js';
import type { Role } from './roles.js';

describe('ROLES', () => {
  it('should define exactly three roles', () => {
    const roleValues = Object.values(ROLES);
    expect(roleValues).toHaveLength(3);
  });

  it('should contain professor, secretaria, and admin', () => {
    expect(ROLES.PROFESSOR).toBe('professor');
    expect(ROLES.SECRETARIA).toBe('secretaria');
    expect(ROLES.ADMIN).toBe('admin');
  });

  it('should enforce type safety for Role type', () => {
    const validRole: Role = 'professor';
    expect(validRole).toBe('professor');
  });
});
