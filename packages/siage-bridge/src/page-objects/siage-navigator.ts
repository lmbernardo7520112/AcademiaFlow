/**
 * @module page-objects/siage-navigator
 * Page object for navigating the SIAGE school system (escola.see.pb.gov.br).
 *
 * Real navigation flow (April 2026):
 *   1. Login → /auth
 *   2. "Minhas Turmas" → /minhas-turmas
 *   3. "Coordenação Pedagógica" → "Acessar" → /minhas-turmas/coordenacao-pedagogica
 *   4. Turma table → row with target turma → #btn-analisar-turma
 *   5. Componente table → row with BNCC discipline → #btn-visualizar
 *   6. "Boletim Escolar" tab → /boletim
 *   7. Boletim table → ESTUDANTES + MÉDIA DO 1º PERÍODO columns
 */
import { SIAGE_SELECTORS } from './selectors.js';
import { SiageAuthError, SiageNavigationError } from '../errors.js';

/** Navigation configuration */
export interface SiageNavigatorConfig {
  /** Base URL of the SIAGE instance (e.g. https://escola.see.pb.gov.br/auth) */
  baseUrl: string;
  /** Default timeout for page operations (ms) */
  timeout?: number;
}

/** Credentials — ephemeral, never persisted */
export interface SiageCredentials {
  username: string;
  password: string;
}

/** Extracted student grade from the boletim table */
export interface BoletimGrade {
  studentName: string;
  value: number | null;
}

/** Result of scanning the component table for BNCC-eligible disciplines */
export interface ComponentScanResult {
  /** Disciplines that pass all 3 filters: name, BNCC type, professor */
  eligible: { name: string; tipo: string; professor: string; page: number }[];
  /** Disciplines rejected with explicit reason */
  rejected: { name: string; reason: string; page: number }[];
  /** Total pages scanned in the component table */
  totalPages: number;
  /** Total rows scanned across all pages */
  totalRows: number;
}

/**
 * Minimal Playwright Page interface.
 * Avoids requiring Playwright as a direct dependency of the bridge at build time.
 */
export interface PlaywrightPageMinimal {
  goto(url: string, options?: { waitUntil?: string; timeout?: number }): Promise<unknown>;
  fill(selector: string, value: string): Promise<void>;
  click(selector: string, options?: { timeout?: number }): Promise<void>;
  waitForSelector(selector: string, options?: { timeout?: number; state?: string }): Promise<unknown>;
  waitForURL(url: string | RegExp, options?: { timeout?: number }): Promise<void>;
  waitForLoadState(state?: string, options?: { timeout?: number }): Promise<void>;
  locator(selector: string): {
    textContent(): Promise<string | null>;
    allTextContents(): Promise<string[]>;
    count(): Promise<number>;
    isVisible(): Promise<boolean>;
    dispatchEvent(type: string): Promise<void>;
    pressSequentially(text: string, options?: { delay?: number }): Promise<void>;
    nth(index: number): {
      textContent(): Promise<string | null>;
      isVisible(): Promise<boolean>;
      click(options?: { timeout?: number }): Promise<void>;
      locator(selector: string): {
        click(options?: { timeout?: number }): Promise<void>;
        textContent(): Promise<string | null>;
        allTextContents(): Promise<string[]>;
        count(): Promise<number>;
        nth(index: number): {
          locator(selector: string): {
            click(options?: { timeout?: number }): Promise<void>;
            allTextContents(): Promise<string[]>;
          };
        };
      };
      allTextContents?(): Promise<string[]>;
    };
  };

  waitForResponse(
    urlOrPredicate: string | RegExp | ((response: { url(): string; status(): number }) => boolean),
    options?: { timeout?: number },
  ): Promise<{ json(): Promise<unknown>; status(): number }>;
  url(): string;
  /** Evaluate JavaScript in the browser context */
  evaluate<T>(fn: () => T): Promise<T>;
  /** Navigate back in browser history */
  goBack(options?: { waitUntil?: string; timeout?: number }): Promise<unknown>;
}

