import path from 'node:path';
import fs from 'node:fs/promises';

/**
 * Generates an accurate starter README.md by analyzing extracted code entities and package metadata.
 * @param {Array<object>} entities 
 * @param {object} meta 
 * @returns {string}
 */
export function generateReadmeFromEntities(entities = [], meta = {}) {
  const projectName = meta.name || 'MyProject';
  const description = meta.description || 'Automated documentation generated from codebase analysis.';
  const version = meta.version || '1.0.0';

  const flags = entities.filter(e => e.type === 'CLI_FLAG');
  const configs = entities.filter(e => e.type === 'CONSTANT' || e.type === 'CONFIG');
  const functions = entities.filter(e => e.type === 'FUNCTION');
  const routes = entities.filter(e => e.type === 'ROUTE');

  let md = `# ${projectName}\n\n`;
  md += `> ${description}\n\n`;
  md += `Version: \`${version}\`\n\n`;
  md += `*Generated automatically by DriftLens from verified source code implementation.*\n\n`;
  md += `---\n\n`;

  md += `## 🚀 Quickstart\n\n`;
  md += `\`\`\`bash\nnpm install\nnpm start\n\`\`\`\n\n`;
  md += `---\n\n`;

  // Configuration Table
  if (configs.length > 0) {
    md += `## ⚙️ Configuration\n\n`;
    md += `| Option / Constant | Default Value | Type | Source File |\n`;
    md += `| :--- | :--- | :--- | :--- |\n`;

    const seenConfigs = new Set();
    for (const c of configs) {
      if (!seenConfigs.has(c.name)) {
        seenConfigs.add(c.name);
        md += `| \`${c.name}\` | \`${c.newValue || c.value || c.oldValue || 'N/A'}\` | \`${c.type}\` | \`${c.file || 'source'}\` |\n`;
      }
    }
    md += `\n---\n\n`;
  }

  // CLI Options
  if (flags.length > 0) {
    md += `## 💻 CLI Options\n\n`;
    md += `| Flag | Parameter | Description |\n`;
    md += `| :--- | :--- | :--- |\n`;

    const seenFlags = new Set();
    for (const f of flags) {
      if (!seenFlags.has(f.name)) {
        seenFlags.add(f.name);
        md += `| \`${f.name}\` | \`<value>\` | Configured CLI argument |\n`;
      }
    }
    md += `\n---\n\n`;
  }

  // API Routes / Functions
  if (routes.length > 0 || functions.length > 0) {
    md += `## 🔌 API Reference\n\n`;

    if (routes.length > 0) {
      md += `### HTTP Endpoints\n\n`;
      const seenRoutes = new Set();
      for (const r of routes) {
        if (!seenRoutes.has(r.name)) {
          seenRoutes.add(r.name);
          md += `- \`${r.name}\`\n`;
        }
      }
      md += `\n`;
    }

    if (functions.length > 0) {
      md += `### Public Functions\n\n`;
      const seenFns = new Set();
      for (const fn of functions) {
        if (!seenFns.has(fn.name)) {
          seenFns.add(fn.name);
          md += `- \`${fn.name}()\`\n`;
        }
      }
      md += `\n`;
    }
    md += `---\n\n`;
  }

  md += `## 📄 License\n\n`;
  md += `${meta.license || 'MIT'} License\n`;

  return md;
}

/**
 * Inspects a repository's source files, extracts code entities, and synthesizes a complete README.md.
 * @param {string} repoPath 
 * @returns {Promise<string>}
 */
export async function generateReadmeForRepo(repoPath = process.cwd()) {
  let pkg = {};
  try {
    const pkgRaw = await fs.readFile(path.join(repoPath, 'package.json'), 'utf8');
    pkg = JSON.parse(pkgRaw);
  } catch {
    pkg = { name: path.basename(repoPath), description: 'Project codebase' };
  }

  // Scan source files for entities
  const entities = [];
  async function walk(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(repoPath, fullPath);

      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === 'coverage' || entry.name === 'tests') {
          continue;
        }
        await walk(fullPath);
      } else if (entry.isFile() && /\.(js|ts|py|go|rs)$/.test(entry.name)) {
        try {
          const content = await fs.readFile(fullPath, 'utf8');
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Filter out comments
            if (/^\s*(?:\/\/|\/\*|\*|#)/.test(line)) continue;

            // Detect Constants and Configurations (skip internal regex patterns)
            const constMatch = line.match(/(?:const|let|var|readonly)\s+([A-Z0-9_]{3,})\s*=\s*([^;,]+)/);
            if (constMatch) {
              const name = constMatch[1];
              let val = constMatch[2].trim().replace(/^['"`]|['"`]$/g, '');
              // Ignore internal regexes, conditions, object blocks, and patterns
              if (!name.includes('PATTERN') && !name.includes('REGEX') && !name.includes('PROMPT') && !val.startsWith('/') && !val.startsWith('{') && !val.startsWith('[') && !val.includes('==') && !val.includes('&&') && !val.includes('||')) {
                entities.push({
                  name,
                  type: 'CONSTANT',
                  value: val,
                  file: relPath
                });
              }
            }
            const flagMatch = line.match(/add_argument\s*\(\s*['"](--[a-zA-Z0-9_-]+)['"]|\.option\s*\(\s*['"](?:-[a-zA-Z0-9],\s*)?(--[a-zA-Z0-9_-]+)/);
            if (flagMatch) {
              entities.push({
                name: flagMatch[1] || flagMatch[2],
                type: 'CLI_FLAG',
                file: relPath
              });
            }
          }
        } catch {
          // Skip unreadable files
        }
      }
    }
  }

  await walk(repoPath);
  return generateReadmeFromEntities(entities, pkg);
}
