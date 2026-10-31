import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Splits paragraph text into individual sentences while calculating line offsets.
 * @param {string} text 
 * @param {number} startLine 
 * @returns {Array<{text: string, lineStart: number, lineEnd: number}>}
 */
export function splitIntoSentences(text, startLine) {
  if (!text || !text.trim()) return [];

  const rawLines = text.split(/\r?\n/);
  const sentences = [];
  let currentSentence = '';
  let sentenceStartLine = startLine;

  for (let lineIdx = 0; lineIdx < rawLines.length; lineIdx++) {
    const line = rawLines[lineIdx];
    const currentLineNumber = startLine + lineIdx;

    if (!line.trim()) {
      if (currentSentence.trim()) {
        sentences.push({
          text: currentSentence.trim(),
          lineStart: sentenceStartLine,
          lineEnd: currentLineNumber - 1
        });
        currentSentence = '';
      }
      sentenceStartLine = currentLineNumber + 1;
      continue;
    }

    // Split on sentence-ending punctuation (. ! ?) followed by whitespace
    const parts = line.split(/(?<=[.!?])\s+/);
    for (let partIdx = 0; partIdx < parts.length; partIdx++) {
      const part = parts[partIdx];
      if (!part) continue;

      if (currentSentence) {
        currentSentence += ' ' + part;
      } else {
        currentSentence = part;
        sentenceStartLine = currentLineNumber;
      }

      const hasEndPunctuation = /[.!?]$/.test(part.trim());

      // If this part ends with punctuation, flush as a completed sentence
      if (hasEndPunctuation) {
        sentences.push({
          text: currentSentence.trim(),
          lineStart: sentenceStartLine,
          lineEnd: currentLineNumber
        });
        currentSentence = '';
        sentenceStartLine = currentLineNumber;
      }
    }
  }

  if (currentSentence.trim()) {
    sentences.push({
      text: currentSentence.trim(),
      lineStart: sentenceStartLine,
      lineEnd: startLine + rawLines.length - 1
    });
  }

  return sentences;
}

/**
 * Extracts structured chunks (sentences, table rows, code blocks) from markdown content.
 * @param {string} content 
 * @param {string} filePath 
 * @returns {Array<object>}
 */
export function extractDocumentationChunks(content, filePath = 'README.md') {
  if (!content || typeof content !== 'string') return [];

  const lines = content.split(/\r?\n/);
  const chunks = [];
  let chunkCounter = 1;

  let currentSection = 'General';
  let inCodeBlock = false;
  let codeBlockStart = 0;
  let codeBlockLines = [];
  let codeBlockLang = '';

  let inTable = false;
  let tableHeaders = [];
  let tableStartLine = 0;

  let paragraphBuffer = [];
  let paragraphStartLine = 1;

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return;
    const paragraphText = paragraphBuffer.join('\n');
    const sentences = splitIntoSentences(paragraphText, paragraphStartLine);

    for (const s of sentences) {
      if (s.text.length > 5) {
        chunks.push({
          id: `doc-${chunkCounter++}`,
          file: filePath,
          type: 'sentence',
          lineStart: s.lineStart,
          lineEnd: s.lineEnd,
          section: currentSection,
          text: s.text
        });
      }
    }
    paragraphBuffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Code block boundaries
    if (trimmed.startsWith('```')) {
      flushParagraph();
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockStart = lineNumber;
        codeBlockLang = trimmed.slice(3).trim();
        codeBlockLines = [];
      } else {
        inCodeBlock = false;
        const codeText = codeBlockLines.join('\n').trim();
        if (codeText) {
          chunks.push({
            id: `doc-${chunkCounter++}`,
            file: filePath,
            type: 'code_block',
            language: codeBlockLang,
            lineStart: codeBlockStart,
            lineEnd: lineNumber,
            section: currentSection,
            text: codeText
          });
        }
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(rawLine);
      continue;
    }

    // Markdown Headings (# Header)
    const headingMatch = rawLine.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      inTable = false;
      currentSection = headingMatch[2].trim();
      continue;
    }

    // Markdown Tables
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushParagraph();
      const cells = trimmed
        .split('|')
        .slice(1, -1)
        .map(c => c.trim());

      // Check if delimiter row (|---|---|)
      const isDelimiter = cells.every(c => /^:?-+:?$/.test(c));

      if (!inTable) {
        inTable = true;
        tableHeaders = cells;
        tableStartLine = lineNumber;
      } else if (!isDelimiter) {
        // Data row
        const rowData = {};
        tableHeaders.forEach((h, idx) => {
          if (idx < cells.length) {
            rowData[h || `col_${idx + 1}`] = cells[idx];
          }
        });

        const formattedRowText = Object.entries(rowData)
          .map(([k, v]) => `${k}: ${v}`)
          .join(' | ');

        chunks.push({
          id: `doc-${chunkCounter++}`,
          file: filePath,
          type: 'table_row',
          lineStart: lineNumber,
          lineEnd: lineNumber,
          section: currentSection,
          headers: tableHeaders,
          cells,
          rowData,
          text: formattedRowText
        });
      }
      continue;
    } else if (inTable) {
      inTable = false;
      tableHeaders = [];
    }

    // Empty line separates paragraphs
    if (trimmed === '') {
      flushParagraph();
      continue;
    }

    // List items or prose lines
    if (paragraphBuffer.length === 0) {
      paragraphStartLine = lineNumber;
    }
    paragraphBuffer.push(rawLine);
  }

  flushParagraph();
  return chunks;
}

/**
 * Scans a repository directory for all Markdown documentation files.
 * @param {string} repoPath 
 * @returns {Promise<Array<string>>}
 */
export async function findDocumentationFiles(repoPath) {
  const docFiles = [];

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
        if (
          entry.name === 'node_modules' ||
          entry.name === '.git' ||
          entry.name === 'coverage' ||
          entry.name === 'dist'
        ) {
          continue;
        }
        await walk(fullPath);
      } else if (entry.isFile()) {
        const lower = entry.name.toLowerCase();
        if (lower.endsWith('.md') || lower.endsWith('.markdown') || lower.endsWith('.mdx')) {
          docFiles.push(relPath);
        }
      }
    }
  }

  await walk(repoPath);
  return docFiles;
}

/**
 * Loads and extracts documentation chunks from all docs in a repository.
 * @param {string} repoPath 
 * @returns {Promise<Array<object>>}
 */
export async function extractAllRepoDocumentation(repoPath) {
  const files = await findDocumentationFiles(repoPath);
  const allChunks = [];

  for (const relFile of files) {
    try {
      const fullPath = path.join(repoPath, relFile);
      const content = await fs.readFile(fullPath, 'utf8');
      const chunks = extractDocumentationChunks(content, relFile);
      allChunks.push(...chunks);
    } catch {
      // Ignore unreadable files gracefully
    }
  }

  return allChunks;
}