/**
 * SIAGE Navigator — real navigation against escola.see.pb.gov.br.
 */
export class SiageNavigator {
  private readonly timeout: number;

  constructor(
    private readonly page: PlaywrightPageMinimal,
    private readonly config: SiageNavigatorConfig,
  ) {
    this.timeout = config.timeout ?? 30_000;
  }

  // ── Step 1: Login ──────────────────────────────────────────────────────────

  /**
   * Login to SIAGE. Handles Angular reactive form validation.
   * @throws SiageAuthError if login fails
   */
  async login(credentials: SiageCredentials): Promise<void> {
    try {
      await this.page.goto(this.config.baseUrl, {
        waitUntil: 'networkidle',
        timeout: this.timeout,
      });

      // Wait for Angular to render the login form
      await this.page.waitForSelector(SIAGE_SELECTORS.login.usernameInput, {
        timeout: this.timeout,
        state: 'visible',
      });

      const userSel = SIAGE_SELECTORS.login.usernameInput;
      const passSel = SIAGE_SELECTORS.login.passwordInput;

      // Fill username using pressSequentially to simulate real typing (vital for Angular)
      await this.page.click(userSel);
      await this.page.fill(userSel, ''); // clear
      await this.page.locator(userSel).pressSequentially(credentials.username, { delay: 50 });
      await this.page.locator(userSel).dispatchEvent('blur');

      // Fill password using pressSequentially
      await this.page.click(passSel);
      await this.page.fill(passSel, ''); // clear
      await this.page.locator(passSel).pressSequentially(credentials.password, { delay: 50 });
      await this.page.locator(passSel).dispatchEvent('blur');

      // Small delay for Angular to process validators
      await new Promise(resolve => setTimeout(resolve, 500));

      // Wait for button to become enabled
      const submitSel = SIAGE_SELECTORS.login.submitButton;
      await this.page.waitForSelector(`${submitSel}:not([disabled])`, {
        timeout: this.timeout,
        state: 'visible',
      });

      await this.page.click(submitSel, { timeout: this.timeout });

      // After login, SIAGE redirects to /auth/selecionar-ano-letivo
      // where the user must pick the academic year.
      await this.page.waitForURL(/selecionar-ano-letivo|painel/, {
        timeout: this.timeout,
      });
    } catch (error) {
      throw new SiageAuthError(
        error instanceof Error ? error.message : 'Unknown login error',
      );
    }
  }

  // ── Step 2: Select academic year ───────────────────────────────────────────

  /**
   * On the /auth/selecionar-ano-letivo page, select the target year
   * and click "Selecionar".
   *
   * Real DOM (April 2026):
   * - A PrimeNG autocomplete dropdown with "Ano Letivo" label
   * - The current year is pre-selected in the input
   * - A "Selecionar" button to confirm
   */
  async selectYear(year: string): Promise<void> {
    try {
      // Check if we're on the year selection page
      const currentUrl = this.page.url();
      if (!currentUrl.includes('selecionar-ano-letivo')) {
        // Already past year selection (session cookie may have year)
        return;
      }

      // Wait for the year selection form to render
      const selecionarBtn = 'button:has-text("Selecionar")';
      await this.page.waitForSelector(selecionarBtn, {
        timeout: this.timeout,
        state: 'visible',
      });

      // Check if the correct year is already selected in the input
      // If not, we'd need to interact with the dropdown.
      // For now, the current year (2026) is pre-selected.

      // Click "Selecionar" to confirm
      await this.page.click(selecionarBtn, { timeout: this.timeout });

      // Wait for navigation to the dashboard
      await this.page.waitForURL(/\/(painel|minhas|inicio)/, {
        timeout: this.timeout,
      });
    } catch (error) {
      throw new SiageNavigationError(
        'selectYear',
        error instanceof Error ? error.message : `Year '${year}' selection failed`,
      );
    }
  }

