/**
 * Application mode configuration for the frontend.
 * Reads VITE_APP_MODE from environment; defaults to 'demo' for local development.
 *
 * - 'demo': All features enabled (self-service registration, onboarding CTAs).
 * - 'school_production': Hardened — only login/access panel visible.
 */
const APP_MODE = import.meta.env.VITE_APP_MODE || 'demo';

/** True when self-service registration and onboarding CTAs should be shown. */
export const isSelfServiceEnabled = APP_MODE === 'demo';

/** True when running in school production (hardened) mode. */
export const isSchoolProduction = APP_MODE === 'school_production';
