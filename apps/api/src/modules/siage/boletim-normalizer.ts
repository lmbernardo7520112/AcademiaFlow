/**
 * @module boletim-normalizer
 * Transforms a ParsedBoletim into ExtractedRecord[] compatible with the
 * existing SIAGE ingest pipeline (SiageRunItem.source shape).
 */
import type { ParsedBoletim, BoletimStudentRow } from './boletim-pdf-parser.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ExtractedRecord {
  alunoName: string;
  /** Normalized from PDF — always empty string for PDF imports */
  matriculaSiage: string;
  disciplinaName: string;
  turmaName: string;
  bimester: number;
  value: number | null;
}

export interface NormalizationResult {
  records: ExtractedRecord[];
  skipped: { studentName: string; reason: 'REMANEJADO' | 'NO_GRADE' }[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extract the turma short name from the full etapa string.
 * "Ensino Médio - 1ª Série A" → "1ª Série A"
 */
export function extractTurmaShortName(turmaEtapa: string): string {
  const match = turmaEtapa.match(/\d+ª?\s*Série\s*\w+/i);
  if (match) return match[0].trim();
  // Fallback: strip "Ensino Médio - " prefix
  const dashIdx = turmaEtapa.indexOf(' - ');
  return dashIdx >= 0 ? turmaEtapa.slice(dashIdx + 3).trim() : turmaEtapa.trim();
}

/**
 * Get the grade value for a specific bimester from a student row.
 */
function getGradeForBimester(row: BoletimStudentRow, bimester: number): number | null {
  switch (bimester) {
    case 1: return row.bimester1;
    case 2: return row.bimester2;
    case 3: return row.bimester3;
    case 4: return row.bimester4;
    default: return null;
  }
}

// ─── Main entry point ────────────────────────────────────────────────────────

/**
 * Normalize a parsed boletim into ExtractedRecord[] for the target bimester.
 *
 * Rules:
 * - Remanejado students are skipped (tracked in result.skipped)
 * - Students with null grade for the target bimester are skipped
 * - `-` was already parsed as null by the PDF parser
 */
export function normalizeBoletimToRecords(
  parsed: ParsedBoletim,
  targetBimester: number,
): NormalizationResult {
  const turmaName = extractTurmaShortName(parsed.header.turmaEtapa);
  const disciplinaName = parsed.header.componenteCurricular;
  const records: ExtractedRecord[] = [];
  const skipped: NormalizationResult['skipped'] = [];

  for (const student of parsed.students) {
    // Skip transferred students
    if (student.situation === 'Remanejado') {
      skipped.push({ studentName: student.studentName, reason: 'REMANEJADO' });
      continue;
    }

    const value = getGradeForBimester(student, targetBimester);

    // Skip students without a grade for the target bimester
    if (value === null) {
      skipped.push({ studentName: student.studentName, reason: 'NO_GRADE' });
      continue;
    }

    records.push({
      alunoName: student.studentName,
      matriculaSiage: '',
      disciplinaName,
      turmaName,
      bimester: targetBimester,
      value,
    });
  }

  return { records, skipped };
}
