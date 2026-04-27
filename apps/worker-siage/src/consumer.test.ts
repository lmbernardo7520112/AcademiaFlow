import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createJobProcessor, type ExtractedRecord, type BridgeExecutor, type SiageSyncJobData } from './consumer.js';
import { encryptCredentials } from './secret-envelope.js';
import type { SiageApiClient } from './api-client.js';
import type { Job } from 'bullmq';

const ENVELOPE_KEY = 'test-envelope-key-at-least-16ch';
const RUN_ID = '507f1f77bcf86cd799439011';
const TENANT_ID = 'tenant-abc-123';

function createMockApiClient(): SiageApiClient & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    updateRunStatus: vi.fn(async (runId: string, _tid: string, status: string) => {
      calls.push(`status:${status}`);
      return { success: true, data: { status } };
    }),
    ingestItems: vi.fn(async () => {
      calls.push('ingest');
      return { success: true, data: { total: 2, matched: 1, unmatched: 1, pending: 0 } };
    }),
    triggerImport: vi.fn(async () => {
      calls.push('import');
      return { success: true, data: { imported: 1, notRegistered: 0, errors: 0 } };
    }),
  } as unknown as SiageApiClient & { calls: string[] };
}

function createMockJob(data: SiageSyncJobData): Job<SiageSyncJobData> {
  return { data, id: 'test-job-1' } as Job<SiageSyncJobData>;
}

