import { describe, it, expect } from 'vitest';
import { isDocumentationUpdatedInSamePR } from '../src/evidence/evidenceEngine.js';
import { scoreCandidate } from '../src/matcher/candidateMatcher.js';
import { extractEntitiesFromLine } from '../src/analyzer/entityExtractor.js';
import { parseDiff } from '../src/git/diffParser.js';
import { splitIntoSentences } from '../src/analyzer/documentationAnalyzer.js';
import app from '../src/server.js';

describe('Regression & Bug Fix Tests', () => {
  it('Bug 1: isDocumentationUpdatedInSamePR does NOT falsely suppress distant drift', () => {
    // Sentence is at line 500, hunk was at lines 10-12
    const docChunk = { file: 'README.md', lineStart: 500, lineEnd: 500, text: 'The default timeout is 30 seconds.' };
    const entity = { name: 'DEFAULT_TIMEOUT', oldValue: '30', newValue: '60' };
    const docDiffs = [
      {
        file: 'README.md',
        type: 'documentation',
        hunks: [
          {
            newStart: 10,
            newLines: 2,
            added: ['Other config option defaults to 60.'],
            removed: ['Other config option defaults to 30.']
          }
        ]
      }
    ];

    // Should NOT suppress the drift on line 500 because the hunk was on line 10
    expect(isDocumentationUpdatedInSamePR(docChunk, entity, docDiffs)).toBe(false);
  });

  it('Bug 2: scoreCandidate matches values containing non-word characters (routes, paths)', () => {
    const entity = {
      name: 'legacyExport',
      type: 'ROUTE',
      oldValue: '/api/v1/legacy-export',
      newValue: null
    };
    const docChunk = {
      id: 'doc-1',
      file: 'README.md',
      section: 'API Reference',
      text: 'Call /api/v1/legacy-export to download reports.'
    };

    const { score, signals } = scoreCandidate(entity, docChunk);
    expect(score).toBeGreaterThanOrEqual(0.30);
    expect(signals.some(s => s.includes('/api/v1/legacy-export'))).toBe(true);
  });

  it('Bug 3: extractEntitiesFromLine does not parse comments as code entities', () => {
    const jsComment = '// TODO: change default --timeout to --deadline';
    const pyComment = '# NOTE: DEFAULT_PORT = 8080';
    const blockComment = ' * let MAX_RETRIES = 5';

    expect(extractEntitiesFromLine(jsComment)).toEqual([]);
    expect(extractEntitiesFromLine(pyComment)).toEqual([]);
    expect(extractEntitiesFromLine(blockComment)).toEqual([]);
  });

  it('Bug 4: parseDiff correctly preserves file paths with spaces', () => {
    const diff = `diff --git a/docs/getting started.md b/docs/getting started.md
--- a/docs/getting started.md
+++ b/docs/getting started.md
@@ -1,1 +1,1 @@
-old info
+new info`;

    const parsed = parseDiff(diff);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].file).toBe('docs/getting started.md');
    expect(parsed[0].oldFile).toBe('docs/getting started.md');
  });

  it('Bug 5: parseDiff ignores \\ No newline at end of file marker', () => {
    const diff = `diff --git a/src/index.js b/src/index.js
@@ -1,1 +1,1 @@
-const x = 1;
+const x = 2;
\\ No newline at end of file`;

    const parsed = parseDiff(diff);
    expect(parsed).toHaveLength(1);
    const hunk = parsed[0].hunks[0];
    expect(hunk.lines.some(l => l.content.includes('No newline'))).toBe(false);
  });

  it('Bug 6: splitIntoSentences handles CRLF Windows line endings properly', () => {
    const text = 'First sentence.\r\nSecond sentence.\r\nThird sentence.';
    const sentences = splitIntoSentences(text, 1);
    expect(sentences).toHaveLength(3);
    expect(sentences[0].text).toBe('First sentence.');
    expect(sentences[1].text).toBe('Second sentence.');
    expect(sentences[2].text).toBe('Third sentence.');
  });

  it('Bug 7: POST /api/fix/apply replaces all occurrences of targetSentence', async () => {
    let responseData = null;
    const req = {
      body: {
        docText: 'The timeout is 30s. Remember, the timeout is 30s.',
        targetSentence: 'the timeout is 30s.',
        suggestedSentence: 'the timeout is 60s.'
      }
    };
    const res = {
      json: (data) => { responseData = data; },
      status: () => res
    };

    const fixRoute = app._router.stack.find(s => s.route && s.route.path === '/api/fix/apply');
    await fixRoute.route.stack[0].handle(req, res, () => {});

    expect(responseData.success).toBe(true);
    expect(responseData.updatedDocText).toBe('The timeout is 30s. Remember, the timeout is 60s.');
  });
});

