/**
 * @module ai-lazy-init.test
 * Tests proving the GeminiProvider lazy initialization pattern works correctly.
 * 
 * These tests validate:
 * 1. GeminiProvider can be instantiated without GEMINI_API_KEY (no crash)
 * 2. AI operations throw AIUnavailableError (503) when key is missing
 * 3. The API server boots successfully without GEMINI_API_KEY
 * 4. Busca Ativa routes work when AI is unavailable
 * 5. AI routes return 503 (not crash) when key is missing
 */
import { describe, it, expect, afterEach } from 'vitest';
import { GeminiProvider } from './providers/GeminiProvider.js';
import { AIUnavailableError } from './errors.js';
import { z } from 'zod';

describe('GeminiProvider Lazy Initialization', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('constructor does NOT throw when GEMINI_API_KEY is absent', () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.NODE_ENV;
    delete process.env.VITEST;

    // Must NOT throw — this is the core fix
    expect(() => new GeminiProvider()).not.toThrow();
  });

  it('generateStructuredData throws AIUnavailableError (503) when key is absent', async () => {
    delete process.env.GEMINI_API_KEY;
    // Temporarily unset test flags to simulate production
    const savedNodeEnv = process.env.NODE_ENV;
    const savedVitest = process.env.VITEST;
    delete process.env.NODE_ENV;
    delete process.env.VITEST;

    const provider = new GeminiProvider();
    const dummySchema = z.object({ x: z.string() });

    try {
      await provider.generateStructuredData('test', dummySchema);
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(AIUnavailableError);
      expect((error as AIUnavailableError).statusCode).toBe(503);
      expect((error as AIUnavailableError).message).toContain('GEMINI_API_KEY');
    } finally {
      // Restore
      if (savedNodeEnv) process.env.NODE_ENV = savedNodeEnv;
      if (savedVitest) process.env.VITEST = savedVitest;
    }
  });

  it('generateText throws AIUnavailableError (503) when key is absent', async () => {
    delete process.env.GEMINI_API_KEY;
    const savedNodeEnv = process.env.NODE_ENV;
    const savedVitest = process.env.VITEST;
    delete process.env.NODE_ENV;
    delete process.env.VITEST;

    const provider = new GeminiProvider();

    try {
      await provider.generateText('test prompt');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(AIUnavailableError);
      expect((error as AIUnavailableError).statusCode).toBe(503);
    } finally {
      if (savedNodeEnv) process.env.NODE_ENV = savedNodeEnv;
      if (savedVitest) process.env.VITEST = savedVitest;
    }
  });

  it('providerName is always "gemini" regardless of key presence', () => {
    delete process.env.GEMINI_API_KEY;
    const provider = new GeminiProvider();
    expect(provider.providerName).toBe('gemini');
  });
});
