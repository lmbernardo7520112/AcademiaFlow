/**
 * @module @academiaflow/siage-bridge
 *
 * Anti-corruption layer for SIAGE interoperability.
 *
 * Architecture:
 * 1. XHR-FIRST: Parse boletim-curriculo and cabecario-listagem JSON responses
 * 2. DOM-SECOND: Validate boletim table structure as support/fallback
 * 3. PDF-FALLBACK: Extension point for future PDF extraction (not MVP)
 *
 * This package is intentionally isolated from Fastify, MongoDB, and BullMQ.
 * It communicates exclusively via canonical contracts from @academiaflow/shared.
 */

export const BRIDGE_VERSION = '0.2.0' as const;

// ─── Schemas ─────────────────────────────────────────────────────────────────
export {
  siageRawBoletimAlunoSchema,
  siageRawBoletimResponseSchema,
  siageRawCabecarioResponseSchema,
  type SiageRawBoletimAluno,
  type SiageRawBoletimResponse,
  type SiageRawCabecarioResponse,
} from './schemas/raw.js';

export {
  targetPeriodSchema,
  type TargetPeriod,
  BNCC_COMPONENT_TYPE,
  isBnccComponent,
  boletimHeaderSchema,
  type BoletimHeader,
  normalizedStudentRecordSchema,
  type NormalizedStudentRecord,
  extractionResultSchema,
  type ExtractionResult,
} from './schemas/normalized.js';

// ─── Parsers ─────────────────────────────────────────────────────────────────
export {
  parseBoletimResponse,
  getGradeForPeriod,
  getDetailedGradesForPeriod,
  normalizeAluno,
  parseAndNormalizeBoletim,
} from './parsers/boletim-parser.js';

export {
  parseCabecarioResponse,
  normalizeCabecario,
} from './parsers/cabecario-parser.js';

export {
  validateBoletimColumns,
  EXPECTED_BOLETIM_COLUMNS,
  type DomValidationResult,
} from './parsers/dom-validator.js';

// ─── Page Objects ────────────────────────────────────────────────────────────
export {
  SiageNavigator,
  type SiageNavigatorConfig,
  type SiageCredentials,
  type PlaywrightPageMinimal,
  type BoletimGrade,
  type ComponentScanResult,
} from './page-objects/siage-navigator.js';

export { SIAGE_SELECTORS } from './page-objects/selectors.js';

// ─── Errors ──────────────────────────────────────────────────────────────────
export {
  SiageBridgeError,
  SiageParseError,
  SiageAuthError,
  SiageNavigationError,
  SiageNonBnccError,
  SiagePdfFallbackNotImplemented,
} from './errors.js';
