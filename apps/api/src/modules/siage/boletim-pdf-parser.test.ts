/**
 * @module boletim-pdf-parser.test
 * Tests for the SIAGE boletim PDF parser + normalizer using the real fixture.
 *
 * Fixture: boletim_biologia_1a_serie_a.pdf (28 students, 4 pages)
 * Benchmark: pdftotext -layout = 28/28 ✅
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSiageBoletimPdf } from './boletim-pdf-parser.js';
import { normalizeBoletimToRecords, extractTurmaShortName } from './boletim-normalizer.js';
import {
  LayoutPdfTextExtractor,
  assertPdfTextExtractorAvailable,
  PdfTextExtractorUnavailableError,
} from './pdf-text-extractor.js';
import type { PdfTextExtractor } from './pdf-text-extractor.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PDF = resolve(__dirname, '__fixtures__/boletim_biologia_1a_serie_a.pdf');
const FIXTURE_TXT = resolve(__dirname, '__fixtures__/boletim_biologia_1a_serie_a.txt');

// ─── Extractor tests ─────────────────────────────────────────────────────────

describe('PdfTextExtractor', () => {
  describe('assertPdfTextExtractorAvailable', () => {
    it('should resolve when pdftotext is available', async () => {
      await expect(assertPdfTextExtractorAvailable()).resolves.toBeUndefined();
    });
  });

  describe('LayoutPdfTextExtractor', () => {
    it('should extract text from the real SIAGE fixture', async () => {
      const extractor = new LayoutPdfTextExtractor();
      const buffer = readFileSync(FIXTURE_PDF);
      const text = await extractor.extract(buffer);

      expect(text.length).toBeGreaterThan(5000);
      expect(text).toContain('ECI Luís Ramalho');
      expect(text).toContain('Biologia');
      expect(text).toContain('Ana Julia');
    });
  });

  describe('PdfTextExtractorUnavailableError', () => {
    it('should have correct error code', () => {
      const err = new PdfTextExtractorUnavailableError('test');
      expect(err.code).toBe('PDF_TEXT_EXTRACTOR_UNAVAILABLE');
      expect(err.message).toContain('poppler-utils');
      expect(err.message).toContain('test');
    });
  });
});

// ─── Parser tests (with real fixture) ────────────────────────────────────────

describe('parseSiageBoletimPdf', () => {
  // Use pre-extracted text as a mock extractor for fast, deterministic tests
  const fixtureText = readFileSync(FIXTURE_TXT, 'utf-8');
  const mockExtractor: PdfTextExtractor = {
    extract: async () => fixtureText,
  };

  it('should parse header correctly from real fixture', async () => {
    const result = await parseSiageBoletimPdf(Buffer.from('mock'), mockExtractor);

    expect(result.header.schoolName).toBe('ECI Luís Ramalho');
    expect(result.header.turmaEtapa).toBe('Ensino Médio - 1ª Série A');
    expect(result.header.componenteCurricular).toBe('Biologia');
    expect(result.header.componenteType).toBe('Formação Geral Básica');
    expect(result.header.professor).toBe('JONAS EMANUEL GUIMARAES DA SILVA');
    expect(result.header.turno).toBe('Integral');
    expect(result.header.sala).toBe('SALA 01');
    expect(result.header.issuedAt).toContain('24/04/2026');
    expect(result.header.issuedBy).toBe('Apolônia Maia dos Santos');
  });

  it('should extract exactly 28 students from real fixture', async () => {
    const result = await parseSiageBoletimPdf(Buffer.from('mock'), mockExtractor);
    expect(result.students).toHaveLength(28);
  });

  it('should set pageCount and sourceType', async () => {
    const result = await parseSiageBoletimPdf(Buffer.from('mock'), mockExtractor);
    expect(result.pageCount).toBe(4);
    expect(result.sourceType).toBe('siage_pdf');
  });

  it('should reassemble multi-line names correctly', async () => {
    const result = await parseSiageBoletimPdf(Buffer.from('mock'), mockExtractor);
    const names = result.students.map(s => s.studentName);

    // 4-line name
    expect(names).toContain('ADRIELLY DOS SANTOS RODRIGUES LOPES');
    // 3-line name
    expect(names).toContain('Ana Paula Nascimento da Silva Dias');
    // 4-line name
    expect(names).toContain('MARIA ESTER SOARES MOREIRA');
  });

  it('should parse grades with comma decimal correctly', async () => {
    const result = await parseSiageBoletimPdf(Buffer.from('mock'), mockExtractor);
    const anaJulia = result.students.find(s => s.studentName.includes('Ana Julia'));

    expect(anaJulia).toBeDefined();
    expect(anaJulia!.bimester1).toBe(3.7);
  });

  it('should parse "-" as null', async () => {
    const result = await parseSiageBoletimPdf(Buffer.from('mock'), mockExtractor);
    const anaJulia = result.students.find(s => s.studentName.includes('Ana Julia'));

    expect(anaJulia!.bimester2).toBeNull();
    expect(anaJulia!.bimester3).toBeNull();
    expect(anaJulia!.bimester4).toBeNull();
  });

  it('should identify Remanejado students', async () => {
    const result = await parseSiageBoletimPdf(Buffer.from('mock'), mockExtractor);
    const remanejados = result.students.filter(s => s.situation === 'Remanejado');

    expect(remanejados.length).toBe(4);
    expect(remanejados.map(r => r.studentName)).toContain('ADRIELLY DOS SANTOS RODRIGUES LOPES');
  });

  it('should parse the critical edge case: Laylla Beatriz (page 3, Remanejado)', async () => {
    const result = await parseSiageBoletimPdf(Buffer.from('mock'), mockExtractor);
    const laylla = result.students.find(s => s.studentName.includes('Laylla'));

    expect(laylla).toBeDefined();
    expect(laylla!.situation).toBe('Remanejado');
    expect(laylla!.bimester1).toBeNull();
  });

  it('should parse the critical edge case: Kalebe de Souza Gomes (page break)', async () => {
    const result = await parseSiageBoletimPdf(Buffer.from('mock'), mockExtractor);
    const kalebe = result.students.find(s => s.studentName.includes('Kalebe'));

    expect(kalebe).toBeDefined();
    expect(kalebe!.bimester1).toBe(4.5);
    expect(kalebe!.frequency).toBe('Frequente');
  });

  it('should parse frequency correctly (Frequente / Infrequente)', async () => {
    const result = await parseSiageBoletimPdf(Buffer.from('mock'), mockExtractor);

    const frequentes = result.students.filter(s => s.frequency === 'Frequente');
    const infrequentes = result.students.filter(s => s.frequency === 'Infrequente');

    expect(frequentes.length).toBeGreaterThan(15);
    expect(infrequentes.length).toBeGreaterThanOrEqual(3);
  });

  it('should throw on empty PDF text', async () => {
    const emptyExtractor: PdfTextExtractor = { extract: async () => '' };
    await expect(parseSiageBoletimPdf(Buffer.from('mock'), emptyExtractor))
      .rejects.toThrow('não contém texto');
  });

  it('should throw on PDF with no students', async () => {
    const noStudents: PdfTextExtractor = { extract: async () => 'ECI School\nsome text' };
    await expect(parseSiageBoletimPdf(Buffer.from('mock'), noStudents))
      .rejects.toThrow('Nenhum estudante');
  });

  // ── Integration: real extractor + real PDF ──
  it('should parse real PDF end-to-end (integration)', async () => {
    const buffer = readFileSync(FIXTURE_PDF);
    const result = await parseSiageBoletimPdf(buffer);

    expect(result.students).toHaveLength(28);
    expect(result.header.schoolName).toBe('ECI Luís Ramalho');
    expect(result.header.componenteCurricular).toBe('Biologia');
  });
});

// ─── Normalizer tests ────────────────────────────────────────────────────────

describe('normalizeBoletimToRecords', () => {
  const fixtureText = readFileSync(FIXTURE_TXT, 'utf-8');
  const mockExtractor: PdfTextExtractor = { extract: async () => fixtureText };

  it('should generate records for bimester 1, skipping Remanejado and null grades', async () => {
    const parsed = await parseSiageBoletimPdf(Buffer.from('mock'), mockExtractor);
    const { records, skipped } = normalizeBoletimToRecords(parsed, 1);

    // 28 total - 4 Remanejado - students with null bim1
    expect(records.length).toBeGreaterThan(15);
    expect(records.every(r => r.value !== null)).toBe(true);
    expect(records.every(r => r.bimester === 1)).toBe(true);
    expect(records.every(r => r.disciplinaName === 'Biologia')).toBe(true);

    // Remanejados should be in skipped
    const remanejados = skipped.filter(s => s.reason === 'REMANEJADO');
    expect(remanejados).toHaveLength(4);
  });

  it('should set turmaName from header', async () => {
    const parsed = await parseSiageBoletimPdf(Buffer.from('mock'), mockExtractor);
    const { records } = normalizeBoletimToRecords(parsed, 1);

    expect(records[0].turmaName).toBe('1ª Série A');
  });

  it('should set matriculaSiage as empty string for PDF imports', async () => {
    const parsed = await parseSiageBoletimPdf(Buffer.from('mock'), mockExtractor);
    const { records } = normalizeBoletimToRecords(parsed, 1);

    expect(records.every(r => r.matriculaSiage === '')).toBe(true);
  });
});

// ─── turma name extraction ───────────────────────────────────────────────────

describe('extractTurmaShortName', () => {
  it('should extract "1ª Série A" from "Ensino Médio - 1ª Série A"', () => {
    expect(extractTurmaShortName('Ensino Médio - 1ª Série A')).toBe('1ª Série A');
  });

  it('should extract "2ª Série B" from "Ensino Médio - 2ª Série B"', () => {
    expect(extractTurmaShortName('Ensino Médio - 2ª Série B')).toBe('2ª Série B');
  });

  it('should handle fallback for unknown format', () => {
    expect(extractTurmaShortName('Some Other Format')).toBe('Some Other Format');
  });
});
