import { describe, it, expect, vi } from 'vitest';
import {
  SiageNavigator,
  type PlaywrightPageMinimal,
  type SiageNavigatorConfig,
} from './siage-navigator.js';
import { SiageAuthError, SiageNavigationError } from '../errors.js';

/**
 * Deep mock that satisfies the PlaywrightPageMinimal interface,
 * including nested `.locator().nth().locator()` chains.
 */
function createMockPage(overrides: Partial<PlaywrightPageMinimal> = {}): PlaywrightPageMinimal {
  const innerLocator = {
    click: vi.fn().mockResolvedValue(undefined),
    textContent: vi.fn().mockResolvedValue(''),
    allTextContents: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
    nth: vi.fn().mockReturnValue({
      locator: vi.fn().mockReturnValue({
        click: vi.fn().mockResolvedValue(undefined),
        allTextContents: vi.fn().mockResolvedValue([]),
      }),
    }),
  };

  const nthMock = {
    textContent: vi.fn().mockResolvedValue(''),
    isVisible: vi.fn().mockResolvedValue(true),
    click: vi.fn().mockResolvedValue(undefined),
    locator: vi.fn().mockReturnValue(innerLocator),
    allTextContents: vi.fn().mockResolvedValue([]),
  };

  return {
    goto: vi.fn().mockResolvedValue(undefined),
    fill: vi.fn().mockResolvedValue(undefined),
    click: vi.fn().mockResolvedValue(undefined),
    waitForSelector: vi.fn().mockResolvedValue(undefined),
    waitForURL: vi.fn().mockResolvedValue(undefined),
    waitForLoadState: vi.fn().mockResolvedValue(undefined),
    evaluate: vi.fn().mockResolvedValue(null),
    goBack: vi.fn().mockResolvedValue(undefined),
    locator: vi.fn().mockReturnValue({
      textContent: vi.fn().mockResolvedValue(''),
      allTextContents: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      isVisible: vi.fn().mockResolvedValue(true),
      dispatchEvent: vi.fn().mockResolvedValue(undefined),
      pressSequentially: vi.fn().mockResolvedValue(undefined),
      nth: vi.fn().mockReturnValue(nthMock),
      click: vi.fn().mockResolvedValue(undefined),
      locator: vi.fn().mockReturnValue(innerLocator),
    }),
    waitForResponse: vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({}),
      status: vi.fn().mockReturnValue(200),
    }),
    url: vi.fn().mockReturnValue('https://siage.example.com'),
    ...overrides,
  } as unknown as PlaywrightPageMinimal;
}

const config: SiageNavigatorConfig = {
  baseUrl: 'https://siage.example.com',
  timeout: 5000,
};

