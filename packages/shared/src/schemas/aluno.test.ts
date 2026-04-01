import { describe, it, expect } from 'vitest';
import { createAlunoSchema } from './aluno.js';

describe('createAlunoSchema', () => {
  it('should validate valid aluno creation', () => {
    const payload = {
      name: 'João Silva',
      matricula: 'MAT-2025-001',
      turmaId: '507f1f77bcf86cd799439011',
      dataNascimento: '2010-05-15',
    };

    const result = createAlunoSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dataNascimento).toBeInstanceOf(Date);
      expect(result.data.isActive).toBe(true);
    }
  });

  it('should reject future dataNascimento', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const payload = {
      name: 'Future Kid',
      matricula: 'MAT-FUT',
      turmaId: '507f1f77bcf86cd799439011',
      dataNascimento: tomorrow,
    };

    expect(createAlunoSchema.safeParse(payload).success).toBe(false);
  });
});