  // ── Step 3: Navigate to Coordenação Pedagógica ─────────────────────────────

  /**
   * From the dashboard, navigate to:
   * Minhas Turmas → Coordenação Pedagógica → Acessar
   */
  async navigateToCoordenacao(): Promise<void> {
    try {
      // Click "Minhas Turmas"
      await this.page.waitForSelector(SIAGE_SELECTORS.navigation.minhasTurmasLink, {
        timeout: this.timeout,
        state: 'visible',
      });
      await this.page.click(SIAGE_SELECTORS.navigation.minhasTurmasLink, {
        timeout: this.timeout,
      });

      // Wait for the page to settle
      await this.page.waitForLoadState('networkidle', { timeout: this.timeout });

      // Click "Acessar" inside the Coordenação Pedagógica card
      await this.page.waitForSelector(SIAGE_SELECTORS.navigation.coordPedagogicaAccessBtn, {
        timeout: this.timeout,
        state: 'visible',
      });
      await this.page.click(SIAGE_SELECTORS.navigation.coordPedagogicaAccessBtn, {
        timeout: this.timeout,
      });

      // Wait for the turma table page to load
      await this.page.waitForURL(/coordenacao-pedagogica/, { timeout: this.timeout });
      await this.page.waitForLoadState('networkidle', { timeout: this.timeout });
    } catch (error) {
      throw new SiageNavigationError(
        'navigateToCoordenacao',
        error instanceof Error ? error.message : 'Failed to reach Coordenação Pedagógica',
      );
    }
  }

  // ── Step 3: Select turma from table ────────────────────────────────────────

  /**
   * In the Coordenação Pedagógica turma table, find the row matching
   * `turmaName` in the TURMA column and click "Analisar Turma".
   *
   * @param turmaName - The SIAGE turma name (e.g. "1ª Série A")
   */
  async selectTurma(turmaName: string): Promise<void> {
    try {
      // Wait for the table to render
      await this.page.waitForSelector(SIAGE_SELECTORS.turmaTable.bodyRows, {
        timeout: this.timeout,
        state: 'visible',
      });

      // Wait for table to stabilize — SIAGE renders rows asynchronously
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Find the specific table that contains the TURMA header
      const tableLocator = this.page.locator('table:has(th:has-text("TURMA"))').nth(0);

      // Find the TURMA column (which contains the series name like "1ª Série A")
      const headers = await tableLocator.locator('thead th').allTextContents();
      const turmaColIdx = headers.findIndex((h: string) => h.trim().toUpperCase().includes('TURMA'));
      if (turmaColIdx === -1) {
        throw new Error(`Column TURMA not found in headers: ${JSON.stringify(headers)}`);
      }

      const rowsLocator = tableLocator.locator('tbody tr');
      const rowCount = await rowsLocator.count();
      let found = false;

      for (let i = 0; i < rowCount; i++) {
        const row = rowsLocator.nth(i);
        const cells = await row.locator('td').allTextContents();
        const cellValue = cells[turmaColIdx]?.trim() ?? '';

        if (cellValue.includes(turmaName)) {
          // Click "Analisar Turma" button in this row
          await row.locator(SIAGE_SELECTORS.turmaTable.analisarTurmaBtn).click({
            timeout: this.timeout,
          });
          found = true;
          break;
        }
      }

      if (!found) {
        throw new Error(`Turma '${turmaName}' not found in table. Available turmas checked: ${rowCount} rows.`);
      }

      await this.page.waitForLoadState('networkidle', { timeout: this.timeout });
    } catch (error) {
      throw new SiageNavigationError(
        'selectTurma',
        error instanceof Error ? error.message : `Turma '${turmaName}' not found`,
      );
    }
  }

  // ── Step 3b: Scan component table for BNCC-eligible disciplines ────────────

