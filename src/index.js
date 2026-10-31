import { getLocalGitDiff } from './git/diffParser.js';
import { extractAllRepoDocumentation, extractDocumentationChunks } from './analyzer/documentationAnalyzer.js';
import { extractChangedEntities } from './analyzer/entityExtractor.js';
import { matchCandidates } from './matcher/candidateMatcher.js';
import { createLLMClient } from './ai/llmClient.js';
import { buildDriftFindings } from './evidence/evidenceEngine.js';
import { generateStructuredReport } from './report/reportGenerator.js';
import { GitHubClient } from './github/githubClient.js';

export const DRIFTLENS_VERSION = '0.1.0';

export function getStatus() {
  return {
    name: 'DriftLens',
    version: DRIFTLENS_VERSION,
    tagline: 'Catch the documentation a code change just made wrong.',
    status: 'ready'
  };
}

/**
 * Runs documentation drift analysis on a local Git repository.
 * @param {object} params
 * @param {string} params.repoPath
 * @param {string} params.base
 * @param {string} params.head
 * @param {object} [params.options]
 * @returns {Promise<object>}
 */
export async function analyzeLocalRepository({ repoPath = process.cwd(), base = 'HEAD~1', head = 'HEAD', options = {} }) {
  const llmClient = options.llmClient || createLLMClient(options);

  // 1. Parse git diff
  const parsedDiffs = await getLocalGitDiff(repoPath, base, head);

  // 2. Extract changed code entities
  const changedEntities = extractChangedEntities(parsedDiffs);

  // 3. Extract all documentation chunks from repository
  const docChunks = await extractAllRepoDocumentation(repoPath);

  // 4. Match candidate pairs
  const candidatePairs = matchCandidates(changedEntities, docChunks, options);

  // 5. Evaluate semantic drift via LLM and build evidence
  const findings = await buildDriftFindings(candidatePairs, llmClient, parsedDiffs, options);

  // 6. Compile structured report
  return generateStructuredReport(findings, {
    filesAnalyzed: parsedDiffs.length,
    documentsAnalyzed: new Set(docChunks.map(d => d.file)).size,
    candidatePairsEvaluated: candidatePairs.length
  });
}

/**
 * Runs documentation drift analysis on a GitHub Pull Request.
 * @param {object} params
 * @param {string} params.owner
 * @param {string} params.repo
 * @param {number|string} params.pr
 * @param {object} [params.options]
 * @returns {Promise<object>}
 */
export async function analyzeGitHubPR({ owner, repo, pr, options = {} }) {
  const github = options.githubClient || new GitHubClient(options.githubToken || process.env.GITHUB_TOKEN);
  const llmClient = options.llmClient || createLLMClient(options);

  // 1. Fetch PR changed files and patches
  const prFiles = await github.getPullRequestFiles(owner, repo, pr);
  const parsedDiffs = github.parsePRFilesToDiffs(prFiles);

  // 2. Extract changed code entities
  const changedEntities = extractChangedEntities(parsedDiffs);

  // 3. Fetch documentation chunks (README and any docs touched or related)
  const docPaths = ['README.md', 'docs/config.md', 'docs/cli.md', 'docs/api.md'];
  for (const f of prFiles) {
    if (f.filename.toLowerCase().endsWith('.md') && !docPaths.includes(f.filename)) {
      docPaths.push(f.filename);
    }
  }

  const docChunks = await github.fetchDocumentationChunks(owner, repo, docPaths);

  // 4. Match candidates
  const candidatePairs = matchCandidates(changedEntities, docChunks, options);

  // 5. Build drift findings
  const findings = await buildDriftFindings(candidatePairs, llmClient, parsedDiffs, options);

  return generateStructuredReport(findings, {
    filesAnalyzed: parsedDiffs.length,
    documentsAnalyzed: new Set(docChunks.map(d => d.file)).size,
    candidatePairsEvaluated: candidatePairs.length
  });
}
