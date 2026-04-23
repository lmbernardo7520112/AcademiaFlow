import { describe, it, expect } from 'vitest';
import {
  siageRunStatusSchema,
  siageMatchStatusSchema,
  siageImportStatusSchema,
  siageSourceRecordSchema,
  siageRunStatsSchema,
  siageRunSchema,
  createSiageRunSchema,
  siageRunItemSchema,
  SIAGE_RUN_STATUS,
  SIAGE_MATCH_STATUS,
  SIAGE_IMPORT_STATUS,
  SIAGE_TERMINAL_STATUSES,
} from './siage.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VALID_OID = 'a'.repeat(24);

function makeSourceRecord(overrides = {}) {
  return {
    alunoName: 'João Silva',
    matricula: '2026001',
    disciplinaName: 'Matemática',
    turmaName: '1ºA',
    bimester: 1,
    value: 8.5,
    ...overrides,
  };
}

function makeRunStats(overrides = {}) {
  return {
    total: 10,
    matched: 8,
    imported: 7,
    skipped: 1,
    errors: 0,
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('siage schemas', () => {
  // ── Enums ──

  describe('siageRunStatusSchema', () => {
    it('accepts all 8 valid statuses', () => {
      const statuses = Object.values(SIAGE_RUN_STATUS);
      expect(statuses).toHaveLength(8);
      for (const status of statuses) {
        expect(siageRunStatusSchema.parse(status)).toBe(status);
      }
    });

    it('rejects invalid status', () => {
      expect(() => siageRunStatusSchema.parse('INVALID')).toThrow();
    });
  });

  describe('SIAGE_TERMINAL_STATUSES', () => {
    it('has exactly 3 terminal statuses', () => {
      expect(SIAGE_TERMINAL_STATUSES).toHaveLength(3);
    });

    it('includes COMPLETED, FAILED, CANCELLED', () => {
      expect(SIAGE_TERMINAL_STATUSES).toContain('COMPLETED');
      expect(SIAGE_TERMINAL_STATUSES).toContain('FAILED');
      expect(SIAGE_TERMINAL_STATUSES).toContain('CANCELLED');
    });

    it('excludes non-terminal statuses', () => {
      expect(SIAGE_TERMINAL_STATUSES).not.toContain('QUEUED');
      expect(SIAGE_TERMINAL_STATUSES).not.toContain('RUNNING');
      expect(SIAGE_TERMINAL_STATUSES).not.toContain('EXTRACTING');
      expect(SIAGE_TERMINAL_STATUSES).not.toContain('MATCHING');
      expect(SIAGE_TERMINAL_STATUSES).not.toContain('IMPORTING');
    });
  });

  describe('siageMatchStatusSchema', () => {
    it('accepts all 4 match statuses', () => {
      const statuses = Object.values(SIAGE_MATCH_STATUS);
      expect(statuses).toHaveLength(4);
      for (const status of statuses) {
        expect(siageMatchStatusSchema.parse(status)).toBe(status);
      }
    });

    it('rejects invalid match status', () => {
      expect(() => siageMatchStatusSchema.parse('FUZZY_MATCHED')).toThrow();
    });
  });

  describe('siageImportStatusSchema', () => {
    it('accepts all 3 import statuses', () => {
      const statuses = Object.values(SIAGE_IMPORT_STATUS);
      expect(statuses).toHaveLength(3);
      for (const status of statuses) {
        expect(siageImportStatusSchema.parse(status)).toBe(status);
      }
    });

    it('rejects invalid import status', () => {
      expect(() => siageImportStatusSchema.parse('pending')).toThrow();
    });
  });

  // ── Source Record ──

  describe('siageSourceRecordSchema', () => {
    it('accepts valid source record', () => {
      const record = siageSourceRecordSchema.parse(makeSourceRecord());
      expect(record.alunoName).toBe('João Silva');
      expect(record.value).toBe(8.5);
    });

    it('rejects empty alunoName', () => {
      expect(() => siageSourceRecordSchema.parse(
        makeSourceRecord({ alunoName: '' }),
      )).toThrow();
    });

    it('rejects empty matricula', () => {
      expect(() => siageSourceRecordSchema.parse(
        makeSourceRecord({ matricula: '' }),
      )).toThrow();
    });

    it('rejects grade above 10', () => {
      expect(() => siageSourceRecordSchema.parse(
        makeSourceRecord({ value: 11 }),
      )).toThrow();
    });

    it('rejects grade below 0', () => {
      expect(() => siageSourceRecordSchema.parse(
        makeSourceRecord({ value: -1 }),
      )).toThrow();
    });

    it('rejects invalid bimester', () => {
      expect(() => siageSourceRecordSchema.parse(
        makeSourceRecord({ bimester: 6 }),
      )).toThrow();
    });

    it('accepts bimester 5 (PF)', () => {
      const record = siageSourceRecordSchema.parse(
        makeSourceRecord({ bimester: 5 }),
      );
      expect(record.bimester).toBe(5);
    });
  });

  // ── Run Stats ──

  describe('siageRunStatsSchema', () => {
    it('accepts valid stats', () => {
      const stats = siageRunStatsSchema.parse(makeRunStats());
      expect(stats.total).toBe(10);
      expect(stats.imported).toBe(7);
    });

    it('accepts zeroed stats', () => {
      const stats = siageRunStatsSchema.parse(makeRunStats({
        total: 0, matched: 0, imported: 0, skipped: 0, errors: 0,
      }));
      expect(stats.total).toBe(0);
    });

    it('rejects negative values', () => {
      expect(() => siageRunStatsSchema.parse(
        makeRunStats({ total: -1 }),
      )).toThrow();
    });
  });

  // ── Create SiageRun Payload ──

  describe('createSiageRunSchema', () => {
    it('accepts valid payload with turma filter', () => {
      const payload = createSiageRunSchema.parse({
        turmaFilter: '1ºA',
        year: 2026,
        bimester: 1,
        credentials: { user: 'admin', password: 'secret' },
      });
      expect(payload.turmaFilter).toBe('1ºA');
      expect(payload.credentials.user).toBe('admin');
    });

    it('accepts payload without turma filter', () => {
      const payload = createSiageRunSchema.parse({
        year: 2026,
        bimester: 2,
        credentials: { user: 'admin', password: 'pass' },
      });
      expect(payload.turmaFilter).toBeUndefined();
    });

    it('rejects missing credentials', () => {
      expect(() => createSiageRunSchema.parse({
        year: 2026,
        bimester: 1,
      })).toThrow();
    });

    it('rejects empty credential user', () => {
      expect(() => createSiageRunSchema.parse({
        year: 2026,
        bimester: 1,
        credentials: { user: '', password: 'pass' },
      })).toThrow();
    });

    it('rejects empty credential password', () => {
      expect(() => createSiageRunSchema.parse({
        year: 2026,
        bimester: 1,
        credentials: { user: 'admin', password: '' },
      })).toThrow();
    });

    it('rejects year out of academic range', () => {
      expect(() => createSiageRunSchema.parse({
        year: 2019,
        bimester: 1,
        credentials: { user: 'admin', password: 'pass' },
      })).toThrow();
    });
  });

  // ── SiageRun ──

  describe('siageRunSchema', () => {
    it('accepts valid run', () => {
      const run = siageRunSchema.parse({
        id: VALID_OID,
        tenantId: VALID_OID,
        status: 'QUEUED',
        year: 2026,
        bimester: 1,
        stats: makeRunStats(),
        createdBy: VALID_OID,
      });
      expect(run.status).toBe('QUEUED');
      expect(run.stats.total).toBe(10);
    });

    it('accepts run with optional fields populated', () => {
      const run = siageRunSchema.parse({
        id: VALID_OID,
        tenantId: VALID_OID,
        status: 'FAILED',
        startedAt: '2026-04-23T10:00:00Z',
        completedAt: '2026-04-23T10:05:00Z',
        turmaFilter: '2ºB',
        year: 2026,
        bimester: 3,
        stats: makeRunStats(),
        createdBy: VALID_OID,
        errorMessage: 'SIAGE login failed: invalid credentials',
      });
      expect(run.errorMessage).toBe('SIAGE login failed: invalid credentials');
      expect(run.turmaFilter).toBe('2ºB');
    });

    it('rejects invalid ObjectId', () => {
      expect(() => siageRunSchema.parse({
        id: 'not-an-oid',
        tenantId: VALID_OID,
        status: 'QUEUED',
        year: 2026,
        bimester: 1,
        stats: makeRunStats(),
        createdBy: VALID_OID,
      })).toThrow();
    });
  });

  // ── SiageRunItem ──

  describe('siageRunItemSchema', () => {
    it('accepts auto-matched item with import result', () => {
      const item = siageRunItemSchema.parse({
        id: VALID_OID,
        runId: VALID_OID,
        tenantId: VALID_OID,
        source: makeSourceRecord(),
        matchResult: {
          alunoId: VALID_OID,
          disciplinaId: VALID_OID,
          turmaId: VALID_OID,
          matchStatus: 'AUTO_MATCHED',
        },
        importResult: {
          notaId: VALID_OID,
          status: 'imported',
        },
      });
      expect(item.matchResult.matchStatus).toBe('AUTO_MATCHED');
      expect(item.importResult?.status).toBe('imported');
    });

    it('accepts unmatched item without import result', () => {
      const item = siageRunItemSchema.parse({
        id: VALID_OID,
        runId: VALID_OID,
        tenantId: VALID_OID,
        source: makeSourceRecord(),
        matchResult: {
          matchStatus: 'UNMATCHED',
        },
      });
      expect(item.matchResult.matchStatus).toBe('UNMATCHED');
      expect(item.importResult).toBeUndefined();
    });

    it('accepts error import result with reason', () => {
      const item = siageRunItemSchema.parse({
        id: VALID_OID,
        runId: VALID_OID,
        tenantId: VALID_OID,
        source: makeSourceRecord(),
        matchResult: {
          alunoId: VALID_OID,
          disciplinaId: VALID_OID,
          matchStatus: 'AUTO_MATCHED',
        },
        importResult: {
          status: 'error',
          reason: 'Duplicate key violation',
        },
      });
      expect(item.importResult?.status).toBe('error');
      expect(item.importResult?.reason).toBe('Duplicate key violation');
    });

    it('rejects missing matchResult', () => {
      expect(() => siageRunItemSchema.parse({
        id: VALID_OID,
        runId: VALID_OID,
        tenantId: VALID_OID,
        source: makeSourceRecord(),
      })).toThrow();
    });
  });
});
