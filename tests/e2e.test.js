import { describe, it, expect, vi } from 'vitest';
import { runCLI } from '../src/cli.js';
import { analyzeLocalRepository } from '../src/index.js';
import { MockLLMClient } from '../src/ai/llmClient.js';

describe('End-to-End Pipeline & CLI', () => {
  it('returns 0 on --help', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exitCode = await runCLI(['--help']);
    expect(exitCode).toBe(0);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('runs analyzeLocalRepository and generates report', async () => {
    const mockClient = new MockLLMClient();
    const report = await analyzeLocalRepository({
      repoPath: process.cwd(),
      base: 'HEAD~1',
      head: 'HEAD',
      options: {
        llmClient: mockClient,
        minConfidence: 0.60
      }
    });

    expect(report).toBeDefined();
    expect(report.status).toBeDefined();
    expect(report.summary).toBeDefined();
    expect(Array.isArray(report.findings)).toBe(true);
  });
});

