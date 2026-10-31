import { describe, it, expect } from 'vitest';
import { getStatus, DRIFTLENS_VERSION } from '../src/index.js';

describe('DriftLens Smoke Test', () => {
  it('returns valid status and version', () => {
    const status = getStatus();
    expect(status.name).toBe('DriftLens');
    expect(status.version).toBe(DRIFTLENS_VERSION);
    expect(status.status).toBe('ready');
  });
});

