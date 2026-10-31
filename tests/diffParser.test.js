import { describe, it, expect } from 'vitest';
import { parseDiff, classifyFileType } from '../src/git/diffParser.js';

describe('classifyFileType', () => {
  it('correctly classifies documentation files', () => {
    expect(classifyFileType('README.md')).toBe('documentation');
    expect(classifyFileType('docs/config.md')).toBe('documentation');
    expect(classifyFileType('guide.markdown')).toBe('documentation');
    expect(classifyFileType('src/components/Doc.mdx')).toBe('documentation');
  });

  it('correctly classifies source files', () => {
    expect(classifyFileType('src/config.js')).toBe('source');
    expect(classifyFileType('cli.py')).toBe('source');
    expect(classifyFileType('server.ts')).toBe('source');
    expect(classifyFileType('main.go')).toBe('source');
  });

  it('correctly classifies test files', () => {
    expect(classifyFileType('tests/config.test.js')).toBe('tests');
    expect(classifyFileType('src/parser.spec.ts')).toBe('tests');
    expect(classifyFileType('test/helper.js')).toBe('tests');
  });

  it('correctly classifies config and binary files', () => {
    expect(classifyFileType('package.json')).toBe('configuration');
    expect(classifyFileType('logo.png')).toBe('binary');
    expect(classifyFileType('archive.zip')).toBe('binary');
  });
});

describe('parseDiff', () => {
  it('returns empty array for empty diff', () => {
    expect(parseDiff('')).toEqual([]);
    expect(parseDiff(null)).toEqual([]);
  });

  it('parses a single-file diff with removed and added lines', () => {
    const diff = `diff --git a/src/config.js b/src/config.js
index 83a0e1c..b2f3491 100644
--- a/src/config.js
+++ b/src/config.js
@@ -1,3 +1,3 @@
-const DEFAULT_TIMEOUT = 30;
+const DEFAULT_TIMEOUT = 60;
 const MAX_RETRIES = 3;
 export default DEFAULT_TIMEOUT;
`;

    const parsed = parseDiff(diff);
    expect(parsed).toHaveLength(1);

    const file = parsed[0];
    expect(file.file).toBe('src/config.js');
    expect(file.type).toBe('source');
    expect(file.additions).toBe(1);
    expect(file.deletions).toBe(1);
    expect(file.hunks).toHaveLength(1);

    const hunk = file.hunks[0];
    expect(hunk.oldStart).toBe(1);
    expect(hunk.newStart).toBe(1);
    expect(hunk.removed).toEqual(['const DEFAULT_TIMEOUT = 30;']);
    expect(hunk.added).toEqual(['const DEFAULT_TIMEOUT = 60;']);
    expect(hunk.lines[0]).toEqual({
      type: 'removed',
      lineNum: 1,
      content: 'const DEFAULT_TIMEOUT = 30;'
    });
    expect(hunk.lines[1]).toEqual({
      type: 'added',
      lineNum: 1,
      content: 'const DEFAULT_TIMEOUT = 60;'
    });
  });

  it('parses multiple changed files including docs and source', () => {
    const diff = `diff --git a/cli.py b/cli.py
--- a/cli.py
+++ b/cli.py
@@ -87,4 +87,4 @@ def parse_args():
-    parser.add_argument("--timeout", type=int)
+    parser.add_argument("--deadline", type=int)
diff --git a/README.md b/README.md
--- a/README.md
+++ b/README.md
@@ -40,3 +40,3 @@
 Use --timeout to stop slow jobs.
`;

    const parsed = parseDiff(diff);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].file).toBe('cli.py');
    expect(parsed[0].type).toBe('source');
    expect(parsed[0].hunks[0].removed).toContain('    parser.add_argument("--timeout", type=int)');
    expect(parsed[0].hunks[0].added).toContain('    parser.add_argument("--deadline", type=int)');

    expect(parsed[1].file).toBe('README.md');
    expect(parsed[1].type).toBe('documentation');
  });
});

