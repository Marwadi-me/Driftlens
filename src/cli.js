import { analyzeLocalRepository, analyzeGitHubPR } from './index.js';
import { formatTerminalReport, formatGitHubPRReview } from './report/reportGenerator.js';
import { generateReadmeForRepo } from './analyzer/docGenerator.js';

function parseArgs(args) {
  const parsed = {
    command: 'analyze',
    repo: '.',
    base: 'HEAD~1',
    head: 'HEAD',
    pr: null,
    json: false,
    markdown: false,
    minConfidence: 0.60,
    provider: process.env.LLM_PROVIDER || 'mock'
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === 'analyze') {
      parsed.command = 'analyze';
    } else if (arg === 'generate-readme' || arg === 'init-docs') {
      parsed.command = 'generate-readme';
    } else if (arg === '--repo' && i + 1 < args.length) {
      parsed.repo = args[++i];
    } else if (arg === '--base' && i + 1 < args.length) {
      parsed.base = args[++i];
    } else if (arg === '--head' && i + 1 < args.length) {
      parsed.head = args[++i];
    } else if (arg === '--pr' && i + 1 < args.length) {
      parsed.pr = args[++i];
    } else if (arg === '--json') {
      parsed.json = true;
    } else if (arg === '--markdown') {
      parsed.markdown = true;
    } else if (arg === '--min-confidence' && i + 1 < args.length) {
      parsed.minConfidence = parseFloat(args[++i]);
    } else if (arg === '--provider' && i + 1 < args.length) {
      parsed.provider = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    }
  }

  return parsed;
}

function printHelp() {
  console.log(`
DriftLens - Catch the documentation a code change just made wrong.

COMMANDS:
  driftlens analyze [options]          Analyze PR or Git diff for documentation drift
  driftlens generate-readme [options]  Generate starter README.md from codebase analysis

OPTIONS:
  --repo <path|owner/repo>   Repository path or GitHub owner/name (default: .)
  --base <ref>               Base git commit/branch (default: HEAD~1)
  --head <ref>               Head git commit/branch (default: HEAD)
  --pr <number>              GitHub Pull Request number
  --json                     Output structured JSON
  --markdown                 Output GitHub PR review markdown
  --min-confidence <float>   Confidence threshold (0.0 to 1.0, default: 0.60)
  --provider <name>          LLM provider (mock, openai-compatible, hackathon)
  --help, -h                 Display help information

EXAMPLES:
  driftlens analyze --repo ./my-repo --base main --head feature
  driftlens analyze --repo Marwadi-me/Driftlens --pr 1
  driftlens generate-readme --repo ./my-repo
`);
}

export async function runCLI(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);

  if (options.help) {
    printHelp();
    return 0;
  }

  try {
    // Generate README command
    if (options.command === 'generate-readme') {
      const markdown = await generateReadmeForRepo(options.repo);
      console.log(markdown);
      return 0;
    }

    let report;

    // GitHub PR mode
    if (options.pr || (options.repo.includes('/') && !options.repo.startsWith('.') && !options.repo.startsWith('/'))) {
      if (!options.pr) {
        throw new Error('When specifying a GitHub repository (owner/repo), you must also supply --pr <number>');
      }

      const parts = options.repo.split('/');
      const owner = parts[0];
      const repo = parts[1];

      if (!options.json) {
        console.log(`Analyzing GitHub PR #${options.pr} on ${owner}/${repo}...`);
      }

      report = await analyzeGitHubPR({
        owner,
        repo,
        pr: options.pr,
        options: {
          minConfidence: options.minConfidence,
          provider: options.provider
        }
      });
    } else {
      // Local Git mode
      if (!options.json) {
        console.log(`Analyzing local repository: ${options.repo} (${options.base} -> ${options.head})...`);
      }

      report = await analyzeLocalRepository({
        repoPath: options.repo,
        base: options.base,
        head: options.head,
        options: {
          minConfidence: options.minConfidence,
          provider: options.provider
        }
      });
    }

    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
    } else if (options.markdown) {
      console.log(formatGitHubPRReview(report));
    } else {
      console.log(formatTerminalReport(report));
    }

    // Exit code 1 if high-severity drift detected, 0 otherwise
    return report.status === 'FAIL' ? 1 : 0;
  } catch (error) {
    console.error(`Error executing DriftLens: ${error.message}`);
    return 1;
  }
}
