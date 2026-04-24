/**
 * @module parsers/cabecario-parser
 * Parses the get-cabecario-listagem XHR response into a BoletimHeader.
 */
import {
  siageRawCabecarioResponseSchema,
  type SiageRawCabecarioResponse,
} from '../schemas/raw.js';
import {
  type BoletimHeader,
  isBnccComponent,
} from '../schemas/normalized.js';
import { SiageParseError, SiageNonBnccError } from '../errors.js';

/**
 * Parses and validates a raw get-cabecario-listagem response.
 * @throws SiageParseError if the response doesn't match expected schema
 */
export function parseCabecarioResponse(raw: unknown): SiageRawCabecarioResponse {
  const result = siageRawCabecarioResponseSchema.safeParse(raw);
  if (!result.success) {
    throw new SiageParseError(
      'get-cabecario-listagem',
      result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '),
    );
  }
  return result.data;
}

/**
 * Normalizes a cabecario response into a BoletimHeader.
 * @throws SiageNonBnccError if the component is not BNCC (when enforced)
 */
export function normalizeCabecario(
  raw: unknown,
  options: { enforceBncc?: boolean } = {},
): BoletimHeader {
  const parsed = parseCabecarioResponse(raw);
  const { data } = parsed;
  const isBncc = isBnccComponent(data.tipoEstruturaComponente);

  if (options.enforceBncc && !isBncc) {
    throw new SiageNonBnccError(
      data.componenteCurricular,
      data.tipoEstruturaComponente,
    );
  }

  return {
    escolaId: data.escolaId,
    turmaEtapa: data.turmaEtapa,
    componenteCurricular: data.componenteCurricular,
    turno: data.turno,
    sala: data.sala,
    tipoEstruturaComponente: data.tipoEstruturaComponente,
    isBncc,
    professores: data.professores.map(p => ({
      nome: p.nome,
      matricula: p.matricula,
    })),
  };
}
