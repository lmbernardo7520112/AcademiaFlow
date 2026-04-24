import { describe, it, expect } from 'vitest';
import { BRIDGE_VERSION } from './index.js';

describe('siage-bridge', () => {
  it('exports BRIDGE_VERSION 0.2.0', () => {
    expect(BRIDGE_VERSION).toBe('0.2.0');
  });
});
