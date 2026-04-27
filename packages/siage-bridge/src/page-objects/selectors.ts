/**
 * @module page-objects/selectors
 * Centralized CSS/text selectors for SIAGE pages.
 * Single place to update if SIAGE changes its DOM structure.
 *
 * Source of truth: real DOM of escola.see.pb.gov.br (April 2026).
 */

export const SIAGE_SELECTORS = {
  // ─── Login Page ──────────────────────────────────────────────────────────────
  login: {
    /** Username/CPF input — Angular reactive form with placeholder */
    usernameInput: 'input[placeholder="CPF"], input[formcontrolname="cpf"], input[name="username"], input[type="text"]',
    /** Password input */
    passwordInput: 'input[placeholder="Senha"], input[formcontrolname="password"], input[name="password"], input[type="password"]',
    /** Login submit button */
    submitButton: 'button:has-text("ACESSAR"), button:has-text("Acessar"), button[type="submit"]',
    /** Error message after failed login */
    errorMessage: '.error-message, .alert-danger, .is-invalid, [role="alert"]',
  },

  // ─── Post-Login Navigation ─────────────────────────────────────────────────
  navigation: {
    /** "Minhas Turmas" link in the horizontal nav bar */
    minhasTurmasLink: 'a:has-text("Minhas Turmas")',
    /** "Acessar" link for Coordenação Pedagógica — using href to avoid ambiguity */
    coordPedagogicaAccessBtn: 'a[href*="coordenacao-pedagogica"]',
  },

  // ─── Turma Table (Coord. Pedagógica) ───────────────────────────────────────
  turmaTable: {
    /** The main turma listing table */
    table: 'table',
    /** Header row to locate the TURMA column */
    headerCells: 'table thead th',
    /** All body rows */
    bodyRows: 'table tbody tr',
    /** "Analisar Turma" button — stable ID from real DOM */
    analisarTurmaBtn: '#btn-analisar-turma',
  },

  // ─── Componente Curricular Table (inside turma analysis) ───────────────────
  componenteTable: {
    /** The component listing table */
    table: 'table',
    /** Header cells to locate COMPONENTE CURRICULAR column */
    headerCells: 'table thead th',
    /** All body rows */
    bodyRows: 'table tbody tr',
    /** "Gestão do Diário" button — stable ID from real DOM */
    visualizarBtn: '#btn-visualizar',
  },

  // ─── Boletim Page ────────────────────────────────────────────────────────────
  boletim: {
    /** Boletim Escolar tab/link */
    boletimTab: 'a[href*="/boletim"]:has-text("Boletim"), a:has-text("Boletim Escolar")',
    /** The main boletim table */
    table: 'table',
    /** Table header cells */
    tableHeaders: 'table thead th, table thead td',
    /** Table body rows (students) */
    tableRows: 'table tbody tr',
  },
} as const;