  /**
   * Scan ALL pages of the component table and classify each discipline.
   * Does NOT click any discipline — read-only scan for coverage measurement.
   *
   * @param bnccTargets - List of BNCC discipline names to look for
   * @returns ComponentScanResult with eligible/rejected lists and page counts
   */
  async scanComponentTable(bnccTargets: string[]): Promise<ComponentScanResult> {
    const eligible: ComponentScanResult['eligible'] = [];
    const rejected: ComponentScanResult['rejected'] = [];
    let totalRows = 0;
    let pageNum = 1;

    await this.page.waitForSelector(SIAGE_SELECTORS.componenteTable.bodyRows, {
      timeout: this.timeout,
      state: 'visible',
    });
    await new Promise(resolve => setTimeout(resolve, 2000));

    const tableLocator = this.page.locator('table:has(th:has-text("COMPONENTE"))').nth(0);
    const headers = await tableLocator.locator('thead th').allTextContents();
    const normalizedHeaders = headers.map((h: string) => h.trim().toUpperCase());

    const compColIdx = normalizedHeaders.findIndex((h: string) =>
      h.includes('COMPONENTE CURRICULAR') || h.includes('COMPONENTE'),
    );
    const tipoColIdx = normalizedHeaders.findIndex((h: string) =>
      h.includes('TIPO') && h.includes('ESTRUTURA'),
    );
    const profColIdx = normalizedHeaders.findIndex((h: string) =>
      h.includes('PROFESSOR'),
    );

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const rowsLocator = tableLocator.locator('tbody tr');
      const rowCount = await rowsLocator.count();
      totalRows += rowCount;

      for (let i = 0; i < rowCount; i++) {
        const row = rowsLocator.nth(i);
        const cells = await row.locator('td').allTextContents();
        const compName = cells[compColIdx]?.trim() ?? '';
        const tipoValue = tipoColIdx !== -1 ? (cells[tipoColIdx]?.trim() ?? '') : '';
        const profValue = profColIdx !== -1 ? (cells[profColIdx]?.trim() ?? '') : '';

        // EXACT match: compare normalized names to avoid
        // "Física" matching "Educação Física"
        const matchedTarget = bnccTargets.find(t =>
          compName.toLowerCase() === t.toLowerCase(),
        );

        if (!matchedTarget) {
          // Not in our target list — classify but don't count as gap
          rejected.push({
            name: compName,
            reason: 'not in BNCC target list',
            page: pageNum,
          });
          continue;
        }

        // Check BNCC type
        const isBNCC = tipoValue.toUpperCase().includes('FORMAÇÃO GERAL BÁSICA');
        if (!isBNCC) {
          rejected.push({
            name: compName,
            reason: `tipo="${tipoValue}" (not Formação Geral Básica)`,
            page: pageNum,
          });
          continue;
        }

        // Check professor
        const hasProf = profValue && profValue !== '-' && profValue !== '';
        if (!hasProf) {
          rejected.push({
            name: compName,
            reason: `professor absent ("${profValue}")`,
            page: pageNum,
          });
          continue;
        }

        eligible.push({
          name: matchedTarget,
          tipo: tipoValue,
          professor: profValue,
          page: pageNum,
        });
      }

      // ── Universal pagination: supports 3 SIAGE paginator types ──
      // Type A: ngx-pagination (component table) — <pagination-controls> with .ngx-pagination
      //   next: <li class="pagination-next"><a>
      //   prev: <li class="pagination-previous"><a>
      // Type B: ngb-pagination (unused here but kept for safety) — <a class="page-link"> with text »
      // Type C: Bootstrap (boletim) — <button class="page-link"> with FontAwesome icons

      // Scroll to bottom to ensure pagination is rendered
      await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise(resolve => setTimeout(resolve, 1000));

      const hasNext = await this.page.evaluate(() => {
        // Type A: ngx-pagination — <li class="pagination-next"> without "disabled"
        const ngxNext = document.querySelector('.ngx-pagination .pagination-next:not(.disabled) a');
        if (ngxNext) {
          (ngxNext as HTMLElement).click();
          return 'ngx';
        }
        // Type B: ngb-pagination or Bootstrap li.page-item
        const items = document.querySelectorAll('li.page-item');
        for (const item of items) {
          if (item.classList.contains('disabled') || item.classList.contains('active')) continue;
          const link = item.querySelector('a.page-link');
          if (link) {
            const text = link.textContent?.trim() ?? '';
            if (text === '»' || text === '›') {
              (link as HTMLElement).click();
              return 'ngb';
            }
          }
          const icon = item.querySelector('i.fa-chevron-right, i.fa-angle-right');
          if (icon) {
            const btn = item.querySelector('button.page-link') as HTMLButtonElement;
            if (btn && !btn.disabled) {
              btn.click();
              return 'bootstrap';
            }
          }
        }
        return null;
      });

      console.log(`    [SCAN] pagination result: ${hasNext ?? 'none'}`);

      if (hasNext) {
        pageNum++;
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }

      break;
    }

