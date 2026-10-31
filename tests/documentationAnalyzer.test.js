import { describe, it, expect } from 'vitest';
import { extractDocumentationChunks, splitIntoSentences } from '../src/analyzer/documentationAnalyzer.js';

describe('splitIntoSentences', () => {
  it('splits single-line multiple sentences', () => {
    const text = 'The application waits for 30 seconds. Then it times out.';
    const sentences = splitIntoSentences(text, 10);
    expect(sentences).toHaveLength(2);
    expect(sentences[0].text).toBe('The application waits for 30 seconds.');
    expect(sentences[0].lineStart).toBe(10);
    expect(sentences[1].text).toBe('Then it times out.');
  });

  it('handles multi-line paragraphs', () => {
    const text = 'Use the --timeout flag to prevent\nlong hanging requests. Default is 30.';
    const sentences = splitIntoSentences(text, 5);
    expect(sentences).toHaveLength(2);
    expect(sentences[0].text).toBe('Use the --timeout flag to prevent long hanging requests.');
    expect(sentences[1].text).toBe('Default is 30.');
  });
});

describe('extractDocumentationChunks', () => {
  it('extracts sentences with correct sections and line numbers', () => {
    const markdown = `# API Reference

## Configuration
The default timeout is 30 seconds.
You can override this with the --timeout CLI flag.

## Authentication
Tokens expire after 24 hours.
`;

    const chunks = extractDocumentationChunks(markdown, 'README.md');
    expect(chunks.length).toBeGreaterThanOrEqual(3);

    const timeoutChunk = chunks.find(c => c.text.includes('30 seconds'));
    expect(timeoutChunk).toBeDefined();
    expect(timeoutChunk.section).toBe('Configuration');
    expect(timeoutChunk.file).toBe('README.md');
    expect(timeoutChunk.lineStart).toBe(4);

    const flagChunk = chunks.find(c => c.text.includes('--timeout'));
    expect(flagChunk).toBeDefined();
    expect(flagChunk.section).toBe('Configuration');

    const authChunk = chunks.find(c => c.text.includes('Tokens expire'));
    expect(authChunk).toBeDefined();
    expect(authChunk.section).toBe('Authentication');
  });

  it('extracts markdown tables into structured chunks', () => {
    const markdown = `## Options

| Flag | Default | Description |
|---|---|---|
| --timeout | 30 | Wait timeout in seconds |
| --retries | 3 | Maximum retry attempts |
`;

    const chunks = extractDocumentationChunks(markdown, 'docs/cli.md');
    const tableRows = chunks.filter(c => c.type === 'table_row');
    expect(tableRows).toHaveLength(2);

    expect(tableRows[0].headers).toEqual(['Flag', 'Default', 'Description']);
    expect(tableRows[0].cells).toEqual(['--timeout', '30', 'Wait timeout in seconds']);
    expect(tableRows[0].text).toContain('Flag: --timeout');
    expect(tableRows[0].text).toContain('Default: 30');
    expect(tableRows[0].section).toBe('Options');
  });

  it('extracts code blocks with language and line numbers', () => {
    const markdown = `## Usage

\`\`\`bash
docguard --timeout 45
\`\`\`
`;

    const chunks = extractDocumentationChunks(markdown, 'README.md');
    const codeBlock = chunks.find(c => c.type === 'code_block');
    expect(codeBlock).toBeDefined();
    expect(codeBlock.language).toBe('bash');
    expect(codeBlock.text).toBe('docguard --timeout 45');
    expect(codeBlock.lineStart).toBe(3);
  });
});
