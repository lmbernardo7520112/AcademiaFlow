import { describe, it, expect } from 'vitest';
import { createNotaSchema, createBulkNotasSchema } from './nota.js';

describe('createNotaSchema', () => {
  it('should validate a correct grade payload', () => {
    const payload = {
      alunoId: '507f1f77bcf86cd799439011',
      disciplinaId: '507f1f77bcf86cd799439022',
      turmaId: '507f1f77bcf86cd799439033',
      year: 2025,
      bimester: 1,
      value: 8.5,
    };
    expect(createNotaSchema.safeParse(payload).success).toBe(true);
  });

  it('should reject invalid grade value', () => {
    const invalidPayload = {
      alunoId: '507f1f77bcf86cd799439011',
      disciplinaId: '507f1f77bcf86cd799439022',
      turmaId: '507f1f77bcf86cd799439033',
      year: 2025,
      bimester: 1,
      value: 11, // max is 10
    };
    expect(createNotaSchema.safeParse(invalidPayload).success).toBe(false);
  });
});

describe('createBulkNotasSchema', () => {
  it('should accept an array of valid grades', () => {
    const items = [
      {
        alunoId: '507f1f77bcf86cd799439011',
        disciplinaId: '507f1f77bcf86cd799439022',
        turmaId: '507f1f77bcf86cd799439033',
        year: 2025,
        bimester: 1,
        value: 8.5,
      },
      {
        alunoId: '507f1f77bcf86cd799439012',
        disciplinaId: '507f1f77bcf86cd799439022',
        turmaId: '507f1f77bcf86cd799439033',
        year: 2025,
        bimester: 1,
        value: 7.0,
      },
    ];
    expect(createBulkNotasSchema.safeParse(items).success).toBe(true);
  });

  it('should reject an empty array', () => {
    expect(createBulkNotasSchema.safeParse([]).success).toBe(false);
  });
});