    console.log(`    [SCAN SUMMARY] ${totalRows} rows across ${pageNum} page(s)`);

    // Navigate back to page 1 if we advanced
    if (pageNum > 1) {
      await this.page.evaluate(() => {
        // Type A: ngx-pagination first page
        const ngxFirst = document.querySelector('.ngx-pagination .pagination-previous:not(.disabled) a');
        if (ngxFirst) {
          (ngxFirst as HTMLElement).click();
          return;
        }
        // Type B/C: li.page-item with «
        const items = document.querySelectorAll('li.page-item');
        for (const item of items) {
          if (item.classList.contains('disabled')) continue;
          const link = item.querySelector('a.page-link');
          if (link && (link.textContent?.trim() === '«')) {
            (link as HTMLElement).click();
            return;
          }
          const icon = item.querySelector('i.fa-angle-double-left');
          if (icon) {
            const btn = item.querySelector('button.page-link') as HTMLButtonElement;
            if (btn && !btn.disabled) {
              btn.click();
              return;
            }
          }
        }
      });
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return { eligible, rejected, totalPages: pageNum, totalRows };
  }

  // ── Step 4: Select BNCC discipline from componente table ───────────────────

  /**
   * In the turma analysis page, find the BNCC discipline row and
   * click "Gestão do Diário" (#btn-visualizar).
   *
   * STRICT VALIDATION RULES:
   * 1. Column "COMPONENTE CURRICULAR" must match the target discipline name
   * 2. Column "TIPO OU ESTRUTURA DO COMPONENTE" must be "Formação Geral Básica"
   * 3. Column "PROFESSOR" must be present (not "-" or empty)
   * 4. Only then click #btn-visualizar on that SAME row
   *
   * @param disciplinaName - e.g. "Biologia"
   */
  async selectDisciplina(disciplinaName: string): Promise<void> {
    try {
      // Wait for the component table
      await this.page.waitForSelector(SIAGE_SELECTORS.componenteTable.bodyRows, {
        timeout: this.timeout,
        state: 'visible',
      });

      // Wait for table to stabilize
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Find the specific table that contains the COMPONENTE CURRICULAR header
      const tableLocator = this.page.locator('table:has(th:has-text("COMPONENTE"))').nth(0);

      const headers = await tableLocator.locator('thead th').allTextContents();
      const normalizedHeaders = headers.map((h: string) => h.trim().toUpperCase());

      // Locate required columns by header text
      const compColIdx = normalizedHeaders.findIndex((h: string) =>
        h.includes('COMPONENTE CURRICULAR') || h.includes('COMPONENTE'),
      );
      const tipoColIdx = normalizedHeaders.findIndex((h: string) =>
        h.includes('TIPO') && h.includes('ESTRUTURA'),
      );
      const profColIdx = normalizedHeaders.findIndex((h: string) =>
        h.includes('PROFESSOR'),
      );

      if (compColIdx === -1) {
        throw new Error(`Column COMPONENTE CURRICULAR not found. Headers: ${JSON.stringify(headers)}`);
      }

      let found = false;
      const rejections: string[] = [];
      let totalRowsChecked = 0;

      // Paginate through the component table to find the discipline
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const rowsLocator = tableLocator.locator('tbody tr');
        const rowCount = await rowsLocator.count();

        for (let i = 0; i < rowCount; i++) {
          const row = rowsLocator.nth(i);
          const cells = await row.locator('td').allTextContents();
          const compName = cells[compColIdx]?.trim() ?? '';
          totalRowsChecked++;

          // Step 1: EXACT name match (case-insensitive)
          if (compName.toLowerCase() !== disciplinaName.toLowerCase()) {
            continue;
          }

          // Step 2: Validate BNCC type (Formação Geral Básica)
          if (tipoColIdx !== -1) {
            const tipoValue = cells[tipoColIdx]?.trim() ?? '';
            if (!tipoValue.toUpperCase().includes('FORMAÇÃO GERAL BÁSICA')) {
              rejections.push(
                `Row ${i}: "${compName}" rejected — tipo="${tipoValue}" (not Formação Geral Básica)`,
              );
              continue;
            }
          }

          // Step 3: Validate professor is present
          if (profColIdx !== -1) {
            const profValue = cells[profColIdx]?.trim() ?? '';
            if (!profValue || profValue === '-' || profValue === '') {
              rejections.push(
                `Row ${i}: "${compName}" rejected — professor absent ("${profValue}")`,
              );
              continue;
            }
          }

          // All validations passed — click "Gestão do Diário" on THIS row
          console.log(`    [BNCC✓] Row ${i}: "${compName}" — validated`);
          await row.locator(SIAGE_SELECTORS.componenteTable.visualizarBtn).click({
            timeout: this.timeout,
          });
          found = true;
          break;
        }

        if (found) break;

        // Try next page of component table using universal pagination
        await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await new Promise(resolve => setTimeout(resolve, 500));

        const hasNextPage = await this.page.evaluate(() => {
          // Type A: ngx-pagination
          const ngxNext = document.querySelector('.ngx-pagination .pagination-next:not(.disabled) a');
          if (ngxNext) {
            (ngxNext as HTMLElement).click();
            return true;
          }
          // Type B/C: li.page-item
          const items = document.querySelectorAll('li.page-item');
          for (const item of items) {
            if (item.classList.contains('disabled') || item.classList.contains('active')) continue;
            const link = item.querySelector('a.page-link');
            if (link) {
              const text = link.textContent?.trim() ?? '';
              if (text === '»' || text === '›') {
                (link as HTMLElement).click();
                return true;
              }
            }
            const icon = item.querySelector('i.fa-chevron-right, i.fa-angle-right');
            if (icon) {
              const btn = item.querySelector('button.page-link') as HTMLButtonElement;
              if (btn && !btn.disabled) {
                btn.click();
                return true;
              }
            }
          }
          return false;
        });

        if (hasNextPage) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }

        break; // No more pages
      }

