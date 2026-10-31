import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';

describe('Examples Verification', () => {
  it('verifies renamed-flag output exists and detected drift', async () => {
    const raw = await fs.readFile('examples/renamed-flag/output.json', 'utf8');
    const data = JSON.parse(raw);
    expect(data.status).toBe('FAIL');
    expect(data.findings).toHaveLength(1);
    expect(data.findings[0].source.entityName).toBe('--deadline');
    expect(data.findings[0].suggestion).toContain('--deadline');
  });

  it('verifies changed-default output exists and detected drift', async () => {
    const raw = await fs.readFile('examples/changed-default/output.json', 'utf8');
    const data = JSON.parse(raw);
    expect(data.status).toBe('FAIL');
    expect(data.findings).toHaveLength(1);
    expect(data.findings[0].source.entityName).toBe('DEFAULT_TIMEOUT');
    expect(data.findings[0].suggestion).toContain('60');
  });

  it('verifies no-drift output exists and confirmed PASS without false alarms', async () => {
    const raw = await fs.readFile('examples/no-drift/output.json', 'utf8');
    const data = JSON.parse(raw);
    expect(data.status).toBe('PASS');
    expect(data.findings).toHaveLength(0);
  });

  it('verifies config-table output exists and detected table row drift', async () => {
    const raw = await fs.readFile('examples/config-table/output.json', 'utf8');
    const data = JSON.parse(raw);
    expect(data.status).toBe('FAIL');
    expect(data.findings).toHaveLength(1);
    expect(data.findings[0].source.entityName).toBe('TIMEOUT_SECONDS');
    expect(data.findings[0].suggestion).toContain('60');
  });
});
