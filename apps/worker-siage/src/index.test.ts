import { describe, it, expect } from 'vitest';
import { WORKER_VERSION, SIAGE_QUEUE_NAME } from './index.js';

describe('Worker SIAGE Bootstrap', () => {
  it('exports correct version', () => {
    expect(WORKER_VERSION).toBe('0.2.0');
  });

  it('exports queue name constant', () => {
    expect(SIAGE_QUEUE_NAME).toBe('siage-sync');
  });
});
