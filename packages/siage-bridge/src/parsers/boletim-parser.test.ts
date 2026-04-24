import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseBoletimResponse,
  getGradeForPeriod,
  getDetailedGradesForPeriod,
  normalizeAluno,
  parseAndNormalizeBoletim,
} from './boletim-parser.js';
import { SiageParseError } from '../errors.js';
import type { SiageRawBoletimAluno } from '../schemas/raw.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(
  readFileSync(resolve(__dirname, '../__fixtures__/boletim-curriculo-response.json'), 'utf-8'),
);

// Fixture indices:
// [0] ALUNO REMANEJADO UM — remanejado, all nulls
// [1] ALUNO CURSANDO COM NOTA — periodo1=3.7, Frequente
// [2] ALUNO INFREQUENTE BAIXA NOTA — periodo1=2.0, Infrequente
// [3] ALUNO INGRESSANTE SEM NOTA — ingressante, periodo1=null
// [4] ALUNO NOTA ALTA FREQUENTE — periodo1=8.3
// [5] ALUNO NOTAS PARCIAIS — periodo1=4.5, partial notas
// [6] ALUNO INGRESSANTE COM NOTA — ingressante, periodo1=6.0

describe('boletim-parser', () => {
  describe('parseBoletimResponse', () => {
    it('parses valid fixture successfully', () => {
      const result = parseBoletimResponse(fixture);
      expect(result.success).toBe(true);
      expect(result.data.boletimAlunos).toHaveLength(7);
      expect(result.data.nomeEscola).toBe('ECI Escola Exemplo');
    });

    it('throws SiageParseError for invalid payload', () => {
      expect(() => parseBoletimResponse({ success: true, data: {} })).toThrow(SiageParseError);
    });

    it('throws SiageParseError for completely wrong shape', () => {
      expect(() => parseBoletimResponse('not json')).toThrow(SiageParseError);
    });

    it('throws SiageParseError for missing boletimAlunos', () => {
      expect(() => parseBoletimResponse({
        success: true,
        data: { quantidadeAlunos: 0, quantidadeRemanejados: 0, nomeEscola: 'X', chartData: [] },
      })).toThrow(SiageParseError);
    });
  });

  describe('getGradeForPeriod', () => {
    const aluno = fixture.data.boletimAlunos[1] as SiageRawBoletimAluno;

    it('returns periodo1 value', () => {
      expect(getGradeForPeriod(aluno, 1)).toBe(3.7);
    });

    it('returns null for empty periods', () => {
      expect(getGradeForPeriod(aluno, 2)).toBeNull();
      expect(getGradeForPeriod(aluno, 3)).toBeNull();
      expect(getGradeForPeriod(aluno, 4)).toBeNull();
    });

    it('returns null for remanejado student', () => {
      const remanejado = fixture.data.boletimAlunos[0] as SiageRawBoletimAluno;
      expect(getGradeForPeriod(remanejado, 1)).toBeNull();
    });
  });

  describe('getDetailedGradesForPeriod', () => {
    it('returns detailed sub-grades for periodo1', () => {
      const aluno = fixture.data.boletimAlunos[1] as SiageRawBoletimAluno;
      const notas = getDetailedGradesForPeriod(aluno, 1);
      expect(notas).toEqual([3.0, 3.0, 5.0, 3.0, 3.0, null, null]);
    });

    it('returns all nulls for remanejado student', () => {
      const remanejado = fixture.data.boletimAlunos[0] as SiageRawBoletimAluno;
      const notas = getDetailedGradesForPeriod(remanejado, 1);
      expect(notas.every(n => n === null)).toBe(true);
    });

    it('returns partial grades correctly', () => {
      const partial = fixture.data.boletimAlunos[5] as SiageRawBoletimAluno;
      const notas = getDetailedGradesForPeriod(partial, 1);
      expect(notas).toEqual([6.0, 6.0, 1.5, null, null, null, null]);
    });
  });

  describe('normalizeAluno', () => {
    it('normalizes cursando student with nota', () => {
      const aluno = fixture.data.boletimAlunos[1] as SiageRawBoletimAluno;
      const result = normalizeAluno(aluno, 1);
      expect(result.nome).toBe('ALUNO CURSANDO COM NOTA');
      expect(result.situacao).toBe('Cursando');
      expect(result.frequencia).toBe('Frequente');
      expect(result.notaPeriodo).toBe(3.7);
      expect(result.targetPeriod).toBe(1);
      expect(result.isRemanejado).toBe(false);
      expect(result.isIngressante).toBe(false);
    });

    it('normalizes remanejado student', () => {
      const aluno = fixture.data.boletimAlunos[0] as SiageRawBoletimAluno;
      const result = normalizeAluno(aluno, 1);
      expect(result.nome).toBe('ALUNO REMANEJADO UM');
      expect(result.situacao).toBe('Remanejado');
      expect(result.frequencia).toBe('-');
      expect(result.notaPeriodo).toBeNull();
      expect(result.isRemanejado).toBe(true);
    });

    it('normalizes ingressante without nota', () => {
      const aluno = fixture.data.boletimAlunos[3] as SiageRawBoletimAluno;
      const result = normalizeAluno(aluno, 1);
      expect(result.isIngressante).toBe(true);
      expect(result.notaPeriodo).toBeNull();
      expect(result.dataIngresso).toBe('2026-02-10T03:00:00');
    });

    it('normalizes ingressante with nota', () => {
      const aluno = fixture.data.boletimAlunos[6] as SiageRawBoletimAluno;
      const result = normalizeAluno(aluno, 1);
      expect(result.isIngressante).toBe(true);
      expect(result.notaPeriodo).toBe(6.0);
      expect(result.dataIngresso).toBe('2026-03-18T03:00:00');
    });

    it('normalizes infrequente student', () => {
      const aluno = fixture.data.boletimAlunos[2] as SiageRawBoletimAluno;
      const result = normalizeAluno(aluno, 1);
      expect(result.frequencia).toBe('Infrequente');
      expect(result.notaPeriodo).toBe(2.0);
    });

    it('trims whitespace from nome', () => {
      const aluno = {
        ...fixture.data.boletimAlunos[1],
        nome: '  ALUNO COM ESPAÇOS  ',
      } as SiageRawBoletimAluno;
      const result = normalizeAluno(aluno, 1);
      expect(result.nome).toBe('ALUNO COM ESPAÇOS');
    });

    it('handles targetPeriod 2 correctly', () => {
      const aluno = fixture.data.boletimAlunos[1] as SiageRawBoletimAluno;
      const result = normalizeAluno(aluno, 2);
      expect(result.targetPeriod).toBe(2);
      expect(result.notaPeriodo).toBeNull();
    });
  });

  describe('parseAndNormalizeBoletim', () => {
    it('parses and normalizes full fixture for periodo1', () => {
      const result = parseAndNormalizeBoletim(fixture, 1);
      expect(result.students).toHaveLength(7);
      expect(result.meta.quantidadeAlunos).toBe(7);
      expect(result.meta.quantidadeRemanejados).toBe(1);
      expect(result.meta.nomeEscola).toBe('ECI Escola Exemplo');
    });

    it('all students have targetPeriod set', () => {
      const result = parseAndNormalizeBoletim(fixture, 1);
      for (const student of result.students) {
        expect(student.targetPeriod).toBe(1);
      }
    });

    it('correctly counts students with grades', () => {
      const result = parseAndNormalizeBoletim(fixture, 1);
      const withGrades = result.students.filter(s => s.notaPeriodo !== null);
      expect(withGrades).toHaveLength(5); // 2 nulls: remanejado + ingressante sem nota
    });

    it('throws for invalid raw payload', () => {
      expect(() => parseAndNormalizeBoletim({}, 1)).toThrow(SiageParseError);
    });
  });
});
