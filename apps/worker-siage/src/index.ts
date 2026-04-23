/**
 * @module @academiaflow/worker-siage
 *
 * BullMQ consumer for SIAGE interoperability jobs.
 * Responsible for:
 * - Consuming sync jobs from the BullMQ queue — E4
 * - Decrypting the secret envelope — E4
 * - Invoking @academiaflow/siage-bridge for extraction — E4
 * - Posting extracted records to the API — E4
 *
 * This process runs separately from the Fastify API to isolate
 * Playwright/Chromium resource usage.
 */

// Placeholder — real consumer arrives in Epic E4
export const WORKER_VERSION = '0.1.0' as const;