describe('Consumer Job Processor', () => {
  let mockApi: ReturnType<typeof createMockApiClient>;
  let mockBridge: BridgeExecutor;
  const sampleRecords: ExtractedRecord[] = [
    { alunoName: 'João', matriculaSiage: 'uuid-1', disciplinaName: 'Biologia', turmaName: 'Turma A', bimester: 1, value: 7.5 },
    { alunoName: 'Maria', matriculaSiage: 'uuid-2', disciplinaName: 'Biologia', turmaName: 'Turma A', bimester: 1, value: null },
  ];

  beforeEach(() => {
    mockApi = createMockApiClient();
    mockBridge = vi.fn(async () => sampleRecords);
  });

  it('processes a successful job end-to-end (dryRun=true by default — no import)', async () => {
    const envelope = encryptCredentials(
      { username: 'fake-user@example.test', password: 'FAKE_PLACEHOLDER_1' },
      RUN_ID, ENVELOPE_KEY,
    );
    const processor = createJobProcessor(mockApi, mockBridge, ENVELOPE_KEY);
    const job = createMockJob({
      runId: RUN_ID, tenantId: TENANT_ID, year: 2026, bimester: 1, envelope,
    });

    await processor(job);

    // Verify lifecycle: EXTRACTING → MATCHING → COMPLETED (no IMPORTING, no import)
    expect(mockApi.calls).toEqual([
      'status:EXTRACTING', 'status:MATCHING', 'ingest', 'status:COMPLETED',
    ]);
    expect(mockApi.triggerImport).not.toHaveBeenCalled();
  });

  it('triggers import when dryRun is explicitly false', async () => {
    const envelope = encryptCredentials(
      { username: 'fake-user@example.test', password: 'FAKE_PLACEHOLDER_1' },
      RUN_ID, ENVELOPE_KEY,
    );
    const processor = createJobProcessor(mockApi, mockBridge, ENVELOPE_KEY);
    const job = createMockJob({
      runId: RUN_ID, tenantId: TENANT_ID, year: 2026, bimester: 1, envelope, dryRun: false,
    });

    await processor(job);

    // Verify lifecycle: EXTRACTING → MATCHING → IMPORTING → COMPLETED
    expect(mockApi.calls).toEqual([
      'status:EXTRACTING', 'status:MATCHING', 'ingest', 'status:IMPORTING', 'import', 'status:COMPLETED',
    ]);
    expect(mockApi.triggerImport).toHaveBeenCalled();
  });

  it('sets FAILED status on decryption error (non-retryable)', async () => {
    const badEnvelope = { encrypted: 'bad', iv: 'bad', tag: 'bad' };
    const processor = createJobProcessor(mockApi, mockBridge, ENVELOPE_KEY);
    const job = createMockJob({
      runId: RUN_ID, tenantId: TENANT_ID, year: 2026, bimester: 1, envelope: badEnvelope,
    });

    await expect(processor(job)).rejects.toThrow('will not retry');
    expect(mockApi.calls).toContain('status:EXTRACTING');
    expect(mockApi.calls).toContain('status:FAILED');
  });

  it('sets FAILED on bridge extraction error (non-retryable by default)', async () => {
    const envelope = encryptCredentials(
      { username: 'x', password: 'y' }, RUN_ID, ENVELOPE_KEY,
    );
    const failingBridge: BridgeExecutor = vi.fn(async () => {
      throw new Error('Invalid SIAGE credentials');
    });
    const processor = createJobProcessor(mockApi, failingBridge, ENVELOPE_KEY);
    const job = createMockJob({
      runId: RUN_ID, tenantId: TENANT_ID, year: 2026, bimester: 1, envelope,
    });

    await expect(processor(job)).rejects.toThrow();
    expect(mockApi.calls).toContain('status:FAILED');
  });

  it('rethrows retryable bridge errors for BullMQ retry', async () => {
    const envelope = encryptCredentials(
      { username: 'x', password: 'y' }, RUN_ID, ENVELOPE_KEY,
    );
    const timeoutBridge: BridgeExecutor = vi.fn(async () => {
      throw new Error('Connection timeout to SIAGE');
    });
    const processor = createJobProcessor(mockApi, timeoutBridge, ENVELOPE_KEY);
    const job = createMockJob({
      runId: RUN_ID, tenantId: TENANT_ID, year: 2026, bimester: 1, envelope,
    });

    // Retryable errors should propagate (not UnrecoverableError)
    await expect(processor(job)).rejects.toThrow('timeout');
    expect(mockApi.calls).toContain('status:FAILED');
  });

  it('handles empty extraction result gracefully', async () => {
    const envelope = encryptCredentials(
      { username: 'x', password: 'y' }, RUN_ID, ENVELOPE_KEY,
    );
    const emptyBridge: BridgeExecutor = vi.fn(async () => []);
    const processor = createJobProcessor(mockApi, emptyBridge, ENVELOPE_KEY);
    const job = createMockJob({
      runId: RUN_ID, tenantId: TENANT_ID, year: 2026, bimester: 1, envelope,
    });

    await processor(job);

    // No ingest call when records are empty, no import (dryRun default)
    expect(mockApi.calls).toEqual([
      'status:EXTRACTING', 'status:MATCHING', 'status:COMPLETED',
    ]);
    expect(mockApi.ingestItems).not.toHaveBeenCalled();
    expect(mockApi.triggerImport).not.toHaveBeenCalled();
  });

  it('bridge receives decrypted credentials (not the envelope)', async () => {
    const creds = { username: 'fixture-user@example.test', password: 'FAKE_PLACEHOLDER_2' };
    const envelope = encryptCredentials(creds, RUN_ID, ENVELOPE_KEY);
    const spyBridge: BridgeExecutor = vi.fn(async () => []);
    const processor = createJobProcessor(mockApi, spyBridge, ENVELOPE_KEY);
    const job = createMockJob({
      runId: RUN_ID, tenantId: TENANT_ID, year: 2026, bimester: 1, envelope,
    });

    await processor(job);

    expect(spyBridge).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'fixture-user@example.test', password: 'FAKE_PLACEHOLDER_2' }),
    );
  });

  it('never logs or exposes credentials', async () => {
    const creds = { username: 'leak-check@example.test', password: 'FAKE_LEAK_CHECK_VALUE' };
    const envelope = encryptCredentials(creds, RUN_ID, ENVELOPE_KEY);
    const processor = createJobProcessor(mockApi, mockBridge, ENVELOPE_KEY);
    const job = createMockJob({
      runId: RUN_ID, tenantId: TENANT_ID, year: 2026, bimester: 1, envelope,
    });

    await processor(job);

    // Verify credentials don't appear in any API call arguments
    const allCalls = JSON.stringify((mockApi.updateRunStatus as ReturnType<typeof vi.fn>).mock.calls);
    expect(allCalls).not.toContain('FAKE_LEAK_CHECK_VALUE');
    expect(allCalls).not.toContain('leak-check@example.test');
  });
});
