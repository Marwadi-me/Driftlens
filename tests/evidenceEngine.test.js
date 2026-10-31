import { describe, it, expect } from 'vitest';
import { 
  calculateConfidence, 
  classifyConfidenceTier, 
  isDocumentationUpdatedInSamePR, 
  buildDriftFindings 
} from '../src/evidence/evidenceEngine.js';
import { MockLLMClient } from '../src/ai/llmClient.js';

describe('calculateConfidence & classifyConfidenceTier', () => {
  it('calibrates composite confidence using weighted formula', () => {
    // 0.35 * 1.0 + 0.25 * 0.8 + 0.40 * 0.95 = 0.35 + 0.20 + 0.38 = 0.93
    const conf = calculateConfidence(1.0, 0.8, 0.95);
    expect(conf).toBe(0.93);
    expect(classifyConfidenceTier(conf)).toBe('HIGH');
  });

  it('classifies medium and low tiers', () => {
    expect(classifyConfidenceTier(0.75)).toBe('MEDIUM');
    expect(classifyConfidenceTier(0.60)).toBe('LOW');
  });
});

describe('isDocumentationUpdatedInSamePR', () => {
  it('returns true if doc hunk added the new value', () => {
    const docChunk = { file: 'README.md', lineStart: 10, text: 'Old sentence' };
    const entity = { name: 'DEFAULT_TIMEOUT', newValue: '60' };
    const docDiffs = [
      {
        file: 'README.md',
        type: 'documentation',
        hunks: [
          {
            newStart: 10,
            newLines: 2,
            added: ['The default timeout is 60 seconds.'],
            removed: ['The default timeout is 30 seconds.']
          }
        ]
      }
    ];

    expect(isDocumentationUpdatedInSamePR(docChunk, entity, docDiffs)).toBe(true);
  });

  it('returns false if doc was not updated in PR', () => {
    const docChunk = { file: 'README.md', lineStart: 10, text: 'Old sentence' };
    const entity = { name: 'DEFAULT_TIMEOUT', newValue: '60' };
    expect(isDocumentationUpdatedInSamePR(docChunk, entity, [])).toBe(false);
  });
});

describe('buildDriftFindings', () => {
  const mockClient = new MockLLMClient();

  it('builds full drift finding with exact provenance and suggestion', async () => {
    const candidatePairs = [
      {
        entity: {
          name: '--deadline',
          oldName: '--timeout',
          type: 'CLI_FLAG',
          oldValue: '--timeout',
          newValue: '--deadline',
          file: 'cli.py',
          line: 88,
          snippetBefore: 'parser.add_argument("--timeout")',
          snippetAfter: 'parser.add_argument("--deadline")'
        },
        docChunk: {
          id: 'doc-1',
          file: 'README.md',
          lineStart: 42,
          lineEnd: 42,
          section: 'CLI Options',
          text: 'Use --timeout to stop slow jobs.'
        },
        score: 0.85
      }
    ];

    const findings = await buildDriftFindings(candidatePairs, mockClient, []);
    expect(findings).toHaveLength(1);

    const f = findings[0];
    expect(f.id).toBe('DRIFT-001');
    expect(f.severity).toBe('high');
    expect(f.confidence).toBeGreaterThanOrEqual(0.85);
    expect(f.source.file).toBe('cli.py');
    expect(f.source.lineStart).toBe(88);
    expect(f.documentation.file).toBe('README.md');
    expect(f.documentation.lineStart).toBe(42);
    expect(f.suggestion).toBe('Use --deadline to stop slow jobs.');
    expect(f.evidence.length).toBeGreaterThanOrEqual(2);
  });

  it('filters out findings when LLM returns no drift (false positive control)', async () => {
    const noDriftClient = new MockLLMClient(async () => ({
      drift: false,
      confidence: 0.95,
      severity: 'none',
      reason: 'No contradiction',
      evidence: [],
      suggestion: ''
    }));

    const candidatePairs = [
      {
        entity: { name: 'utilFn', file: 'utils.js', line: 10 },
        docChunk: { file: 'README.md', lineStart: 5, text: 'Helper utilities.' },
        score: 0.5
      }
    ];

    const findings = await buildDriftFindings(candidatePairs, noDriftClient, []);
    expect(findings).toHaveLength(0);
  });
});
