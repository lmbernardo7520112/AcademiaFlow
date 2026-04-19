import { env } from './env.js';

/**
 * Application mode configuration.
 * Derives operational flags from the single APP_MODE environment variable.
 *
 * - 'demo': All features enabled (self-service registration, onboarding, etc.)
 * - 'school_production': Hardened mode — no self-provisioning, restricted roles.
 */
export const APP_MODE = env.APP_MODE;

/** True when self-service registration and onboarding are available. */
export const isSelfServiceEnabled = APP_MODE === 'demo';

/** True when running in school production (hardened) mode. */
export const isSchoolProduction = APP_MODE === 'school_production';

/** The only roles that are operationally valid in school_production. */
export const OPERATIONAL_ROLES = ['admin', 'secretaria', 'professor'] as const;
