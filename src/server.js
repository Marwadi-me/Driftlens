import express from 'express';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { getStatus, analyzeLocalRepository, analyzeGitHubPR } from './index.js';
import { parseDiff } from './git/diffParser.js';
import { extractChangedEntities } from './analyzer/entityExtractor.js';
import { extractDocumentationChunks } from './analyzer/documentationAnalyzer.js';
import { matchCandidates } from './matcher/candidateMatcher.js';
import { createLLMClient } from './ai/llmClient.js';
import { buildDriftFindings } from './evidence/evidenceEngine.js';
import { generateStructuredReport } from './report/reportGenerator.js';
import { generateReadmeForRepo } from './analyzer/docGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(projectRoot, 'public')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    ...getStatus()
  });
});

const EXAMPLES_INPUTS = {
  'renamed-flag': { diff: 'examples/renamed-flag/input/patch.diff', doc: 'examples/renamed-flag/input/README.md' },
  'changed-default': { diff: 'examples/changed-default/input/patch.diff', doc: 'examples/changed-default/input/README.md' },
  'no-drift': { diff: 'examples/no-drift/input/patch.diff', doc: 'examples/no-drift/input/README.md' },
  'config-table': { diff: 'examples/config-table/input/patch.diff', doc: 'examples/config-table/input/docs/config.md' },
  'api-parameter': { diff: 'examples/api-parameter/input/patch.diff', doc: 'examples/api-parameter/input/docs/api.md' },
  'removed-feature': { diff: 'examples/removed-feature/input/patch.diff', doc: 'examples/removed-feature/input/README.md' }
};

// Dynamically analyze golden evaluation examples on demand from raw inputs
app.get('/api/examples/:id', async (req, res) => {
  const exampleId = req.params.id;
  const config = EXAMPLES_INPUTS[exampleId];
  if (!config) {
    return res.status(404).json({ error: `Example '${exampleId}' not found.` });
  }

  try {
    const diffText = await fs.readFile(path.join(projectRoot, config.diff), 'utf8');
    const docText = await fs.readFile(path.join(projectRoot, config.doc), 'utf8');

    const llmClient = createLLMClient();
    const parsedDiffs = parseDiff(diffText);
    const changedEntities = extractChangedEntities(parsedDiffs);
    const docChunks = extractDocumentationChunks(docText, config.doc);
    const candidates = matchCandidates(changedEntities, docChunks);
    const findings = await buildDriftFindings(candidates, llmClient, parsedDiffs);

    const report = generateStructuredReport(findings, {
      filesAnalyzed: parsedDiffs.length,
      documentsAnalyzed: 1,
      candidatePairsEvaluated: candidates.length
    });

    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Analyze direct raw diff and markdown text
app.post('/api/analyze/raw', async (req, res) => {
  try {
    const { diffText, docText, docFile = 'README.md' } = req.body;
    if (!diffText || !docText) {
      return res.status(400).json({ error: 'Both diffText and docText are required.' });
    }

    const llmClient = createLLMClient();
    const parsedDiffs = parseDiff(diffText);
    const changedEntities = extractChangedEntities(parsedDiffs);
    const docChunks = extractDocumentationChunks(docText, docFile);

    const candidates = matchCandidates(changedEntities, docChunks);
    const findings = await buildDriftFindings(candidates, llmClient, parsedDiffs);

    const report = generateStructuredReport(findings, {
      filesAnalyzed: parsedDiffs.length,
      documentsAnalyzed: 1,
      candidatePairsEvaluated: candidates.length
    });

    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 1-Click Auto-Remediation: Apply suggested fix to document text
app.post('/api/fix/apply', (req, res) => {
  const { docText, targetSentence, suggestedSentence } = req.body;
  if (!docText || !targetSentence || !suggestedSentence) {
    return res.status(400).json({ error: 'docText, targetSentence, and suggestedSentence are required.' });
  }

  const updatedDocText = docText.replaceAll(targetSentence, suggestedSentence);
  res.json({
    success: true,
    applied: updatedDocText !== docText,
    updatedDocText
  });
});

// Generate download patch for suggested correction
app.post('/api/fix/patch', (req, res) => {
  const { fileName = 'README.md', targetSentence, suggestedSentence } = req.body;
  if (!targetSentence || !suggestedSentence) {
    return res.status(400).json({ error: 'targetSentence and suggestedSentence are required.' });
  }

  const patch = `--- a/${fileName}
+++ b/${fileName}
@@ -1,1 +1,1 @@
-${targetSentence}
+${suggestedSentence}
`;

  res.setHeader('Content-Type', 'text/x-diff');
  res.setHeader('Content-Disposition', `attachment; filename="${path.basename(fileName)}.patch"`);
  res.send(patch);
});

// Generate starter README from codebase analysis
app.post('/api/generate/readme', async (req, res) => {
  try {
    const { repoPath = projectRoot } = req.body;
    const generatedMarkdown = await generateReadmeForRepo(repoPath);
    res.json({
      success: true,
      markdown: generatedMarkdown
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Analyze local git repository
app.post('/api/analyze/local', async (req, res) => {
  try {
    const { repoPath = projectRoot, base = 'HEAD~1', head = 'HEAD', minConfidence } = req.body;
    const report = await analyzeLocalRepository({
      repoPath,
      base,
      head,
      options: { minConfidence }
    });
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Analyze GitHub PR
app.post('/api/analyze/pr', async (req, res) => {
  try {
    const { owner, repo, pr, minConfidence } = req.body;
    if (!owner || !repo || !pr) {
      return res.status(400).json({ error: 'owner, repo, and pr number are required.' });
    }
    const report = await analyzeGitHubPR({
      owner,
      repo,
      pr,
      options: { minConfidence }
    });
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`DriftLens server running on http://localhost:${port}`);
  });
}

export default app;
