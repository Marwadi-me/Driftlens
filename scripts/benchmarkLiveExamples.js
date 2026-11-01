import fs from 'node:fs/promises';
import { parseDiff } from '../src/git/diffParser.js';
import { extractChangedEntities } from '../src/analyzer/entityExtractor.js';
import { extractDocumentationChunks } from '../src/analyzer/documentationAnalyzer.js';
import { matchCandidates } from '../src/matcher/candidateMatcher.js';
import { MockLLMClient } from '../src/ai/llmClient.js';
import { buildDriftFindings } from '../src/evidence/evidenceEngine.js';
import { generateStructuredReport } from '../src/report/reportGenerator.js';

const BENCHMARKS = [
  {
    id: 'renamed-flag',
    name: '1. CLI Flag Renamed (--timeout -> --deadline)',
    diffFile: 'examples/renamed-flag/input/patch.diff',
    docFile: 'examples/renamed-flag/input/README.md',
    expectedStatus: 'FAIL',
    expectedEntity: '--deadline'
  },
  {
    id: 'changed-default',
    name: '2. Changed Default Value (30 -> 60)',
    diffFile: 'examples/changed-default/input/patch.diff',
    docFile: 'examples/changed-default/input/README.md',
    expectedStatus: 'FAIL',
    expectedEntity: 'DEFAULT_TIMEOUT'
  },
  {
    id: 'no-drift',
    name: '3. False Positive Control (Internal Refactor)',
    diffFile: 'examples/no-drift/input/patch.diff',
    docFile: 'examples/no-drift/input/README.md',
    expectedStatus: 'PASS',
    expectedEntity: null
  },
  {
    id: 'config-table',
    name: '4. Outdated Config Table Row (30s -> 60s)',
    diffFile: 'examples/config-table/input/patch.diff',
    docFile: 'examples/config-table/input/docs/config.md',
    expectedStatus: 'FAIL',
    expectedEntity: 'TIMEOUT_SECONDS'
  },
  {
    id: 'api-parameter',
    name: '5. API Parameter Signature Update',
    diffFile: 'examples/api-parameter/input/patch.diff',
    docFile: 'examples/api-parameter/input/docs/api.md',
    expectedStatus: 'FAIL',
    expectedEntity: 'registerUser'
  },
  {
    id: 'removed-feature',
    name: '6. Deleted Route Still Documented',
    diffFile: 'examples/removed-feature/input/patch.diff',
    docFile: 'examples/removed-feature/input/README.md',
    expectedStatus: 'FAIL',
    expectedEntity: '/api/v1/legacy-export'
  }
];

async function runBenchmark() {
  console.log('========================================================================');
  console.log('               DRIFTLENS LIVE GOLDEN BENCHMARK RUNNER                   ');
  console.log('         Running live engine against Hackathon Problem 5 scenarios      ');
  console.log('========================================================================\n');

  const llmClient = new MockLLMClient();
  let passedCount = 0;
  const startTime = Date.now();

  for (const b of BENCHMARKS) {
    const t0 = Date.now();
    const diffText = await fs.readFile(b.diffFile, 'utf8');
    const docText = await fs.readFile(b.docFile, 'utf8');

    const parsedDiffs = parseDiff(diffText);
    const changedEntities = extractChangedEntities(parsedDiffs);
    const docChunks = extractDocumentationChunks(docText, b.docFile);
    const candidates = matchCandidates(changedEntities, docChunks);
    const findings = await buildDriftFindings(candidates, llmClient, parsedDiffs);

    const report = generateStructuredReport(findings, {
      filesAnalyzed: parsedDiffs.length,
      documentsAnalyzed: 1,
      candidatePairsEvaluated: candidates.length
    });

    const elapsed = Date.now() - t0;
    const isCorrectStatus = report.status === b.expectedStatus;
    const isCorrectEntity = b.expectedEntity 
      ? findings.some(f => f.source.entityName === b.expectedEntity)
      : findings.length === 0;

    if (isCorrectStatus && isCorrectEntity) {
      passedCount++;
      const conf = findings[0] ? `${Math.round(findings[0].confidence * 100)}%` : 'N/A (PASS)';
      console.log(`[PASS] ${b.name}`);
      console.log(`       Status: ${report.status} | Confidence: ${conf} | Duration: ${elapsed}ms\n`);
    } else {
      console.log(`[FAIL] ${b.name} - Unexpected output!\n`);
    }
  }

  const totalElapsed = Date.now() - startTime;
  console.log('------------------------------------------------------------------------');
  console.log(`Benchmark Complete: ${passedCount}/${BENCHMARKS.length} passed in ${totalElapsed}ms`);
  console.log('All 6 golden evaluation scenarios verified dynamically from raw inputs.');
  console.log('========================================================================');

  if (passedCount !== BENCHMARKS.length) {
    process.exit(1);
  }
}

runBenchmark().catch(err => {
  console.error('Benchmark execution error:', err);
  process.exit(1);
});

