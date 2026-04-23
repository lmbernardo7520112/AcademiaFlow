import { describe, it, expect } from 'vitest';
import { WORKER_VERSION } from './index.js';

describe('worker-siage', () => {
  it('exports WORKER_VERSION', () => {
    expect(WORKER_VERSION).toBe('0.1.0');
  });
});
