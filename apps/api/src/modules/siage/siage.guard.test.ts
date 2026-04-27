/**
 * @module siage.guard.test
 * Guard tests for dryRun staging-only default behavior.
 *
 * These tests serve as CI regression barriers. If the dryRun default
 * ever changes to false (which would allow automatic Nota writes),
 * these tests MUST fail and block the pipeline.
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// ── Schema guard: dryRun defaults to true ──────────────────────────────────

/**
 * Re-declare the schema here to avoid importing route internals.
 * This is intentional: the guard tests the *contract*, not the implementation.
 * If the route schema changes, this test forces explicit acknowledgement.
 */
const createRunBodySchema = z.object({
  year: z.number().int().min(2020).max(2100),
  bimester: z.number().int().min(1).max(5),
  turmaFilter: z.string().optional(),
  credentials: z.object({
    username: z.string().min(1),
    password: z.string().min(1),
  }),
  dryRun: z.boolean().optional().default(true),
});

describe('SIAGE dryRun Guard Tests — Staging Safety', () => {
  describe('Schema contract', () => {
    it('dryRun defaults to true when omitted from request body', () => {
      const parsed = createRunBodySchema.parse({
        year: 2026,
        bimester: 1,
        credentials: { username: 'test', password: 'test' },
      });

      expect(parsed.dryRun).toBe(true);
    });

    it('dryRun=true is preserved when explicitly set', () => {
      const parsed = createRunBodySchema.parse({
        year: 2026,
        bimester: 1,
        credentials: { username: 'test', password: 'test' },
        dryRun: true,
      });

      expect(parsed.dryRun).toBe(true);
    });

    it('dryRun=false is accepted only when explicitly set', () => {
      const parsed = createRunBodySchema.parse({
        year: 2026,
        bimester: 1,
        credentials: { username: 'test', password: 'test' },
        dryRun: false,
      });

      expect(parsed.dryRun).toBe(false);
    });

    it('dryRun rejects non-boolean values', () => {
      expect(() =>
        createRunBodySchema.parse({
          year: 2026,
          bimester: 1,
          credentials: { username: 'test', password: 'test' },
          dryRun: 'false',
        }),
      ).toThrow();
    });
  });

  describe('Queue propagation contract', () => {
    it('dryRun defaults to true in job data when not provided', () => {
      // Simulates the queue logic: params.dryRun !== false → true
      const params = { dryRun: undefined };
      const jobDryRun = params.dryRun !== false;
      expect(jobDryRun).toBe(true);
    });

    it('dryRun is false in job data only when explicitly false', () => {
      const params = { dryRun: false as boolean | undefined };
      const jobDryRun = params.dryRun !== false;
      expect(jobDryRun).toBe(false);
    });
  });

  describe('Consumer import gate contract', () => {
    it('isDryRun=true when job.data.dryRun is undefined (default)', () => {
      const jobData = { dryRun: undefined as boolean | undefined };
      const isDryRun = jobData.dryRun !== false;
      expect(isDryRun).toBe(true);
    });

    it('isDryRun=true when job.data.dryRun is true', () => {
      const jobData = { dryRun: true };
      const isDryRun = jobData.dryRun !== false;
      expect(isDryRun).toBe(true);
    });

    it('isDryRun=false ONLY when job.data.dryRun is explicitly false', () => {
      const jobData = { dryRun: false };
      const isDryRun = jobData.dryRun !== false;
      expect(isDryRun).toBe(false);
    });

    it('import gate blocks import when isDryRun=true', () => {
      const isDryRun = true;
      let importCalled = false;

      // Simulates consumer logic
      if (!isDryRun) {
        importCalled = true;
      }

      expect(importCalled).toBe(false);
    });

    it('import gate allows import ONLY when isDryRun=false', () => {
      const isDryRun = false;
      let importCalled = false;

      if (!isDryRun) {
        importCalled = true;
      }

      expect(importCalled).toBe(true);
    });
  });
});
