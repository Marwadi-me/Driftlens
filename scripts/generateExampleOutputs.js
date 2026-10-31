import fs from 'node:fs/promises';
import path from 'node:path';
import { parseDiff } from '../src/git/diffParser.js';
import { extractChangedEntities } from '../src/analyzer/entityExtractor.js';
import { extractDocumentationChunks } from '../src/analyzer/documentationAnalyzer.js';
import { matchCandidates } from '../src/matcher/candidateMatcher.js';
import { MockLLMClient } from '../src/ai/llmClient.js';
import { buildDriftFindings } from '../src/evidence/evidenceEngine.js';
import { generateStructuredReport } from '../src/report/reportGenerator.js';

const EXAMPLES = [
  {
    name: 'renamed-flag',
    diffFile: 'examples/renamed-flag/input/patch.diff',
    docFile: 'examples/renamed-flag/input/README.md',
    outputFile: 'examples/renamed-flag/output.json'
  },
  {
    name: 'changed-default',
    diffFile: 'examples/changed-default/input/patch.diff',
    docFile: 'examples/changed-default/input/README.md',
    outputFile: 'examples/changed-default/output.json'
  },
  {
    name: 'no-drift',
    diffFile: 'examples/no-drift/input/patch.diff',
    docFile: 'examples/no-drift/input/README.md',
    outputFile: 'examples/no-drift/output.json'
  }
];

async function generate() {
  const llmClient = new MockLLMClient();

  for (const ex of EXAMPLES) {
    console.log(`Generating real output for example: ${ex.name}...`);
    const diffText = await fs.readFile(ex.diffFile, 'utf8');
    const docText = await fs.readFile(ex.docFile, 'utf8');

    const parsedDiffs = parseDiff(diffText);
    const changedEntities = extractChangedEntities(parsedDiffs);
    const docChunks = extractDocumentationChunks(docText, 'README.md');

    const candidates = matchCandidates(changedEntities, docChunks);
    const findings = await buildDriftFindings(candidates, llmClient, parsedDiffs);

    const report = generateStructuredReport(findings, {
      filesAnalyzed: parsedDiffs.length,
      documentsAnalyzed: 1,
      candidatePairsEvaluated: candidates.length
    });

    await fs.writeFile(ex.outputFile, JSON.stringify(report, null, 2) + '\n', 'utf8');
    console.log(`Saved output to ${ex.outputFile}`);
  }
}

generate().catch(err => {
  console.error('Failed to generate examples:', err);
  process.exit(1);
});
