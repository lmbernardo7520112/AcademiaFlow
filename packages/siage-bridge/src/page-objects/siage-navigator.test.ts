import { describe, it, expect, vi } from 'vitest';
import {
  SiageNavigator,
  type PlaywrightPageMinimal,
  type SiageNavigatorConfig,
} from './siage-navigator.js';
import { SiageAuthError, SiageNavigationError } from '../errors.js';

function createMockPage(overrides: Partial<PlaywrightPageMinimal> = {}): PlaywrightPageMinimal {
  return {
    goto: vi.fn().mockResolvedValue(undefined),
    fill: vi.fn().mockResolvedValue(undefined),
    click: vi.fn().mockResolvedValue(undefined),
    waitForSelector: vi.fn().mockResolvedValue(undefined),
    waitForURL: vi.fn().mockResolvedValue(undefined),
    locator: vi.fn().mockReturnValue({
      textContent: vi.fn().mockResolvedValue(''),
      allTextContents: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      isVisible: vi.fn().mockResolvedValue(true),
    }),
    waitForResponse: vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({}),
      status: vi.fn().mockReturnValue(200),
    }),
    url: vi.fn().mockReturnValue('https://siage.example.com'),
    ...overrides,
  };
}

const config: SiageNavigatorConfig = {
  baseUrl: 'https://siage.example.com',
  timeout: 5000,
};

describe('SiageNavigator', () => {
  describe('login', () => {
    it('calls goto, fill, click in correct order', async () => {
      const page = createMockPage();
      const nav = new SiageNavigator(page, config);

      await nav.login({ username: 'user', password: 'pass' });

      expect(page.goto).toHaveBeenCalledWith(config.baseUrl, expect.any(Object));
      expect(page.fill).toHaveBeenCalledTimes(2);
      expect(page.click).toHaveBeenCalledTimes(1);
      expect(page.waitForURL).toHaveBeenCalledTimes(1);
    });

    it('throws SiageAuthError on login failure', async () => {
      const page = createMockPage({
        waitForURL: vi.fn().mockRejectedValue(new Error('Timeout')),
      });
      const nav = new SiageNavigator(page, config);

      await expect(nav.login({ username: 'bad', password: 'bad' }))
        .rejects.toThrow(SiageAuthError);
    });
  });

  describe('navigation steps', () => {
    it('navigateToTurmaList clicks turma link', async () => {
      const page = createMockPage();
      const nav = new SiageNavigator(page, config);

      await nav.navigateToTurmaList();
      expect(page.click).toHaveBeenCalledTimes(1);
    });

    it('selectTurma clicks turma by name', async () => {
      const page = createMockPage();
      const nav = new SiageNavigator(page, config);

      await nav.selectTurma('1ª Série A');
      expect(page.click).toHaveBeenCalledWith(
        expect.stringContaining('1ª Série A'),
        expect.any(Object),
      );
    });

    it('selectComponente clicks component by name', async () => {
      const page = createMockPage();
      const nav = new SiageNavigator(page, config);

      await nav.selectComponente('Biologia');
      expect(page.click).toHaveBeenCalledWith(
        expect.stringContaining('Biologia'),
        expect.any(Object),
      );
    });

    it('openBoletim clicks boletim tab', async () => {
      const page = createMockPage();
      const nav = new SiageNavigator(page, config);

      await nav.openBoletim();
      expect(page.click).toHaveBeenCalledTimes(1);
    });

    it('throws SiageNavigationError on navigation failure', async () => {
      const page = createMockPage({
        click: vi.fn().mockRejectedValue(new Error('Element not found')),
      });
      const nav = new SiageNavigator(page, config);

      await expect(nav.navigateToTurmaList())
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
      });
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
      });
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
        }),
      });
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
        }),
      });
      const nav = new SiageNavigator(page, config);

      const count = await nav.getBoletimRowCount();
      expect(count).toBe(28);
    });
  });
});
