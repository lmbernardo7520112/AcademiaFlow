import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCabecarioResponse, normalizeCabecario } from './cabecario-parser.js';
import { SiageParseError, SiageNonBnccError } from '../errors.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(
  readFileSync(resolve(__dirname, '../__fixtures__/get-cabecario-listagem-response.json'), 'utf-8'),
);

describe('cabecario-parser', () => {
  describe('parseCabecarioResponse', () => {
    it('parses valid fixture', () => {
      const result = parseCabecarioResponse(fixture);
      expect(result.success).toBe(true);
      expect(result.data.turmaEtapa).toBe('Ensino Médio - 1ª Série A');
      expect(result.data.componenteCurricular).toBe('Biologia');
    });

    it('throws SiageParseError for invalid payload', () => {
      expect(() => parseCabecarioResponse({})).toThrow(SiageParseError);
    });

    it('throws SiageParseError for missing data fields', () => {
      expect(() => parseCabecarioResponse({ success: true, data: {} })).toThrow(SiageParseError);
    });
  });

  describe('normalizeCabecario', () => {
    it('normalizes BNCC component correctly', () => {
      const header = normalizeCabecario(fixture);
      expect(header.turmaEtapa).toBe('Ensino Médio - 1ª Série A');
      expect(header.componenteCurricular).toBe('Biologia');
      expect(header.tipoEstruturaComponente).toBe('Formação Geral Básica');
      expect(header.isBncc).toBe(true);
      expect(header.turno).toBe('Integral');
      expect(header.sala).toBe('SALA 01');
    });

    it('strips sensitive professor fields (CPF, email)', () => {
      const header = normalizeCabecario(fixture);
      expect(header.professores).toHaveLength(1);
      expect(header.professores[0]).toEqual({
        nome: 'PROFESSOR EXEMPLO DA SILVA',
        matricula: '0000000',
      });
      // CPF and email must NOT be present
      const prof = header.professores[0] as Record<string, unknown>;
      expect(prof['cpf']).toBeUndefined();
      expect(prof['email']).toBeUndefined();
    });

    it('detects non-BNCC component', () => {
      const nonBncc = {
        ...fixture,
        data: {
          ...fixture.data,
          tipoEstruturaComponente: 'Parte Diversificada',
          componenteCurricular: 'Educação Digital',
        },
      };
      const header = normalizeCabecario(nonBncc);
      expect(header.isBncc).toBe(false);
    });

    it('throws SiageNonBnccError when enforceBncc=true on non-BNCC', () => {
      const nonBncc = {
        ...fixture,
        data: {
          ...fixture.data,
          tipoEstruturaComponente: 'Parte Diversificada',
          componenteCurricular: 'Recomposição',
        },
      };
      expect(() => normalizeCabecario(nonBncc, { enforceBncc: true }))
        .toThrow(SiageNonBnccError);
    });

    it('does NOT throw for BNCC component with enforceBncc=true', () => {
      const header = normalizeCabecario(fixture, { enforceBncc: true });
      expect(header.isBncc).toBe(true);
    });

    it('handles component with trailing whitespace in tipo', () => {
      const withSpace = {
        ...fixture,
        data: {
          ...fixture.data,
          tipoEstruturaComponente: '  Formação Geral Básica  ',
        },
      };
      const header = normalizeCabecario(withSpace);
      expect(header.isBncc).toBe(true);
    });
  });
});
