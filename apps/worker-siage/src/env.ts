/**
 * @module env
 * Worker environment configuration (Zod-validated).
 */
import { z } from 'zod';

const workerEnvSchema = z.object({
  /** Redis connection string for BullMQ */
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  /** API base URL for internal calls */
  API_BASE_URL: z.string().url().default('http://localhost:3000'),
  /** Shared secret matching API's SIAGE_WORKER_SECRET */
  SIAGE_WORKER_SECRET: z.string().min(16).default('dev-worker-secret-not-for-production'),
  /** Master key for secret envelope encryption */
  SIAGE_ENVELOPE_KEY: z.string().min(16).default('dev-envelope-key-not-for-production'),
  /** BullMQ concurrency (1 = sequential) */
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(4).default(1),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type WorkerEnv = z.infer<typeof workerEnvSchema>;

let _env: WorkerEnv | null = null;

export function getWorkerEnv(): WorkerEnv {
  if (!_env) {
    const result = workerEnvSchema.safeParse(process.env);
    if (!result.success) {
      console.error('❌ Worker env validation failed:', result.error.format());
      throw new Error('Invalid worker environment');
    }
    _env = result.data;
  }
  return _env;
}

/** Reset cached env (for testing) */
export function resetWorkerEnv(): void {
  _env = null;
}
