import { describe, it, expect } from 'vitest';
import { calculateNF, calculateMG, calculateMF, determineSituacao } from './grade-calculations.js';

describe('calculateNF', () => {
  it('should return null when no grades are provided', () => {
    expect(calculateNF([])).toBeNull();
  });

  it('should return null for all-null grades', () => {
    expect(calculateNF([null, null, null, null])).toBeNull();
  });

  it('should calculate average of valid grades only', () => {
    expect(calculateNF([8, 6, null, null])).toBe(7);
  });

  it('should calculate average of all 4 bimesters', () => {
    expect(calculateNF([8, 7, 9, 6])).toBe(7.5);
  });

  it('should handle single grade', () => {
    expect(calculateNF([10])).toBe(10);
  });

  it('should handle edge case of all zeros', () => {
    expect(calculateNF([0, 0, 0, 0])).toBe(0);
  });

  it('should round to 2 decimal places', () => {
    expect(calculateNF([7, 8, 9])).toBe(8);
    expect(calculateNF([7, 7, 8])).toBe(7.33);
  });
});

describe('calculateMG', () => {
  it('should return null when NF is null', () => {
    expect(calculateMG(null)).toBeNull();
  });

  it('should return NF as MG (currently 1:1)', () => {
    expect(calculateMG(7.5)).toBe(7.5);
  });
});

describe('calculateMF', () => {
  it('should return null when MG is null', () => {
    expect(calculateMF(null, 8)).toBeNull();
  });

  it('should return MG when PF is null', () => {
    expect(calculateMF(5.0, null)).toBe(5.0);
  });

  it('should return MG when PF is undefined', () => {
    expect(calculateMF(5.0, undefined)).toBe(5.0);
  });

  it('should calculate (MG + PF) / 2', () => {
    expect(calculateMF(4.0, 8.0)).toBe(6.0);
  });

  it('should round to 2 decimal places', () => {
    expect(calculateMF(5.0, 7.0)).toBe(6.0);
    expect(calculateMF(4.5, 7.0)).toBe(5.75);
  });
});

describe('determineSituacao', () => {
  it('should return Pendente when MG is null', () => {
    expect(determineSituacao(null)).toBe('Pendente');
  });

  it('should return Aprovado when MG >= 6.0', () => {
    expect(determineSituacao(6.0)).toBe('Aprovado');
    expect(determineSituacao(10.0)).toBe('Aprovado');
    expect(determineSituacao(7.5)).toBe('Aprovado');
  });

  it('should return Recuperação when MG >= 4.0 and < 6.0 and no PF', () => {
    expect(determineSituacao(4.0)).toBe('Recuperação');
    expect(determineSituacao(5.5)).toBe('Recuperação');
    expect(determineSituacao(5.99)).toBe('Recuperação');
  });

  it('should return Reprovado when MG < 4.0 and no PF', () => {
    expect(determineSituacao(3.9)).toBe('Reprovado');
    expect(determineSituacao(0)).toBe('Reprovado');
    expect(determineSituacao(2.0)).toBe('Reprovado');
  });

  it('should return Aprovado when MG < 6.0 but MF >= 6.0 after PF', () => {
    // MG=4, PF=8 → MF=(4+8)/2=6.0 → Aprovado
    expect(determineSituacao(4.0, 8.0)).toBe('Aprovado');
  });

  it('should return Reprovado when MG < 6.0 and MF < 6.0 after PF', () => {
    // MG=4, PF=6 → MF=(4+6)/2=5.0 → Reprovado
    expect(determineSituacao(4.0, 6.0)).toBe('Reprovado');
  });

  it('boundary: exactly 6.0 MG should be Aprovado', () => {
    expect(determineSituacao(6.0)).toBe('Aprovado');
  });

  it('boundary: exactly 4.0 MG should be Recuperação', () => {
    expect(determineSituacao(4.0)).toBe('Recuperação');
  });
});
