import { describe, it, expect } from 'vitest';
import { createDisciplinaSchema, codigoDisciplinaSchema } from './disciplina.js';

describe('createDisciplinaSchema', () => {
  it('should validate valid course creation', () => {
    const payload = {
      name: 'Matemática',
      codigo: 'MAT-001',
    };
    const result = createDisciplinaSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(true);
      expect(result.data.cargaHoraria).toBe(60);
      expect(result.data.codigo).toBe('MAT-001');
    }
  });

  it('should reject empty course name', () => {
    expect(createDisciplinaSchema.safeParse({ name: ' ', codigo: 'MAT-001' }).success).toBe(false);
  });

  it('should reject missing codigo', () => {
    expect(createDisciplinaSchema.safeParse({ name: 'Matemática' }).success).toBe(false);
  });

  it('should reject invalid codigo format', () => {
    expect(codigoDisciplinaSchema.safeParse('math001').success).toBe(false);
    expect(codigoDisciplinaSchema.safeParse('M-01').success).toBe(false);
    expect(codigoDisciplinaSchema.safeParse('MATEM-001').success).toBe(false);
  });

  it('should accept valid codigo formats', () => {
    expect(codigoDisciplinaSchema.safeParse('MAT-001').success).toBe(true);
    expect(codigoDisciplinaSchema.safeParse('BIO-100').success).toBe(true);
    expect(codigoDisciplinaSchema.safeParse('HIST-200').success).toBe(true);
    // Lowercase should be transformed to uppercase
    expect(codigoDisciplinaSchema.safeParse('mat-001').success).toBe(true);
  });

  it('should accept optional professorId and turmaId', () => {
    const payload = {
      name: 'Biologia',
      codigo: 'BIO-001',
      professorId: '507f1f77bcf86cd799439011',
      turmaId: '507f1f77bcf86cd799439012',
      cargaHoraria: 80,
    };
    const result = createDisciplinaSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cargaHoraria).toBe(80);
    }
  });
});
