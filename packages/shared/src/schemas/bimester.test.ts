import { describe, it, expect } from 'vitest';
import {
  BIMESTERS,
  BIMESTER_LABELS,
  BIMESTER_SHORT_LABELS,
  normalizeBimestralSlots,
  isBimesterPeriodo,
} from './bimester.js';

describe('BIMESTERS constant', () => {
  it('should contain exactly 4 periods', () => {
    expect(BIMESTERS).toHaveLength(4);
  });

  it('should be ordered 1 → 4', () => {
    expect([...BIMESTERS]).toEqual([1, 2, 3, 4]);
  });
});

describe('BIMESTER_LABELS', () => {
  it('should have a label for each period', () => {
    for (const p of BIMESTERS) {
      expect(BIMESTER_LABELS[p]).toBeDefined();
      expect(typeof BIMESTER_LABELS[p]).toBe('string');
    }
  });

  it('should produce correct full labels', () => {
    expect(BIMESTER_LABELS[1]).toBe('1º Bimestre');
    expect(BIMESTER_LABELS[4]).toBe('4º Bimestre');
  });
});

describe('BIMESTER_SHORT_LABELS', () => {
  it('should have a short label for each period', () => {
    for (const p of BIMESTERS) {
      expect(BIMESTER_SHORT_LABELS[p]).toBeDefined();
    }
  });
});

describe('normalizeBimestralSlots', () => {
  it('should always return exactly 4 slots', () => {
    const result = normalizeBimestralSlots({});
    expect(result).toHaveLength(4);
  });

  it('should order slots 1 → 4', () => {
    const result = normalizeBimestralSlots({});
    expect(result.map((s) => s.periodo)).toEqual([1, 2, 3, 4]);
  });

  it('should fill missing periods with valor: null', () => {
    const result = normalizeBimestralSlots({ 1: 8.5, 3: 7.0 });
    expect(result[0].valor).toBe(8.5);
    expect(result[1].valor).toBeNull(); // period 2 missing → null
    expect(result[2].valor).toBe(7.0);
    expect(result[3].valor).toBeNull(); // period 4 missing → null
  });

  it('should preserve zero as mathematical zero (not null)', () => {
    const result = normalizeBimestralSlots({ 1: 0, 2: 0, 3: 0, 4: 0 });
    for (const slot of result) {
      expect(slot.valor).toBe(0);
      expect(slot.valor).not.toBeNull();
    }
  });

  it('should preserve explicit null values', () => {
    const result = normalizeBimestralSlots({
      1: 8.0,
      2: null,
      3: 7.0,
      4: null,
    });
    expect(result[0].valor).toBe(8.0);
    expect(result[1].valor).toBeNull();
    expect(result[2].valor).toBe(7.0);
    expect(result[3].valor).toBeNull();
  });

  it('should attach correct labels from shared constants', () => {
    const result = normalizeBimestralSlots({});
    expect(result[0].label).toBe('1º Bimestre');
    expect(result[1].label).toBe('2º Bimestre');
    expect(result[2].label).toBe('3º Bimestre');
    expect(result[3].label).toBe('4º Bimestre');
  });

  it('should return full DTO when all 4 values provided', () => {
    const result = normalizeBimestralSlots({ 1: 8.5, 2: 7.0, 3: 9.0, 4: 6.5 });
    expect(result).toEqual([
      { periodo: 1, valor: 8.5, label: '1º Bimestre' },
      { periodo: 2, valor: 7.0, label: '2º Bimestre' },
      { periodo: 3, valor: 9.0, label: '3º Bimestre' },
      { periodo: 4, valor: 6.5, label: '4º Bimestre' },
    ]);
  });

  it('should distinguish null (absence) from 0 (mathematical zero)', () => {
    const result = normalizeBimestralSlots({ 1: 0, 2: null, 3: undefined as unknown as null });
    expect(result[0].valor).toBe(0);      // zero preserved
    expect(result[1].valor).toBeNull();    // explicit null
    expect(result[2].valor).toBeNull();    // undefined → null
    expect(result[3].valor).toBeNull();    // missing → null
  });
});

describe('isBimesterPeriodo', () => {
  it('should return true for valid periods 1-4', () => {
    expect(isBimesterPeriodo(1)).toBe(true);
    expect(isBimesterPeriodo(2)).toBe(true);
    expect(isBimesterPeriodo(3)).toBe(true);
    expect(isBimesterPeriodo(4)).toBe(true);
  });

  it('should return false for invalid periods', () => {
    expect(isBimesterPeriodo(0)).toBe(false);
    expect(isBimesterPeriodo(5)).toBe(false);
    expect(isBimesterPeriodo(-1)).toBe(false);
    expect(isBimesterPeriodo(1.5)).toBe(false);
  });
});
