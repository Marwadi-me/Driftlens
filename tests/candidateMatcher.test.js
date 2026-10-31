import { describe, it, expect } from 'vitest';
import { matchCandidates, scoreCandidate, tokenizeIdentifier } from '../src/matcher/candidateMatcher.js';

describe('tokenizeIdentifier', () => {
  it('tokenizes camelCase and SCREAMING_SNAKE_CASE', () => {
    const defaultTokens = tokenizeIdentifier('DEFAULT_TIMEOUT');
    expect(defaultTokens).toContain('default');
    expect(defaultTokens).toContain('timeout');
    expect(defaultTokens).toContain('time');

    const userTokens = tokenizeIdentifier('createUserProfile');
    expect(userTokens).toContain('create');
    expect(userTokens).toContain('user');
    expect(userTokens).toContain('profile');

    const flagTokens = tokenizeIdentifier('--timeout');
    expect(flagTokens).toContain('timeout');
  });
});

describe('scoreCandidate & matchCandidates', () => {
  const sampleEntity = {
    name: 'DEFAULT_TIMEOUT',
    oldName: null,
    type: 'CONSTANT',
    oldValue: '30',
    newValue: '60',
    file: 'src/config.js',
    line: 1
  };

  const relevantDoc = {
    id: 'doc-1',
    file: 'README.md',
    lineStart: 42,
    lineEnd: 42,
    section: 'Configuration',
    text: 'The application waits for 30 seconds before timing out.'
  };

  const irrelevantDoc = {
    id: 'doc-2',
    file: 'README.md',
    lineStart: 10,
    lineEnd: 10,
    section: 'Installation',
    text: 'Run npm install to set up dependencies.'
  };

  it('scores relevant candidate highly with multiple signals', () => {
    const { score, signals } = scoreCandidate(sampleEntity, relevantDoc);
    expect(score).toBeGreaterThanOrEqual(0.60);
    expect(signals).toContain("explicitly mentions old value '30'");
    expect(signals).toContain("located in relevant section 'Configuration'");
  });

  it('scores irrelevant doc chunk very low', () => {
    const { score } = scoreCandidate(sampleEntity, irrelevantDoc);
    expect(score).toBeLessThan(0.20);
  });

  it('ranks and filters candidates correctly', () => {
    const matched = matchCandidates([sampleEntity], [relevantDoc, irrelevantDoc], {
      minRelevanceThreshold: 0.3
    });

    expect(matched).toHaveLength(1);
    expect(matched[0].docChunk.id).toBe('doc-1');
    expect(matched[0].score).toBeGreaterThanOrEqual(0.60);
  });

  it('matches renamed CLI flag with documentation', () => {
    const flagEntity = {
      name: '--deadline',
      oldName: '--timeout',
      type: 'CLI_FLAG',
      oldValue: '--timeout',
      newValue: '--deadline',
      file: 'cli.py',
      line: 88
    };

    const doc = {
      id: 'doc-flag',
      file: 'README.md',
      lineStart: 50,
      lineEnd: 50,
      section: 'CLI Options',
      text: 'Use --timeout to stop slow jobs.'
    };

    const { score, signals } = scoreCandidate(flagEntity, doc);
    expect(score).toBeGreaterThanOrEqual(0.65);
    expect(signals.some(s => s.includes('--timeout'))).toBe(true);
  });
});
