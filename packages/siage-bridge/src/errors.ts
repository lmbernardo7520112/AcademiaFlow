/**
 * @module errors
 * Typed errors for the SIAGE bridge anti-corruption layer.
 */

/** Base error for all SIAGE bridge operations */
export class SiageBridgeError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'SiageBridgeError';
  }
}

/** XHR response failed validation against expected schema */
export class SiageParseError extends SiageBridgeError {
  constructor(endpoint: string, details: string) {
    super(
      `Failed to parse SIAGE response from '${endpoint}': ${details}`,
      'PARSE_ERROR',
    );
    this.name = 'SiageParseError';
  }
}

/** SIAGE login failed (invalid credentials or unexpected page) */
export class SiageAuthError extends SiageBridgeError {
  constructor(details: string) {
    super(`SIAGE authentication failed: ${details}`, 'AUTH_ERROR');
    this.name = 'SiageAuthError';
  }
}

/** Expected navigation target not found (selector changed, page restructured) */
export class SiageNavigationError extends SiageBridgeError {
  constructor(step: string, details: string) {
    super(
      `SIAGE navigation failed at '${step}': ${details}`,
      'NAVIGATION_ERROR',
    );
    this.name = 'SiageNavigationError';
  }
}

/** Component is not BNCC — should be skipped */
export class SiageNonBnccError extends SiageBridgeError {
  constructor(componentName: string, componentType: string) {
    super(
      `Component '${componentName}' is not BNCC (type: '${componentType}'). Skipping.`,
      'NON_BNCC',
    );
    this.name = 'SiageNonBnccError';
  }
}

/**
 * PDF fallback is not yet implemented.
 * Placeholder for future PDF extraction capability.
 */
export class SiagePdfFallbackNotImplemented extends SiageBridgeError {
  constructor() {
    super(
      'PDF fallback extraction is not implemented in MVP. Use XHR-first strategy.',
      'PDF_FALLBACK_NOT_IMPLEMENTED',
    );
    this.name = 'SiagePdfFallbackNotImplemented';
  }
}