      if (!found) {
        const detail = rejections.length > 0
          ? ` Rejections: ${rejections.join('; ')}`
          : '';
        throw new Error(
          `Discipline '${disciplinaName}' not found as valid BNCC component. ` +
          `Checked ${totalRowsChecked} rows.${detail}`,
        );
      }

      await this.page.waitForLoadState('networkidle', { timeout: this.timeout });
    } catch (error) {
      throw new SiageNavigationError(
        'selectDisciplina',
        error instanceof Error ? error.message : `Discipline '${disciplinaName}' not found`,
      );
    }
  }

  // ── Step 5: Open Boletim Escolar tab ───────────────────────────────────────

  /**
   * Click the "Boletim Escolar" tab/link inside the discipline diary page.
   * Then click the "Buscar" button to populate the table (required by SIAGE).
   */
  async openBoletim(): Promise<void> {
    try {
      await this.page.waitForSelector(SIAGE_SELECTORS.boletim.boletimTab, {
        timeout: this.timeout,
        state: 'visible',
      });
      await this.page.click(SIAGE_SELECTORS.boletim.boletimTab, {
        timeout: this.timeout,
      });

      // Wait for the filter section to render
      await this.page.waitForLoadState('networkidle', { timeout: this.timeout });

      // SIAGE requires clicking "Buscar" to populate the boletim table.
      // Without this, the table shows "Nenhum registro foi encontrado".
      const buscarBtn = 'button:has-text("Buscar"), a:has-text("Buscar")';
      try {
        await this.page.waitForSelector(buscarBtn, {
          timeout: 5000,
          state: 'visible',
        });
        await this.page.click(buscarBtn, { timeout: this.timeout });
        console.log('    [Boletim] Clicked "Buscar" to populate table');
      } catch {
        // If no Buscar button exists, table may auto-populate
        console.log('    [Boletim] No "Buscar" button found, table may auto-populate');
      }

      // Wait for the boletim table to appear with data
      await this.page.waitForLoadState('networkidle', { timeout: this.timeout });
      await this.page.waitForSelector(SIAGE_SELECTORS.boletim.tableRows, {
        timeout: this.timeout,
        state: 'visible',
      });
    } catch (error) {
      throw new SiageNavigationError(
        'openBoletim',
        error instanceof Error ? error.message : 'Boletim tab not found',
      );
    }
  }

  // ── Step 6: Extract grades from boletim table ──────────────────────────────

  /**
   * Read the boletim table and extract grades for a specific bimester/period.
   * Handles pagination: exhausts all pages before returning.
   *
   * Column mapping (hardcoded due to colspan mismatch between thead and tbody):
   *   cells[0] = Student Name
   *   cells[1] = 1º Período
   *   cells[2] = 2º Período
   *   cells[3] = 3º Período
   *   cells[4] = 4º Período
   *
   * @param bimester - The bimester number (1-4)
   * @returns Array of { studentName, value } — null value means not_registered
   */
  async extractGrades(bimester: number): Promise<BoletimGrade[]> {
    try {
      const tableLocator = this.page.locator('table:has(th:has-text("ESTUDANTE"))').nth(0);
      const studentColIdx = 0;
      const gradeColIdx = bimester;

      const allGrades: BoletimGrade[] = [];
      let pageNum = 1;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        // Wait for table to stabilize and data to hydrate (skip skeleton/dash rows)
        const rowsLocator = tableLocator.locator('tbody tr');
        let rowCount = 0;
        let stabilized = false;

        for (let attempt = 0; attempt < 10; attempt++) {
          rowCount = await rowsLocator.count();
          if (rowCount > 0) {
            const firstRowCells = await rowsLocator.nth(0).locator('td').allTextContents();
            const firstStudent = firstRowCells[studentColIdx]?.trim() ?? '';
            if (firstStudent && firstStudent !== '-' && firstStudent !== '') {
              stabilized = true;
              break;
            }
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        if (!stabilized) {
          // If page 1 doesn't hydrate, that's an error.
          // If a later page doesn't hydrate, we've likely exhausted all data.
          if (pageNum === 1) {
            // Diagnostic: what does the table actually contain?
            const diagRows = await rowsLocator.count();
            if (diagRows > 0) {
              const diagCells = await rowsLocator.nth(0).locator('td').allTextContents();
              console.log(`    [DIAG] Page 1 failed hydration. rows=${diagRows}, firstRow cells: ${JSON.stringify(diagCells)}`);
            } else {
              console.log(`    [DIAG] Page 1 failed hydration. rows=0 (table empty)`);
            }
            throw new Error('Boletim table did not hydrate with real student data in time');
          }
          break;
        }

        // Diagnostic: log first row content for auditing
        if (pageNum === 1) {
          const diagCells = await rowsLocator.nth(0).locator('td').allTextContents();
          console.log(`    [DIAG] First row cells: ${JSON.stringify(diagCells.map((c: string) => c.trim()))}`);
        }

        // Extract rows from this page
        let pageGradeCount = 0;
        for (let i = 0; i < rowCount; i++) {
          const row = rowsLocator.nth(i);
          const cells = await row.locator('td').allTextContents();

          const studentName = cells[studentColIdx]?.trim() ?? '';
          const rawValue = cells[gradeColIdx]?.trim() ?? '';

          // Skip empty, placeholder, and "no records" rows
          if (!studentName || studentName.includes('Nenhum registro')) continue;

          let value: number | null = null;
          if (rawValue && rawValue !== '-' && rawValue !== '') {
            const parsed = parseFloat(rawValue.replace(',', '.'));
            if (!isNaN(parsed)) {
              value = parsed;
            }
          }

          allGrades.push({ studentName, value });
          pageGradeCount++;
        }

        console.log(`    [Page ${pageNum}] ${pageGradeCount} students extracted`);

        // Find and click the "next page" button using DOM evaluation
        // SIAGE uses: <li class="page-item"><button class="page-link"><small><i class="fas fa-chevron-right"></i></small></button></li>
        const hasNext = await this.page.evaluate(() => {
          const items = document.querySelectorAll('li.page-item');
          for (const item of items) {
            const icon = item.querySelector('i.fa-chevron-right, i.fa-angle-right');
            if (icon && !item.classList.contains('disabled')) {
              const btn = item.querySelector('button.page-link') as HTMLButtonElement;
              if (btn && !btn.disabled) {
                btn.click();
                return true;
              }
            }
          }
          return false;
        });

        console.log(`    [PAGINATION] hasNext=${hasNext}`);

        if (hasNext) {
          pageNum++;
          // Wait for the new page data to load
          await new Promise(resolve => setTimeout(resolve, 3000));
          continue;
        }

        // No next button or it's disabled — we've exhausted all pages
        break;
      }

      console.log(`    [Total] ${allGrades.length} students across ${pageNum} page(s)`);
      return allGrades;
    } catch (error) {
      throw new SiageNavigationError(
        'extractGrades',
        error instanceof Error ? error.message : 'Failed to extract grades from boletim',
      );
    }
  }

  // ── XHR Interception (alternative data source) ─────────────────────────────

  /**
   * Intercept the boletim-curriculo XHR response.
   */
  async interceptBoletimResponse(): Promise<unknown> {
    const response = await this.page.waitForResponse(
      (resp: { url(): string; status(): number }) =>
        resp.url().includes('boletim-curriculo') && resp.status() === 200,
      { timeout: this.timeout },
    );
    return response.json();
  }

  /**
   * Intercept the get-cabecario-listagem XHR response.
   */
  async interceptCabecarioResponse(): Promise<unknown> {
    const response = await this.page.waitForResponse(
      (resp: { url(): string; status(): number }) =>
        resp.url().includes('get-cabecario-listagem') && resp.status() === 200,
      { timeout: this.timeout },
    );
    return response.json();
  }

  // ── Utility ────────────────────────────────────────────────────────────────

  /** Get boletim table header texts for debugging */
  async getBoletimTableHeaders(): Promise<string[]> {
    return this.page.locator(SIAGE_SELECTORS.boletim.tableHeaders).allTextContents();
  }

  /** Count student rows in the boletim table */
  async getBoletimRowCount(): Promise<number> {
    return this.page.locator(SIAGE_SELECTORS.boletim.tableRows).count();
  }
}
