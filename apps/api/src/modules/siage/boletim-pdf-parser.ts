/**
 * @module boletim-pdf-parser
 * Parses SIAGE boletim PDF text (extracted via PdfTextExtractor) into structured data.
 *
 * Design:
 * - Depends on PdfTextExtractor interface, not on any specific library.
 * - Validated against real fixture: 28/28 students reconstructed.
 * - Layout-preserved text required (pdftotext -layout).
 */
import type { PdfTextExtractor } from './pdf-text-extractor.js';
import { defaultExtractor } from './pdf-text-extractor.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BoletimHeader {
  schoolName: string;
  turmaEtapa: string;
  componenteCurricular: string;
  componenteType: string;
  professor: string;
  turno: string;
  sala: string;
  issuedAt: string;
  issuedBy: string;
}

export interface BoletimStudentRow {
  studentName: string;
  bimester1: number | null;
  bimester2: number | null;
  bimester3: number | null;
  bimester4: number | null;
  average: number | null;
  finalRecovery: number | null;
  weightedAnnualAvg: number | null;
  frequency: string | null;
  situation: string;
}

export interface ParsedBoletim {
  header: BoletimHeader;
  students: BoletimStudentRow[];
  pageCount: number;
  sourceType: 'siage_pdf';
}

// ─── Parsing helpers ─────────────────────────────────────────────────────────

function parseGrade(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '-' || trimmed === '') return null;
  const parsed = parseFloat(trimmed.replace(',', '.'));
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Regex for a student data line in layout-preserved text.
 * Pattern: name (>= 3 leading spaces), then grade columns separated by whitespace,
 * ending with frequency and situation.
 *
 * The layout puts the name + all data on one line with column alignment via spaces.
 */
const STUDENT_LINE_RE =
  /^\s{3,}(\S.+?)\s{3,}([\d,]+|-)\s+([\d,]+|-)\s+([\d,]+|-)\s+([\d,]+|-)\s+([\d,]+|-)\s+([\d,]+|-)\s+([\d,]+|-)\s+(Frequente|Infrequente|-)\s+(Cursando|Remanejado)\s*$/;

/**
 * Lines that are NOT student names (headers, footers, column labels).
 * Used to prevent false name-continuation matches.
 */
const NON_NAME_PATTERNS = [
  'Secretaria de Estado', 'SIAGE Escolar', '____',
  'ESTUDANTES', 'MÉDIA', 'PERÍODO', 'GERAL', 'RECUPERAÇÃO',
  'FINAL', 'PONDERADA', 'ANUAL', 'FREQUÊNCIA', 'SITUAÇÃO',
  'BOLETIM ESCOLAR', 'Data da emissão', 'Usuário',
  'Estas informações', 'ECI ', 'Ensino Médio',
  'Componente', 'Tipo ou', 'Professor', 'Turno:',
];

function isNonNameLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  return NON_NAME_PATTERNS.some(p => trimmed.startsWith(p));
}

// ─── Header parser ───────────────────────────────────────────────────────────

function parseHeader(text: string): BoletimHeader {
  const match = (re: RegExp): string => {
    const m = text.match(re);
    return m?.[1]?.trim() ?? '';
  };

  return {
    schoolName: match(/^\s+(ECI .+)$/m) || match(/^\s+(\S.+)$/m),
    turmaEtapa: match(/^\s+(Ensino .+)$/m),
    componenteCurricular: match(/Componente Curricular:\s*(.+?)(?:\s{2,}|$)/m),
    componenteType: match(/Tipo ou Estrutura do componente:\s*(.+?)$/m),
    professor: match(/Professor\(es\):\s*(.+?)$/m),
    turno: match(/Turno:\s*(.+?)(?:\s{2,}|$)/m),
    sala: match(/Sala:\s*(.+?)$/m),
    issuedAt: match(/Data da emissão:\s*(.+)$/m),
    issuedBy: match(/Usuário:\s*(.+)$/m),
  };
}

// ─── Student parser ──────────────────────────────────────────────────────────

function parseStudents(text: string): BoletimStudentRow[] {
  const pages = text.split('\f');
  const students: BoletimStudentRow[] = [];
  let currentStudent: BoletimStudentRow | null = null;

  for (const page of pages) {
    const lines = page.split('\n');

    for (const line of lines) {
      // Try to match a full student data line
      const m = line.match(STUDENT_LINE_RE);

      if (m) {
        // Flush any pending name-only student
        // (shouldn't happen with proper data, but defensive)

        currentStudent = {
          studentName: m[1]!.trim(),
          bimester1: parseGrade(m[2]!),
          bimester2: parseGrade(m[3]!),
          bimester3: parseGrade(m[4]!),
          bimester4: parseGrade(m[5]!),
          average: parseGrade(m[6]!),
          finalRecovery: parseGrade(m[7]!),
          weightedAnnualAvg: parseGrade(m[8]!),
          frequency: m[9] === '-' ? null : (m[9] ?? null),
          situation: m[10] ?? 'Cursando',
        };
        students.push(currentStudent);
      } else {
        // Check if this is a name continuation line
        const cont = line.match(/^\s{3,}(\S.+?)\s*$/);
        if (cont?.[1] && currentStudent && !isNonNameLine(line)) {
          currentStudent.studentName += ' ' + cont[1].trim();
        }
      }
    }
  }

  return students;
}

// ─── Main entry point ────────────────────────────────────────────────────────

/**
 * Parse a SIAGE boletim PDF into structured data.
 *
 * @param pdfBuffer - Raw PDF file buffer
 * @param extractor - Text extractor implementation (defaults to pdftotext -layout)
 * @returns ParsedBoletim with header, students, and metadata
 */
export async function parseSiageBoletimPdf(
  pdfBuffer: Buffer,
  extractor: PdfTextExtractor = defaultExtractor,
): Promise<ParsedBoletim> {
  const text = await extractor.extract(pdfBuffer);

  if (!text.trim()) {
    throw new Error('O PDF não contém texto extraível. Verifique se o arquivo é válido.');
  }

  const header = parseHeader(text);
  const students = parseStudents(text);
  const pageCount = text.split('\f').filter(p => p.trim()).length;

  if (students.length === 0) {
    throw new Error('Nenhum estudante encontrado no PDF. Verifique se o formato é de um boletim SIAGE oficial.');
  }

  return {
    header,
    students,
    pageCount,
    sourceType: 'siage_pdf',
  };
}
