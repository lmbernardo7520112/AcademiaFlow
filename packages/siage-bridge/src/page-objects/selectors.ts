/**
 * @module page-objects/selectors
 * Centralized CSS/text selectors for SIAGE pages.
 * Single place to update if SIAGE changes its DOM structure.
 */

export const SIAGE_SELECTORS = {
  // ─── Login Page ──────────────────────────────────────────────────────────────
  login: {
    /** Username input */
    usernameInput: 'input[name="username"], input[type="text"]',
    /** Password input */
    passwordInput: 'input[name="password"], input[type="password"]',
    /** Login submit button */
    submitButton: 'button[type="submit"], input[type="submit"]',
    /** Error message after failed login */
    errorMessage: '.error-message, .alert-danger, [role="alert"]',
  },

  // ─── Navigation ──────────────────────────────────────────────────────────────
  navigation: {
    /** Year selection dropdown/selector */
    yearSelector: 'select[name*="ano"], [data-testid="year-selector"]',
    /** "Minhas Turmas" or "Coordenação Pedagógica" menu links */
    minhasTurmasLink: 'a:has-text("Minhas Turmas"), a:has-text("Coordenação Pedagógica")',
    /** Turma row/card in the list */
    turmaItem: (turmaName: string) => `text="${turmaName}"`,
    /** Component/discipline item */
    componenteItem: (componenteName: string) => `text="${componenteName}"`,
  },

  // ─── Boletim Page ────────────────────────────────────────────────────────────
  boletim: {
    /** The main boletim table */
    table: 'table',
    /** Table header cells */
    tableHeaders: 'table thead th, table thead td',
    /** Table body rows (students) */
    tableRows: 'table tbody tr',
    /** Export/PDF button */
    exportButton: 'button:has-text("Exportar"), button:has-text("PDF"), button:has-text("Imprimir")',
    /** Boletim tab/link */
    boletimTab: 'a:has-text("Boletim"), button:has-text("Boletim"), [role="tab"]:has-text("Boletim")',
  },
} as const;
