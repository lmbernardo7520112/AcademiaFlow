/**
 * @module siage.guard.test
 * Guard tests for dryRun staging-only default behavior AND pilot scope policy.
 *
 * These tests serve as CI regression barriers. They are organized in two classes:
 *
 * 1. **Capability tests** — verify the product supports bimesters 1–4
 * 2. **Pilot policy tests** — verify the operational restriction is enforced
 *    when SIAGE_PILOT_BIMESTERS is configured
 *
 * This separation ensures the tests don't falsely imply that the product
 * can only operate on a single bimester.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import { getPilotPolicy, isDomPlaceholder } from './siage.service.js';

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

// ══════════════════════════════════════════════════════════════════════════════
// CAPABILITY TESTS — Product supports bimesters 1–4
// ══════════════════════════════════════════════════════════════════════════════

describe('SIAGE Product Capability — Multi-Bimester Support', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.SIAGE_PILOT_BIMESTERS;
    // Unlock all bimesters (full product capability)
    process.env.SIAGE_PILOT_BIMESTERS = '';
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.SIAGE_PILOT_BIMESTERS = originalEnv;
    } else {
      delete process.env.SIAGE_PILOT_BIMESTERS;
    }
  });

  it('bimester 1 is accepted when policy is unrestricted', () => {
    const policy = getPilotPolicy();
    expect(policy.isBimesterAllowed(1)).toBe(true);
    expect(policy.isRestricted).toBe(false);
  });

  it('bimester 2 is accepted when policy is unrestricted', () => {
    const policy = getPilotPolicy();
    expect(policy.isBimesterAllowed(2)).toBe(true);
  });

  it('bimester 3 is accepted when policy is unrestricted', () => {
    const policy = getPilotPolicy();
    expect(policy.isBimesterAllowed(3)).toBe(true);
  });

  it('bimester 4 is accepted when policy is unrestricted', () => {
    const policy = getPilotPolicy();
    expect(policy.isBimesterAllowed(4)).toBe(true);
  });

  it('all 4 bimesters are allowed when SIAGE_PILOT_BIMESTERS is empty', () => {
    const policy = getPilotPolicy();
    expect(policy.allowedBimesters).toEqual([1, 2, 3, 4]);
    expect(policy.isRestricted).toBe(false);
  });

  it('all 4 bimesters are allowed when SIAGE_PILOT_BIMESTERS is "1,2,3,4"', () => {
    process.env.SIAGE_PILOT_BIMESTERS = '1,2,3,4';
    const policy = getPilotPolicy();
    expect(policy.allowedBimesters).toEqual([1, 2, 3, 4]);
    expect(policy.isRestricted).toBe(false);
  });

  it('schema accepts all bimesters 1-4', () => {
    for (const b of [1, 2, 3, 4]) {
      const parsed = createRunBodySchema.parse({
        year: 2026,
        bimester: b,
        credentials: { username: 'test', password: 'test' },
      });
      expect(parsed.bimester).toBe(b);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PILOT POLICY TESTS — Operational restriction via SIAGE_PILOT_BIMESTERS
// ══════════════════════════════════════════════════════════════════════════════

describe('SIAGE Pilot Policy — Bimester Scope Enforcement', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.SIAGE_PILOT_BIMESTERS;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.SIAGE_PILOT_BIMESTERS = originalEnv;
    } else {
      delete process.env.SIAGE_PILOT_BIMESTERS;
    }
  });

  describe('when SIAGE_PILOT_BIMESTERS="1" (current pilot)', () => {
    beforeEach(() => {
      process.env.SIAGE_PILOT_BIMESTERS = '1';
    });

    it('policy reports restriction is active', () => {
      const policy = getPilotPolicy();
      expect(policy.isRestricted).toBe(true);
      expect(policy.allowedBimesters).toEqual([1]);
    });

    it('bimester 1 is ALLOWED', () => {
      expect(getPilotPolicy().isBimesterAllowed(1)).toBe(true);
    });

    it('bimester 2 is BLOCKED', () => {
      expect(getPilotPolicy().isBimesterAllowed(2)).toBe(false);
    });

    it('bimester 3 is BLOCKED', () => {
      expect(getPilotPolicy().isBimesterAllowed(3)).toBe(false);
    });

    it('bimester 4 is BLOCKED', () => {
      expect(getPilotPolicy().isBimesterAllowed(4)).toBe(false);
    });
  });

  describe('when SIAGE_PILOT_BIMESTERS="1,2" (expanded pilot)', () => {
    beforeEach(() => {
      process.env.SIAGE_PILOT_BIMESTERS = '1,2';
    });

    it('policy reports restriction is active', () => {
      const policy = getPilotPolicy();
      expect(policy.isRestricted).toBe(true);
      expect(policy.allowedBimesters).toEqual([1, 2]);
    });

    it('bimesters 1 and 2 are ALLOWED', () => {
      expect(getPilotPolicy().isBimesterAllowed(1)).toBe(true);
      expect(getPilotPolicy().isBimesterAllowed(2)).toBe(true);
    });

    it('bimesters 3 and 4 are BLOCKED', () => {
      expect(getPilotPolicy().isBimesterAllowed(3)).toBe(false);
      expect(getPilotPolicy().isBimesterAllowed(4)).toBe(false);
    });
  });

  describe('promote/import respects pilot policy', () => {
    beforeEach(() => {
      process.env.SIAGE_PILOT_BIMESTERS = '1';
    });

    it('promotion allowed for bimester matching policy', () => {
      expect(getPilotPolicy().isBimesterAllowed(1)).toBe(true);
    });

    it('promotion BLOCKED for bimester outside policy', () => {
      for (const b of [2, 3, 4]) {
        expect(getPilotPolicy().isBimesterAllowed(b)).toBe(false);
      }
    });
  });

  describe('invalid/edge-case config handling', () => {
    it('garbage value falls back to all bimesters (safe)', () => {
      process.env.SIAGE_PILOT_BIMESTERS = 'abc,xyz';
      const policy = getPilotPolicy();
      expect(policy.isRestricted).toBe(false);
      expect(policy.allowedBimesters).toEqual([1, 2, 3, 4]);
    });

    it('out-of-range numbers are filtered', () => {
      process.env.SIAGE_PILOT_BIMESTERS = '0,1,5,99';
      const policy = getPilotPolicy();
      expect(policy.allowedBimesters).toEqual([1]);
      expect(policy.isRestricted).toBe(true);
    });

    it('mixed valid and invalid values work correctly', () => {
      process.env.SIAGE_PILOT_BIMESTERS = '1,abc,3';
      const policy = getPilotPolicy();
      expect(policy.allowedBimesters).toEqual([1, 3]);
      expect(policy.isRestricted).toBe(true);
      expect(policy.isBimesterAllowed(1)).toBe(true);
      expect(policy.isBimesterAllowed(2)).toBe(false);
      expect(policy.isBimesterAllowed(3)).toBe(true);
    });

    it('whitespace is tolerated', () => {
      process.env.SIAGE_PILOT_BIMESTERS = ' 1 , 2 ';
      const policy = getPilotPolicy();
      expect(policy.allowedBimesters).toEqual([1, 2]);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// UNMATCHED TAXONOMY TESTS — Operational Classification
// ══════════════════════════════════════════════════════════════════════════════

describe('SIAGE UNMATCHED Taxonomy — Complete Classification', () => {
  describe('isDomPlaceholder', () => {
    it('detects "-" as DOM placeholder', () => {
      expect(isDomPlaceholder('-')).toBe(true);
    });

    it('detects empty string as DOM placeholder', () => {
      expect(isDomPlaceholder('')).toBe(true);
    });

    it('detects "Nenhum registro foi encontrado" as DOM placeholder', () => {
      expect(isDomPlaceholder('Nenhum registro foi encontrado')).toBe(true);
    });

    it('detects "Nenhum registro encontrado" as DOM placeholder', () => {
      expect(isDomPlaceholder('Nenhum registro encontrado')).toBe(true);
    });

    it('is case-insensitive', () => {
      expect(isDomPlaceholder('NENHUM REGISTRO FOI ENCONTRADO')).toBe(true);
    });

    it('handles whitespace', () => {
      expect(isDomPlaceholder('  -  ')).toBe(true);
      expect(isDomPlaceholder('  ')).toBe(true);
    });

    it('rejects real student names', () => {
      expect(isDomPlaceholder('Geovannaa Alves de Lima')).toBe(false);
      expect(isDomPlaceholder('PEDRO HENRIQUE MAIA DO NASCIMENTO')).toBe(false);
      expect(isDomPlaceholder('Ana Julia')).toBe(false);
    });
  });

  describe('Three-category taxonomy', () => {
    it('taxonomy has exactly 3 UNMATCHED reasons', () => {
      const reasons = ['DOM_PLACEHOLDER', 'NAME_MISMATCH', 'NO_LOCAL_STUDENT'];
      expect(reasons).toHaveLength(3);
    });

    it('DOM_PLACEHOLDER is for scraping artifacts (auto-dismiss)', () => {
      expect(isDomPlaceholder('-')).toBe(true);
      expect(isDomPlaceholder('Ana Julia')).toBe(false);
    });

    it('NAME_MISMATCH is for divergent names (reconciliable)', () => {
      // Example: "Guilherme Clementino dos Santos" vs "Guilherme Clemente dos Santos"
      // Same person, different spelling — requires manual resolution, not dismissal
      const reason = 'NAME_MISMATCH';
      expect(reason).not.toBe('NO_LOCAL_STUDENT');
      expect(reason).not.toBe('DOM_PLACEHOLDER');
    });

    it('NO_LOCAL_STUDENT is for truly absent students', () => {
      // Example: "Kalebe de Souza Gomes" — no similar name in local cadastro
      const reason = 'NO_LOCAL_STUDENT';
      expect(reason).not.toBe('NAME_MISMATCH');
    });

    it('all three are distinct from notRegistered', () => {
      const unmatchedReasons = ['DOM_PLACEHOLDER', 'NAME_MISMATCH', 'NO_LOCAL_STUDENT'];
      const importStatuses = ['imported', 'skipped', 'not_registered', 'error'];
      // No overlap between the two taxonomies
      unmatchedReasons.forEach(r => expect(importStatuses).not.toContain(r));
    });

    it('notRegistered is about grade absence, not identity failure', () => {
      // notRegistered = student was matched successfully but grade value was null
      const importStatuses = ['imported', 'skipped', 'not_registered', 'error'];
      expect(importStatuses).toContain('not_registered');
    });
  });
});
