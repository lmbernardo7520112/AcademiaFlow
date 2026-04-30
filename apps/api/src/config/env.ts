import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(10),
  JWT_SECRET: z.string().min(16),
  REFRESH_TOKEN_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
  APP_MODE: z.enum(['demo', 'school_production']).default('demo'),
  /** Shared secret for worker → API internal endpoints (X-Worker-Secret header) */
  SIAGE_WORKER_SECRET: z.string().min(16).default('dev-worker-secret-not-for-production'),
  /** Redis URL for BullMQ queue producer */
  REDIS_URL: z.string().default('redis://localhost:6379'),
  /** Master key for encrypting SIAGE credentials into job envelopes */
  SIAGE_ENVELOPE_KEY: z.string().min(16).default('dev-envelope-key-not-for-prod'),
  /**
   * Pilot scope policy: comma-separated bimesters allowed for SIAGE operations.
   * Default: '1' (current pilot restricts to 1st bimester).
   * Set to '' or '1,2,3,4' to unlock all bimesters (full product capability).
   * This is an operational policy, NOT a product limitation.
   */
  SIAGE_PILOT_BIMESTERS: z.string().default('1'),
  /**
   * Controls whether credential-based SIAGE sync (Playwright scraping) is allowed.
   * Default: 'disabled' — credential fields hidden, POST /runs with credentials returns 403.
   * Set to 'enabled' ONLY after formal authorization from the Secretaria de Educação.
   */
  SIAGE_CREDENTIAL_MODE: z.enum(['enabled', 'disabled']).default('disabled'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Configuração de variáveis de ambiente inválida:', _env.error.format());
  throw new Error('Variáveis de ambiente inválidas');
}

export const env = _env.data;
