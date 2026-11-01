import { describe, it, expect } from 'vitest';
import { generateReadmeFromEntities, generateReadmeForRepo } from '../src/analyzer/docGenerator.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

describe('README Generator from Code Analysis', () => {
  it('generates structured Markdown from extracted code entities', () => {
    const entities = [
      { name: 'DEFAULT_PORT', type: 'CONSTANT', value: '8080', file: 'src/config.js' },
      { name: 'MAX_RETRIES', type: 'CONSTANT', value: '5', file: 'src/config.js' },
      { name: '--timeout', type: 'CLI_FLAG', file: 'src/cli.js' },
      { name: '--verbose', type: 'CLI_FLAG', file: 'src/cli.js' },
      { name: '/api/v1/health', type: 'ROUTE' },
      { name: 'startServer', type: 'FUNCTION' }
    ];

    const meta = {
      name: 'SampleService',
      description: 'A resilient microservice.',
      version: '2.0.0',
      license: 'Apache-2.0'
    };

    const markdown = generateReadmeFromEntities(entities, meta);

    expect(markdown).toContain('# SampleService');
    expect(markdown).toContain('A resilient microservice.');
    expect(markdown).toContain('Version: `2.0.0`');
    expect(markdown).toContain('## ⚙️ Configuration');
    expect(markdown).toContain('`DEFAULT_PORT`');
    expect(markdown).toContain('`8080`');
    expect(markdown).toContain('## 💻 CLI Options');
    expect(markdown).toContain('`--timeout`');
    expect(markdown).toContain('## 🔌 API Reference');
    expect(markdown).toContain('`/api/v1/health`');
    expect(markdown).toContain('`startServer()`');
    expect(markdown).toContain('Apache-2.0 License');
  });

  it('handles empty entities gracefully with default starter sections', () => {
    const markdown = generateReadmeFromEntities([], {});
    expect(markdown).toContain('# MyProject');
    expect(markdown).toContain('## 🚀 Quickstart');
    expect(markdown).toContain('MIT License');
  });

  it('analyzes local repository and extracts live codebase entities', async () => {
    const markdown = await generateReadmeForRepo(projectRoot);
    expect(markdown).toContain('# driftlens');
    expect(markdown).toContain('## 🚀 Quickstart');
    expect(typeof markdown).toBe('string');
  });
});

