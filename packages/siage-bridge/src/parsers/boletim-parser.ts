/**
 * @module parsers/boletim-parser
 * XHR-first parser: validates and parses raw SIAGE boletim-curriculo responses.
 */
import {
  siageRawBoletimResponseSchema,
  type SiageRawBoletimResponse,
  type SiageRawBoletimAluno,
} from '../schemas/raw.js';
import {
  type TargetPeriod,
  type NormalizedStudentRecord,
} from '../schemas/normalized.js';
import { SiageParseError } from '../errors.js';

/**
 * Parses and validates a raw boletim-curriculo XHR response.
 * @throws SiageParseError if the response doesn't match expected schema
 */
export function parseBoletimResponse(raw: unknown): SiageRawBoletimResponse {
  const result = siageRawBoletimResponseSchema.safeParse(raw);
  if (!result.success) {
    throw new SiageParseError(
      'boletim-curriculo',
      result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '),
    );
  }
  return result.data;
}

/**
 * Extracts the grade value for a specific period from a raw aluno record.
 */
export function getGradeForPeriod(
  aluno: SiageRawBoletimAluno,
  period: TargetPeriod,
): number | null {
  const periodMap: Record<TargetPeriod, number | null> = {
    1: aluno.periodo1,
    2: aluno.periodo2,
    3: aluno.periodo3,
    4: aluno.periodo4,
  };
  return periodMap[period];
}

/**
 * Extracts the detailed sub-grades for a specific period.
 */
export function getDetailedGradesForPeriod(
  aluno: SiageRawBoletimAluno,
  period: TargetPeriod,
): Array<number | null> {
  const periodMap: Record<TargetPeriod, Array<number | null>> = {
    1: aluno.periodo1Notas,
    2: aluno.periodo2Notas,
    3: aluno.periodo3Notas,
    4: aluno.periodo4Notas,
  };
  return periodMap[period];
}

/**
 * Normalizes a single raw SIAGE aluno into a NormalizedStudentRecord.
 */
export function normalizeAluno(
  aluno: SiageRawBoletimAluno,
  targetPeriod: TargetPeriod,
): NormalizedStudentRecord {
  return {
    nome: aluno.nome.trim(),
    matriculaSiage: aluno.matricula,
    formacaoTurmaAlunoId: aluno.formacaoTurmaAlunoId,
    situacao: aluno.situacaoAluno,
    frequencia: aluno.frequenciaAluno,
    isIngressante: aluno.isIngressante,
    isRemanejado: aluno.isRemanejado,
    dataIngresso: aluno.dataIngresso,
    notaPeriodo: getGradeForPeriod(aluno, targetPeriod),
    notasDetalhadas: getDetailedGradesForPeriod(aluno, targetPeriod),
    targetPeriod,
  };
}

/**
 * Parses a boletim-curriculo response and normalizes all students.
 */
export function parseAndNormalizeBoletim(
  raw: unknown,
  targetPeriod: TargetPeriod,
): {
  students: NormalizedStudentRecord[];
  meta: {
    quantidadeAlunos: number;
    quantidadeRemanejados: number;
    nomeEscola: string;
  };
} {
  const parsed = parseBoletimResponse(raw);
  const students = parsed.data.boletimAlunos.map(a => normalizeAluno(a, targetPeriod));

  return {
    students,
    meta: {
      quantidadeAlunos: parsed.data.quantidadeAlunos,
      quantidadeRemanejados: parsed.data.quantidadeRemanejados,
      nomeEscola: parsed.data.nomeEscola,
    },
  };
}
