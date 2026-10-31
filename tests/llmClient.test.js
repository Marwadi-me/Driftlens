import { describe, it, expect } from 'vitest';
import { validateLLMResult, parseJSONFromText } from '../src/ai/schemas.js';
import { MockLLMClient, createLLMClient } from '../src/ai/llmClient.js';

describe('schemas & parseJSONFromText', () => {
  it('validates compliant LLM drift response', () => {
    const valid = {
      drift: true,
      confidence: 0.96,
      severity: 'high',
      reason: 'The documented default timeout no longer matches the implementation.',
      evidence: [
        { source: 'src/config.js:1', fact: 'DEFAULT_TIMEOUT changed from 30 to 60' },
        { source: 'README.md:42', fact: 'Documentation still claims 30 seconds' }
      ],
      suggestion: 'The application waits for 60 seconds before timing out.'
    };

    const res = validateLLMResult(valid);
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it('rejects invalid schema missing required fields', () => {
    const invalid = {
      drift: 'maybe', // should be boolean
      confidence: 1.5 // out of range
    };

    const res = validateLLMResult(invalid);
    expect(res.valid).toBe(false);
    expect(res.errors.length).toBeGreaterThanOrEqual(3);
  });

  it('parses JSON wrapped inside markdown code fences', () => {
    const raw = `Here is the analysis:
\`\`\`json
{
  "drift": true,
  "confidence": 0.95,
  "severity": "high",
  "reason": "Flag renamed",
  "evidence": [],
  "suggestion": "Update flag"
}
\`\`\``;

    const parsed = parseJSONFromText(raw);
    expect(parsed).not.toBeNull();
    expect(parsed.drift).toBe(true);
    expect(parsed.confidence).toBe(0.95);
  });
});

describe('MockLLMClient', () => {
  const client = new MockLLMClient();

  it('verifies renamed flag drift correctly', async () => {
    const entity = {
      name: '--deadline',
      oldName: '--timeout',
      type: 'CLI_FLAG',
      oldValue: '--timeout',
      newValue: '--deadline',
      file: 'cli.py',
      line: 88
    };

    const docChunk = {
      id: 'doc-1',
      file: 'README.md',
      lineStart: 42,
      lineEnd: 42,
      section: 'CLI Options',
      text: 'Use --timeout to stop slow jobs.'
    };

    const result = await client.verifyDrift(entity, docChunk);
    expect(result.drift).toBe(true);
    expect(result.severity).toBe('high');
    expect(result.confidence).toBeGreaterThanOrEqual(0.95);
    expect(result.suggestion).toContain('--deadline');
  });

  it('verifies changed default value drift correctly', async () => {
    const entity = {
      name: 'DEFAULT_TIMEOUT',
      oldName: null,
      type: 'CONSTANT',
      oldValue: '30',
      newValue: '60',
      file: 'src/config.js',
      line: 1
    };

    const docChunk = {
      id: 'doc-2',
      file: 'README.md',
      lineStart: 15,
      lineEnd: 15,
      section: 'Config',
      text: 'The default timeout is 30 seconds.'
    };

    const result = await client.verifyDrift(entity, docChunk);
    expect(result.drift).toBe(true);
    expect(result.severity).toBe('high');
    expect(result.suggestion).toContain('60');
  });

  it('returns no drift when change does not conflict', async () => {
    const entity = {
      name: 'helperFunction',
      oldName: null,
      type: 'FUNCTION',
      oldValue: null,
      newValue: null,
      file: 'src/utils.js',
      line: 20
    };

    const docChunk = {
      id: 'doc-3',
      file: 'README.md',
      lineStart: 5,
      lineEnd: 5,
      section: 'General',
      text: 'This library provides generic utilities.'
    };

    const result = await client.verifyDrift(entity, docChunk);
    expect(result.drift).toBe(false);
    expect(result.severity).toBe('none');
  });
});
