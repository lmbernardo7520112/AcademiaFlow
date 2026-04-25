/**
 * @module siage-queue
 * BullMQ queue producer for SIAGE sync jobs.
 * Used by the API to enqueue jobs when a human creates a run.
 *
 * Also contains a minimal encrypt function (same AES-256-GCM as the worker)
 * to avoid circular workspace dependencies (API cannot import from worker).
 */
import { Queue } from 'bullmq';
import { createCipheriv, randomBytes, scryptSync } from 'node:crypto';
import { env } from '../../config/env.js';

const SIAGE_QUEUE_NAME = 'siage-sync';
const ALGORITHM = 'aes-256-gcm' as const;
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

interface SecretEnvelope {
  encrypted: string;
  iv: string;
  tag: string;
}

/** Encrypt SIAGE credentials for ephemeral job transport. */
function encryptCredentials(
  credentials: { username: string; password: string },
  runId: string,
  masterKey: string,
): SecretEnvelope {
  const key = scryptSync(masterKey, runId, KEY_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const plaintext = JSON.stringify(credentials);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    encrypted: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  };
}

let _queue: Queue | null = null;

function getQueue(): Queue {
  if (!_queue) {
    const redisUrl = new URL(env.REDIS_URL);
    _queue = new Queue(SIAGE_QUEUE_NAME, {
      connection: {
        host: redisUrl.hostname,
        port: parseInt(redisUrl.port || '6379', 10),
        password: redisUrl.password || undefined,
      },
    });
  }
  return _queue;
}

/**
 * Enqueue a SIAGE sync job.
 * Called by the run creation route after persisting the SiageRun document.
 * Credentials are encrypted into an ephemeral envelope — never stored in DB.
 */
export async function enqueueSiageSyncJob(params: {
  runId: string;
  tenantId: string;
  year: number;
  bimester: number;
  turmaFilter?: string;
  credentials: { username: string; password: string };
}): Promise<string> {
  // In test mode, skip actual Redis connection — run stays QUEUED
  if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
    return params.runId;
  }

  const envelope = encryptCredentials(
    params.credentials,
    params.runId,
    env.SIAGE_ENVELOPE_KEY,
  );

  const queue = getQueue();
  const job = await queue.add(
    `sync-${params.runId}`,
    {
      runId: params.runId,
      tenantId: params.tenantId,
      year: params.year,
      bimester: params.bimester,
      turmaFilter: params.turmaFilter,
      envelope,
    },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    },
  );

  return job.id ?? params.runId;
}

/** Close queue connection (for graceful shutdown) */
export async function closeSiageQueue(): Promise<void> {
  if (_queue) {
    await _queue.close();
    _queue = null;
  }
}
