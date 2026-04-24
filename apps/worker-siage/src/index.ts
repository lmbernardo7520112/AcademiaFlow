/**
 * @module @academiaflow/worker-siage
 *
 * BullMQ consumer for SIAGE interoperability jobs.
 * Runs as a separate process from the Fastify API.
 */

export const WORKER_VERSION = '0.2.0' as const;

// Re-export modules for external consumption
export { encryptCredentials, decryptCredentials, type SecretEnvelope, type SiageCredentials } from './secret-envelope.js';
export { SiageApiClient, type ApiClientConfig } from './api-client.js';
export { RetryableError, NonRetryableError, classifyError } from './errors.js';
export { createJobProcessor, createSiageWorker, SIAGE_QUEUE_NAME, type SiageSyncJobData, type ExtractedRecord, type BridgeExecutor } from './consumer.js';
export { getWorkerEnv, resetWorkerEnv, type WorkerEnv } from './env.js';
