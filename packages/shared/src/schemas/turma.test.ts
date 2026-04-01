import { describe, it, expect } from 'vitest';
import { turmaSchema, createTurmaSchema } from './turma.js';

describe('turmaSchema', () => {
  it('should validate a valid turma', () => {
    const validTurma = {
      id: '507f1f77bcf86cd799439011',
      name: '1º Ano B',
      year: 2025,
      periodo: 'vespertino',
    };

    const result = turmaSchema.safeParse(validTurma);
    expect(result.success).toBe(true);
  });

  it('should reject invalid year', () => {
    const invalidYearTurma = {
      id: '507f1f77bcf86cd799439011',
      name: '1º Ano B',
      year: 1999, // below 2020 limit in primitive
    };

    expect(turmaSchema.safeParse(invalidYearTurma).success).toBe(false);
  });
});

describe('createTurmaSchema', () => {
  it('should set default periodo and isActive', () => {
    const payload = {
      name: '2º Ano C',
      year: 2025,
    };

    const result = createTurmaSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.periodo).toBe('matutino');
      expect(result.data.isActive).toBe(true);
    }
  });
});
