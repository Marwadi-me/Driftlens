import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Classifies a file path into source, documentation, test, configuration, or other.
 * @param {string} filePath 
 * @returns {'source' | 'documentation' | 'tests' | 'configuration' | 'binary' | 'other'}
 */
export function classifyFileType(filePath) {
  const lower = filePath.toLowerCase();

  // Test files
  if (
    lower.includes('.test.') ||
    lower.includes('.spec.') ||
    lower.startsWith('tests/') ||
    lower.startsWith('test/') ||
    lower.includes('/__tests__/')
  ) {
    return 'tests';
  }

  // Documentation files
  if (
    lower.endsWith('.md') ||
    lower.endsWith('.markdown') ||
    lower.endsWith('.mdx') ||
    lower.startsWith('docs/') ||
    lower.includes('/docs/')
  ) {
    return 'documentation';
  }

  // Configuration files
  if (
    lower.endsWith('package.json') ||
    lower.endsWith('tsconfig.json') ||
    lower.endsWith('.yaml') ||
    lower.endsWith('.yml') ||
    lower.endsWith('.toml') ||
    lower.endsWith('.ini')
  ) {
    return 'configuration';
  }

  // Common binary extensions
  if (
    /\.(png|jpg|jpeg|gif|svg|ico|pdf|zip|tar|gz|exe|dll|dylib|so|lock|woff|woff2|ttf|eot)$/.test(lower)
  ) {
    return 'binary';
  }

  // Source files
  if (
    /\.(js|ts|mjs|cjs|jsx|tsx|py|go|rs|java|c|cpp|h|hpp|cs|rb|php|swift|kt)$/.test(lower)
  ) {
    return 'source';
  }

  return 'other';
}

/**
 * Parses unified git diff text into structured file changes and hunks.
 * @param {string} diffText 
 * @returns {Array<object>}
 */
export function parseDiff(diffText) {
  if (!diffText || typeof diffText !== 'string') {
    return [];
  }

  const files = [];
  const lines = diffText.split(/\r?\n/);
  let currentFile = null;
  let currentHunk = null;

  let oldLineCounter = 0;
  let newLineCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect diff --git header
    if (line.startsWith('diff --git ')) {
      if (currentHunk && currentFile) {
        currentFile.hunks.push(currentHunk);
        currentHunk = null;
      }
      if (currentFile) {
        files.push(currentFile);
      }

      // Extract file path from diff --git a/path b/path
      const parts = line.split(' ');
      const rawPathB = parts[parts.length - 1] || '';
      const filePath = rawPathB.startsWith('b/') ? rawPathB.slice(2) : rawPathB;

      currentFile = {
        file: filePath,
        oldFile: parts[parts.length - 2]?.startsWith('a/') ? parts[parts.length - 2].slice(2) : null,
        status: 'modified',
        type: classifyFileType(filePath),
        hunks: [],
        additions: 0,
        deletions: 0
      };
      continue;
    }

    if (!currentFile) {
      continue;
    }

    if (line.startsWith('new file mode')) {
      currentFile.status = 'added';
      continue;
    }
    if (line.startsWith('deleted file mode')) {
      currentFile.status = 'deleted';
      continue;
    }
    if (line.startsWith('Binary files ')) {
      currentFile.type = 'binary';
      currentFile.isBinary = true;
      continue;
    }

    // Detect hunk header: @@ -oldStart,oldLines +newStart,newLines @@
    const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/);
    if (hunkMatch) {
      if (currentHunk) {
        currentFile.hunks.push(currentHunk);
      }

      const oldStart = parseInt(hunkMatch[1], 10);
      const oldLines = hunkMatch[2] !== undefined ? parseInt(hunkMatch[2], 10) : 1;
      const newStart = parseInt(hunkMatch[3], 10);
      const newLines = hunkMatch[4] !== undefined ? parseInt(hunkMatch[4], 10) : 1;
      const sectionHeading = (hunkMatch[5] || '').trim();

      oldLineCounter = oldStart;
      newLineCounter = newStart;

      currentHunk = {
        header: line,
        oldStart,
        oldLines,
        newStart,
        newLines,
        sectionHeading,
        removed: [],
        added: [],
        lines: []
      };
      continue;
    }

    if (!currentHunk) {
      continue;
    }

    // Process hunk lines
    if (line.startsWith('+') && !line.startsWith('+++')) {
      const content = line.slice(1);
      currentHunk.added.push(content);
      currentHunk.lines.push({
        type: 'added',
        lineNum: newLineCounter,
        content
      });
      currentFile.additions++;
      newLineCounter++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      const content = line.slice(1);
      currentHunk.removed.push(content);
      currentHunk.lines.push({
        type: 'removed',
        lineNum: oldLineCounter,
        content
      });
      currentFile.deletions++;
      oldLineCounter++;
    } else if (line.startsWith(' ') || line === '') {
      const content = line.startsWith(' ') ? line.slice(1) : line;
      currentHunk.lines.push({
        type: 'context',
        oldLineNum: oldLineCounter,
        newLineNum: newLineCounter,
        content
      });
      oldLineCounter++;
      newLineCounter++;
    }
  }

  if (currentHunk && currentFile) {
    currentFile.hunks.push(currentHunk);
  }
  if (currentFile) {
    files.push(currentFile);
  }

  return files;
}

/**
 * Runs `git diff` for a local repository between two commit refs or working tree.
 * Gracefully handles shallow clones and invalid revision ranges without crashing.
 * @param {string} repoPath 
 * @param {string} base 
 * @param {string} head 
 * @returns {Promise<Array<object>>}
 */
export async function getLocalGitDiff(repoPath, base = 'HEAD~1', head = 'HEAD') {
  try {
    const args = ['diff', '-U3', `${base}...${head}`];
    const { stdout } = await execFileAsync('git', args, { cwd: repoPath, maxBuffer: 10 * 1024 * 1024 });
    return parseDiff(stdout);
  } catch {
    // If three-dot diff fails, fallback to two-dot diff
    try {
      const args = ['diff', '-U3', base, head];
      const { stdout } = await execFileAsync('git', args, { cwd: repoPath, maxBuffer: 10 * 1024 * 1024 });
      return parseDiff(stdout);
    } catch {
      // Fallback: try diffing against HEAD or working tree (e.g. shallow clone or initial commit)
      try {
        const { stdout } = await execFileAsync('git', ['diff', '-U3', 'HEAD'], { cwd: repoPath, maxBuffer: 10 * 1024 * 1024 });
        return parseDiff(stdout);
      } catch {
        // Return empty diff rather than terminating with an unhandled fatal error
        return [];
      }
    }
  }
}
