/**
 * @module consumer
 * BullMQ consumer for SIAGE sync jobs.
 *
 * Flow:
 * 1. Receive job from queue
 * 2. Decrypt credentials from envelope
 * 3. Update run status → RUNNING
 * 4. Execute bridge extraction (via injected bridgeExecutor)
 * 5. Send extracted records to API internal endpoint
 * 6. If dryRun=false: trigger import into Nota collection
 * 7. Update run status → COMPLETED or FAILED
 *
 * dryRun (default: true) controls whether matched items are
 * automatically promoted to the Nota collection. When true,
 * items stay in SiageRunItem staging only.
 */
import { Worker, type Job, UnrecoverableError } from 'bullmq';
import { decryptCredentials, type SecretEnvelope } from './secret-envelope.js';
import { SiageApiClient } from './api-client.js';
import { classifyError, RetryableError } from './errors.js';
import { getWorkerEnv } from './env.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export const SIAGE_QUEUE_NAME = 'siage-sync' as const;

export interface SiageSyncJobData {
  runId: string;
  tenantId: string;
  year: number;
  bimester: number;
  turmaFilter?: string;
  envelope: SecretEnvelope;
  /**
   * When true (default), the job performs extraction + matching only.
   * Items stay in SiageRunItem staging — no writes to Nota.
   * When false, matched items are imported into the Nota collection.
   */
  dryRun?: boolean;
}

export interface ExtractedRecord {
  alunoName: string;
  matriculaSiage: string;
  disciplinaName: string;
  turmaName: string;
  bimester: number;
  value: number | null;
}

/** Injected bridge function (decoupled from Playwright for testing) */
export type BridgeExecutor = (params: {
  username: string;
  password: string;
  year: number;
  bimester: number;
  turmaFilter?: string;
}) => Promise<ExtractedRecord[]>;

// ─── Processor ───────────────────────────────────────────────────────────────

export function createJobProcessor(
  apiClient: SiageApiClient,
  bridgeExecutor: BridgeExecutor,
  envelopeKey: string,
) {
  return async function processJob(job: Job<SiageSyncJobData>): Promise<void> {
    const { runId, tenantId, year, bimester, turmaFilter, envelope } = job.data;

    // Step 1: Update status → EXTRACTING
    await apiClient.updateRunStatus(runId, tenantId, 'EXTRACTING');

    // Step 2: Decrypt credentials
    let credentials;
    try {
      credentials = decryptCredentials(envelope, runId, envelopeKey);
    } catch {
      await apiClient.updateRunStatus(runId, tenantId, 'FAILED', 'Failed to decrypt credentials');
      throw new UnrecoverableError('Credential decryption failed — will not retry');
    }

    // Step 3: Execute bridge extraction
    let records: ExtractedRecord[];
    try {
      records = await bridgeExecutor({
        username: credentials.username,
        password: credentials.password,
        year,
        bimester,
        turmaFilter,
      });
    } catch (err) {
      const classified = classifyError(err);
      if (classified instanceof RetryableError) {
        await apiClient.updateRunStatus(runId, tenantId, 'FAILED', `Extraction failed (retryable): ${classified.message}`);
        throw err; // BullMQ will retry
      }
      await apiClient.updateRunStatus(runId, tenantId, 'FAILED', `Extraction failed: ${classified.message}`);
      throw new UnrecoverableError(classified.message);
    }

    // Step 4: Update status → MATCHING
    await apiClient.updateRunStatus(runId, tenantId, 'MATCHING');

    // Step 5: Send records to API for matching
    if (records.length > 0) {
      // Batch in chunks of 100 to avoid payload size issues
      const BATCH_SIZE = 100;
      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);
        await apiClient.ingestItems(runId, tenantId, batch);
      }
    }

    // Step 6: Import (only if dryRun is explicitly false)
    const isDryRun = job.data.dryRun !== false; // default: true (staging only)
    if (isDryRun) {
      console.log(`  → dryRun=true — skipping import into Nota. Items stay in staging.`);
    } else {
      // Step 6a: Update status → IMPORTING
      await apiClient.updateRunStatus(runId, tenantId, 'IMPORTING');

      // Step 6b: Trigger import
      await apiClient.triggerImport(runId, tenantId);
    }

    // Step 7: Update status → COMPLETED
    await apiClient.updateRunStatus(runId, tenantId, 'COMPLETED');

    // Clear credentials from memory
    credentials.username = '';
    credentials.password = '';
  };
}

// ─── Worker Factory ──────────────────────────────────────────────────────────

export function createSiageWorker(bridgeExecutor: BridgeExecutor): Worker<SiageSyncJobData> {
  const env = getWorkerEnv();

  const redisUrl = new URL(env.REDIS_URL);
  const connection = {
    host: redisUrl.hostname,
    port: parseInt(redisUrl.port || '6379', 10),
    password: redisUrl.password || undefined,
  };

  const apiClient = new SiageApiClient({
    baseUrl: env.API_BASE_URL,
    workerSecret: env.SIAGE_WORKER_SECRET,
  });

  const processor = createJobProcessor(apiClient, bridgeExecutor, env.SIAGE_ENVELOPE_KEY);

  const worker = new Worker<SiageSyncJobData>(
    SIAGE_QUEUE_NAME,
    processor,
    {
      connection,
      concurrency: env.WORKER_CONCURRENCY,
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    },
  );

  worker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completed (run: ${job.data.runId})`);
  });

  worker.on('failed', (job, err) => {
    // NEVER log credentials
    const safeMessage = err.message.replace(/password|secret|credential/gi, '[REDACTED]');
    console.error(`❌ Job ${job?.id} failed (run: ${job?.data.runId}): ${safeMessage}`);
  });

  return worker;
}
