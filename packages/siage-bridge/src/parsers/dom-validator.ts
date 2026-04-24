/**
 * @module parsers/dom-validator
 * DOM-second support: validates the boletim table structure in the SIAGE page.
 * Used as a structural verification and potential fallback, NOT as primary data source.
 *
 * These functions work with Playwright's Page/Locator API but are designed
 * to be testable with minimal mocking.
 */

/** Expected column headers in the SIAGE boletim table */
export const EXPECTED_BOLETIM_COLUMNS = [
  'ESTUDANTES',
  'MÉDIA DO 1º PERÍODO',
  'MÉDIA DO 2º PERÍODO',
  'MÉDIA DO 3º PERÍODO',
  'MÉDIA DO 4º PERÍODO',
  'FREQUÊNCIA',
  'SITUAÇÃO',
  'AÇÕES',
] as const;

export type BoletimColumnName = (typeof EXPECTED_BOLETIM_COLUMNS)[number];

/**
 * Describes the result of a DOM structural validation.
 */
export interface DomValidationResult {
  /** Whether the table was found at all */
  tableFound: boolean;
  /** Which expected columns were found */
  columnsFound: string[];
  /** Which expected columns are missing */
  columnsMissing: string[];
  /** Number of data rows (students) found */
  rowCount: number;
  /** Whether the structure is considered valid for fallback use */
  isValid: boolean;
}

/**
 * Validates column headers from an array of header text strings.
 * Can be used with text extracted via Playwright:
 *   const headers = await page.locator('table thead th').allTextContents();
 *   const result = validateBoletimColumns(headers);
 */
export function validateBoletimColumns(
  headerTexts: string[],
): Pick<DomValidationResult, 'columnsFound' | 'columnsMissing' | 'isValid'> {
  const normalizedHeaders = headerTexts.map(h => h.trim().toUpperCase());

  const columnsFound: string[] = [];
  const columnsMissing: string[] = [];

  for (const expected of EXPECTED_BOLETIM_COLUMNS) {
    if (normalizedHeaders.some(h => h.includes(expected))) {
      columnsFound.push(expected);
    } else {
      columnsMissing.push(expected);
    }
  }

  // Valid if at least ESTUDANTES + one PERÍODO column are present
  const hasStudents = columnsFound.includes('ESTUDANTES');
  const hasPeriod = columnsFound.some(c => c.includes('PERÍODO'));

  return {
    columnsFound,
    columnsMissing,
    isValid: hasStudents && hasPeriod,
  };
}