describe('SiageNavigator', () => {
  describe('login', () => {
    it('calls goto and fill for credentials', async () => {
      const page = createMockPage();
      const nav = new SiageNavigator(page, config);

      await nav.login({ username: 'user', password: 'pass' });

      expect(page.goto).toHaveBeenCalledWith(config.baseUrl, expect.any(Object));
      // Login uses waitForSelector + fill or pressSequentially
      expect(page.waitForSelector).toHaveBeenCalled();
    });

    it('throws SiageAuthError on login failure', async () => {
      const page = createMockPage({
        waitForURL: vi.fn().mockRejectedValue(new Error('Timeout')),
      } as unknown as Partial<PlaywrightPageMinimal>);
      const nav = new SiageNavigator(page, config);

      await expect(nav.login({ username: 'bad', password: 'bad' }))
        .rejects.toThrow(SiageAuthError);
    });
  });

  describe('navigation steps', () => {
    it('navigateToCoordenacao clicks coordenacao link', async () => {
      const page = createMockPage();
      const nav = new SiageNavigator(page, config);

      await nav.navigateToCoordenacao();
      expect(page.click).toHaveBeenCalled();
    });

    it('selectTurma navigates to turma analysis', async () => {
      const page = createMockPage();
      const nav = new SiageNavigator(page, config);

      // selectTurma uses locator + nth + locator chain
      // The mock won't find the turma but should throw SiageNavigationError
      await expect(nav.selectTurma('1ª Série A'))
        .rejects.toThrow(SiageNavigationError);
    });

    it('selectDisciplina rejects when discipline not found', async () => {
      const page = createMockPage();
      const nav = new SiageNavigator(page, config);

      await expect(nav.selectDisciplina('Biologia'))
        .rejects.toThrow(SiageNavigationError);
    });

    it('openBoletim clicks boletim tab', async () => {
      const page = createMockPage();
      const nav = new SiageNavigator(page, config);

      await nav.openBoletim();
      expect(page.click).toHaveBeenCalled();
      expect(page.waitForLoadState).toHaveBeenCalled();
    });

    it('throws SiageNavigationError on coordenacao navigation failure', async () => {
      const page = createMockPage({
        click: vi.fn().mockRejectedValue(new Error('Element not found')),
      } as unknown as Partial<PlaywrightPageMinimal>);
      const nav = new SiageNavigator(page, config);

      await expect(nav.navigateToCoordenacao())
        .rejects.toThrow(SiageNavigationError);
    });
  });

  describe('XHR interception', () => {
    it('interceptBoletimResponse waits for boletim-curriculo', async () => {
      const mockJson = { success: true, data: { boletimAlunos: [] } };
      const page = createMockPage({
        waitForResponse: vi.fn().mockResolvedValue({
          json: vi.fn().mockResolvedValue(mockJson),
          status: vi.fn().mockReturnValue(200),
        }),
      } as unknown as Partial<PlaywrightPageMinimal>);
      const nav = new SiageNavigator(page, config);

      const result = await nav.interceptBoletimResponse();
      expect(result).toEqual(mockJson);
    });

    it('interceptCabecarioResponse waits for cabecario', async () => {
      const mockJson = { success: true, data: { turmaEtapa: 'Test' } };
      const page = createMockPage({
        waitForResponse: vi.fn().mockResolvedValue({
          json: vi.fn().mockResolvedValue(mockJson),
          status: vi.fn().mockReturnValue(200),
        }),
      } as unknown as Partial<PlaywrightPageMinimal>);
      const nav = new SiageNavigator(page, config);

      const result = await nav.interceptCabecarioResponse();
      expect(result).toEqual(mockJson);
    });
  });

  describe('DOM-second support', () => {
    it('getBoletimTableHeaders returns header texts', async () => {
      const page = createMockPage({
        locator: vi.fn().mockReturnValue({
          textContent: vi.fn().mockResolvedValue(''),
          allTextContents: vi.fn().mockResolvedValue(['ESTUDANTES', 'MÉDIA DO 1º PERÍODO']),
          count: vi.fn().mockResolvedValue(2),
          isVisible: vi.fn().mockResolvedValue(true),
          dispatchEvent: vi.fn().mockResolvedValue(undefined),
          pressSequentially: vi.fn().mockResolvedValue(undefined),
          nth: vi.fn(),
          click: vi.fn(),
          locator: vi.fn(),
        }),
      } as unknown as Partial<PlaywrightPageMinimal>);
      const nav = new SiageNavigator(page, config);

      const headers = await nav.getBoletimTableHeaders();
      expect(headers).toEqual(['ESTUDANTES', 'MÉDIA DO 1º PERÍODO']);
    });

    it('getBoletimRowCount returns row count', async () => {
      const page = createMockPage({
        locator: vi.fn().mockReturnValue({
          textContent: vi.fn().mockResolvedValue(''),
          allTextContents: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(28),
          isVisible: vi.fn().mockResolvedValue(true),
          dispatchEvent: vi.fn().mockResolvedValue(undefined),
          pressSequentially: vi.fn().mockResolvedValue(undefined),
          nth: vi.fn(),
          click: vi.fn(),
          locator: vi.fn(),
        }),
      } as unknown as Partial<PlaywrightPageMinimal>);
      const nav = new SiageNavigator(page, config);

      const count = await nav.getBoletimRowCount();
      expect(count).toBe(28);
    });
  });
});
