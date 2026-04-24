/**
 * @module page-objects/siage-navigator
 * Minimal, pragmatic page object for navigating the SIAGE system.
 *
 * Design:
 * - Uses Playwright's Page type for navigation
 * - Each step is an explicit method (no magic chains)
 * - Timeout-tolerant with sensible defaults
 * - Logs steps for debugging without exposing credentials
 */
import { SIAGE_SELECTORS } from './selectors.js';
import { SiageAuthError, SiageNavigationError } from '../errors.js';

/** Navigation configuration */
export interface SiageNavigatorConfig {
  /** Base URL of the SIAGE instance */
  baseUrl: string;
  /** Default timeout for page operations (ms) */
  timeout?: number;
}

/** Credentials — ephemeral, never persisted */
export interface SiageCredentials {
  username: string;
  password: string;
}

/**
 * Minimal SIAGE navigator.
 *
 * Usage (in worker context with Playwright):
 * ```ts
 * const nav = new SiageNavigator(page, { baseUrl: 'https://siage.pb.gov.br' });
 * await nav.login(credentials);
 * await nav.selectYear('2026');
 * await nav.navigateToBoletim('1ª Série A', 'Biologia');
 * ```
 *
 * NOTE: The `page` parameter uses Playwright's Page type.
 * We use a minimal interface here to avoid requiring Playwright as a
 * direct dependency of the bridge package at build time.
 */
export interface PlaywrightPageMinimal {
  goto(url: string, options?: { waitUntil?: string; timeout?: number }): Promise<unknown>;
  fill(selector: string, value: string): Promise<void>;
  click(selector: string, options?: { timeout?: number }): Promise<void>;
  waitForSelector(selector: string, options?: { timeout?: number; state?: string }): Promise<unknown>;
  waitForURL(url: string | RegExp, options?: { timeout?: number }): Promise<void>;
  locator(selector: string): {
    textContent(): Promise<string | null>;
    allTextContents(): Promise<string[]>;
    count(): Promise<number>;
    isVisible(): Promise<boolean>;
  };
  waitForResponse(
    urlOrPredicate: string | RegExp | ((response: { url(): string; status(): number }) => boolean),
    options?: { timeout?: number },
  ): Promise<{ json(): Promise<unknown>; status(): number }>;
  url(): string;
}

export class SiageNavigator {
  private readonly timeout: number;

  constructor(
    private readonly page: PlaywrightPageMinimal,
    private readonly config: SiageNavigatorConfig,
  ) {
    this.timeout = config.timeout ?? 30_000;
  }

  /**
   * Step 1: Login to SIAGE
   * @throws SiageAuthError if login fails
   */
  async login(credentials: SiageCredentials): Promise<void> {
    try {
      await this.page.goto(this.config.baseUrl, {
        waitUntil: 'networkidle',
        timeout: this.timeout,
      });

      await this.page.fill(
        SIAGE_SELECTORS.login.usernameInput,
        credentials.username,
      );
      await this.page.fill(
        SIAGE_SELECTORS.login.passwordInput,
        credentials.password,
      );
      await this.page.click(SIAGE_SELECTORS.login.submitButton, {
        timeout: this.timeout,
      });

      // Wait for navigation away from login page
      await this.page.waitForURL(/.*(?!.*login).*/, {
        timeout: this.timeout,
      });
    } catch (error) {
      throw new SiageAuthError(
        error instanceof Error ? error.message : 'Unknown login error',
      );
    }
  }

  /**
   * Step 2: Select academic year
   */
  async selectYear(_year: string): Promise<void> {
    // Year selection varies by SIAGE version.
    // In many instances, the year is pre-selected or in a dropdown.
    // This will be refined in E4 with real navigation testing.
    try {
      const yearSelector = SIAGE_SELECTORS.navigation.yearSelector;
      await this.page.waitForSelector(yearSelector, {
        timeout: this.timeout,
        state: 'visible',
      });
      // Implementation deferred to E4 — year handling varies by SIAGE instance
    } catch (error) {
      throw new SiageNavigationError(
        'selectYear',
        error instanceof Error ? error.message : 'Year selector not found',
      );
    }
  }

  /**
   * Step 3: Navigate to turma list
   */
  async navigateToTurmaList(): Promise<void> {
    try {
      await this.page.click(
        SIAGE_SELECTORS.navigation.minhasTurmasLink,
        { timeout: this.timeout },
      );
    } catch (error) {
      throw new SiageNavigationError(
        'navigateToTurmaList',
        error instanceof Error ? error.message : 'Turma list not found',
      );
    }
  }

  /**
   * Step 4: Select a specific turma
   */
  async selectTurma(turmaName: string): Promise<void> {
    try {
      await this.page.click(
        SIAGE_SELECTORS.navigation.turmaItem(turmaName),
        { timeout: this.timeout },
      );
    } catch (error) {
      throw new SiageNavigationError(
        'selectTurma',
        error instanceof Error ? error.message : `Turma '${turmaName}' not found`,
      );
    }
  }

  /**
   * Step 5: Select a specific component/discipline
   */
  async selectComponente(componenteName: string): Promise<void> {
    try {
      await this.page.click(
        SIAGE_SELECTORS.navigation.componenteItem(componenteName),
        { timeout: this.timeout },
      );
    } catch (error) {
      throw new SiageNavigationError(
        'selectComponente',
        error instanceof Error ? error.message : `Componente '${componenteName}' not found`,
      );
    }
  }

  /**
   * Step 6: Navigate to boletim tab/page
   */
  async openBoletim(): Promise<void> {
    try {
      await this.page.click(
        SIAGE_SELECTORS.boletim.boletimTab,
        { timeout: this.timeout },
      );
    } catch (error) {
      throw new SiageNavigationError(
        'openBoletim',
        error instanceof Error ? error.message : 'Boletim tab not found',
      );
    }
  }

  /**
   * Step 7: Intercept the boletim-curriculo XHR response.
   * Returns the parsed JSON from the intercepted response.
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
   * Step 8: Intercept the get-cabecario-listagem XHR response.
   */
  async interceptCabecarioResponse(): Promise<unknown> {
    const response = await this.page.waitForResponse(
      (resp: { url(): string; status(): number }) =>
        resp.url().includes('get-cabecario-listagem') && resp.status() === 200,
      { timeout: this.timeout },
    );
    return response.json();
  }

  /**
   * DOM-second: Get table header texts for validation.
   */
  async getBoletimTableHeaders(): Promise<string[]> {
    return this.page.locator(SIAGE_SELECTORS.boletim.tableHeaders).allTextContents();
  }

  /**
   * DOM-second: Count student rows in the boletim table.
   */
  async getBoletimRowCount(): Promise<number> {
    return this.page.locator(SIAGE_SELECTORS.boletim.tableRows).count();
  }
}
