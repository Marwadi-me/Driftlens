import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import { parseDiff } from '../src/git/diffParser.js';
import { extractChangedEntities } from '../src/analyzer/entityExtractor.js';
import { extractDocumentationChunks } from '../src/analyzer/documentationAnalyzer.js';
import { matchCandidates } from '../src/matcher/candidateMatcher.js';
import { MockLLMClient } from '../src/ai/llmClient.js';
import { buildDriftFindings } from '../src/evidence/evidenceEngine.js';
import { generateStructuredReport } from '../src/report/reportGenerator.js';

/**
 * Runs the live DriftLens analysis pipeline directly on raw input diff and markdown files.
 */
async function runLiveAnalysis(diffPath, docPath) {
  const diffText = await fs.readFile(diffPath, 'utf8');
  const docText = await fs.readFile(docPath, 'utf8');
  const parsedDiffs = parseDiff(diffText);
  const changedEntities = extractChangedEntities(parsedDiffs);
  const docChunks = extractDocumentationChunks(docText, docPath);
  const candidates = matchCandidates(changedEntities, docChunks);
  const findings = await buildDriftFindings(candidates, new MockLLMClient(), parsedDiffs);
  return generateStructuredReport(findings, {
    filesAnalyzed: parsedDiffs.length,
    documentsAnalyzed: 1,
    candidatePairsEvaluated: candidates.length
  });
}

describe('Live Golden Examples Evaluation', () => {
  it('1. renamed-flag: dynamically detects CLI flag drift from raw diff & doc', async () => {
    const report = await runLiveAnalysis(
      'examples/renamed-flag/input/patch.diff',
      'examples/renamed-flag/input/README.md'
    );
    expect(report.status).toBe('FAIL');
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0].source.entityName).toBe('--deadline');
    expect(report.findings[0].suggestion).toContain('--deadline');
    expect(report.findings[0].confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('2. changed-default: dynamically detects default value drift', async () => {
    const report = await runLiveAnalysis(
      'examples/changed-default/input/patch.diff',
      'examples/changed-default/input/README.md'
    );
    expect(report.status).toBe('FAIL');
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0].source.entityName).toBe('DEFAULT_TIMEOUT');
    expect(report.findings[0].suggestion).toContain('60');
    expect(report.findings[0].confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('3. no-drift: dynamically confirms zero false positives on internal refactors', async () => {
    const report = await runLiveAnalysis(
      'examples/no-drift/input/patch.diff',
      'examples/no-drift/input/README.md'
    );
    expect(report.status).toBe('PASS');
    expect(report.findings).toHaveLength(0);
  });

  it('4. config-table: dynamically detects outdated markdown table row', async () => {
    const report = await runLiveAnalysis(
      'examples/config-table/input/patch.diff',
      'examples/config-table/input/docs/config.md'
    );
    expect(report.status).toBe('FAIL');
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0].source.entityName).toBe('TIMEOUT_SECONDS');
    expect(report.findings[0].suggestion).toContain('60');
  });

  it('5. api-parameter: dynamically detects function signature modification', async () => {
    const report = await runLiveAnalysis(
      'examples/api-parameter/input/patch.diff',
      'examples/api-parameter/input/docs/api.md'
    );
    expect(report.status).toBe('FAIL');
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0].source.entityName).toBe('registerUser');
  });

  it('6. removed-feature: dynamically detects deleted route still in documentation', async () => {
    const report = await runLiveAnalysis(
      'examples/removed-feature/input/patch.diff',
      'examples/removed-feature/input/README.md'
    );
    expect(report.status).toBe('FAIL');
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0].source.entityName).toBe('/api/v1/legacy-export');
  });
});
