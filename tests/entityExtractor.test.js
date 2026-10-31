import { describe, it, expect } from 'vitest';
import { extractChangedEntities, extractEntitiesFromLine } from '../src/analyzer/entityExtractor.js';
import { parseDiff } from '../src/git/diffParser.js';

describe('extractEntitiesFromLine', () => {
  it('extracts constants and default values', () => {
    const ents = extractEntitiesFromLine('const DEFAULT_TIMEOUT = 30;');
    expect(ents).toHaveLength(1);
    expect(ents[0].name).toBe('DEFAULT_TIMEOUT');
    expect(ents[0].type).toBe('CONSTANT');
    expect(ents[0].value).toBe('30');
  });

  it('extracts CLI flags from argument parsers', () => {
    const ents = extractEntitiesFromLine('parser.add_argument("--timeout", type=int)');
    expect(ents).toHaveLength(1);
    expect(ents[0].name).toBe('--timeout');
    expect(ents[0].type).toBe('CLI_FLAG');
  });

  it('extracts function declarations', () => {
    const ents = extractEntitiesFromLine('async function createUser(email, password) {');
    expect(ents).toHaveLength(1);
    expect(ents[0].name).toBe('createUser');
    expect(ents[0].type).toBe('FUNCTION');
  });
});

describe('extractChangedEntities', () => {
  it('detects value change for constant', () => {
    const diff = `diff --git a/src/config.js b/src/config.js
--- a/src/config.js
+++ b/src/config.js
@@ -1,3 +1,3 @@
-const DEFAULT_TIMEOUT = 30;
+const DEFAULT_TIMEOUT = 60;
`;
    const parsed = parseDiff(diff);
    const entities = extractChangedEntities(parsed);

    expect(entities).toHaveLength(1);
    expect(entities[0].name).toBe('DEFAULT_TIMEOUT');
    expect(entities[0].oldValue).toBe('30');
    expect(entities[0].newValue).toBe('60');
    expect(entities[0].type).toBe('CONSTANT');
    expect(entities[0].file).toBe('src/config.js');
    expect(entities[0].line).toBe(1);
  });

  it('detects renamed CLI flag', () => {
    const diff = `diff --git a/cli.py b/cli.py
--- a/cli.py
+++ b/cli.py
@@ -88,3 +88,3 @@
-    parser.add_argument("--timeout", type=int)
+    parser.add_argument("--deadline", type=int)
`;
    const parsed = parseDiff(diff);
    const entities = extractChangedEntities(parsed);

    expect(entities).toHaveLength(1);
    expect(entities[0].type).toBe('CLI_FLAG');
    expect(entities[0].oldValue).toBe('--timeout');
    expect(entities[0].newValue).toBe('--deadline');
    expect(entities[0].name).toBe('--deadline');
    expect(entities[0].oldName).toBe('--timeout');
  });

  it('returns empty when code changes but entities remain unchanged', () => {
    const diff = `diff --git a/src/utils.js b/src/utils.js
--- a/src/utils.js
+++ b/src/utils.js
@@ -10,3 +10,3 @@
-  // calculate sum
+  // compute total sum
`;
    const parsed = parseDiff(diff);
    const entities = extractChangedEntities(parsed);
    expect(entities).toHaveLength(0);
  });
});
