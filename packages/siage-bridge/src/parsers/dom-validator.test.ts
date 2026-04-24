import { describe, it, expect } from 'vitest';
import {
  validateBoletimColumns,
  EXPECTED_BOLETIM_COLUMNS,
} from './dom-validator.js';

describe('dom-validator', () => {
  describe('EXPECTED_BOLETIM_COLUMNS', () => {
    it('has 8 expected columns', () => {
      expect(EXPECTED_BOLETIM_COLUMNS).toHaveLength(8);
    });
  });

  describe('validateBoletimColumns', () => {
    it('validates complete column set', () => {
      const headers = [
        'ESTUDANTES',
        'MÉDIA DO 1º PERÍODO',
        'MÉDIA DO 2º PERÍODO',
        'MÉDIA DO 3º PERÍODO',
        'MÉDIA DO 4º PERÍODO',
        'FREQUÊNCIA',
        'SITUAÇÃO',
        'AÇÕES',
      ];
      const result = validateBoletimColumns(headers);
      expect(result.isValid).toBe(true);
      expect(result.columnsFound).toHaveLength(8);
      expect(result.columnsMissing).toHaveLength(0);
    });

    it('valid with ESTUDANTES + one period column', () => {
      const result = validateBoletimColumns(['ESTUDANTES', 'MÉDIA DO 1º PERÍODO']);
      expect(result.isValid).toBe(true);
    });

    it('invalid when ESTUDANTES is missing', () => {
      const result = validateBoletimColumns(['MÉDIA DO 1º PERÍODO', 'FREQUÊNCIA']);
      expect(result.isValid).toBe(false);
    });

    it('invalid when no period columns', () => {
      const result = validateBoletimColumns(['ESTUDANTES', 'FREQUÊNCIA', 'SITUAÇÃO']);
      expect(result.isValid).toBe(false);
    });

    it('invalid for empty array', () => {
      const result = validateBoletimColumns([]);
      expect(result.isValid).toBe(false);
      expect(result.columnsMissing).toHaveLength(8);
    });

    it('handles case-insensitive + whitespace', () => {
      const result = validateBoletimColumns([
        '  estudantes  ',
        '  Média do 1º Período  ',
      ]);
      expect(result.isValid).toBe(true);
    });

    it('reports correct missing columns', () => {
      const result = validateBoletimColumns(['ESTUDANTES', 'MÉDIA DO 1º PERÍODO']);
      expect(result.columnsMissing).toContain('MÉDIA DO 2º PERÍODO');
      expect(result.columnsMissing).toContain('AÇÕES');
      expect(result.columnsMissing).not.toContain('ESTUDANTES');
    });
  });
});
