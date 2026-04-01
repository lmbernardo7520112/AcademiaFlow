import { describe, it, expect } from 'vitest';
import { createDisciplinaSchema } from './disciplina.js';

describe('createDisciplinaSchema', () => {
  it('should validate valid course creation', () => {
    const payload = {
      name: 'Matemática',
    };
    const result = createDisciplinaSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(true);
    }
  });

  it('should reject empty course name', () => {
    expect(createDisciplinaSchema.safeParse({ name: ' ' }).success).toBe(false);
  });
});
