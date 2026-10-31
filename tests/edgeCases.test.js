import { describe, it, expect } from 'vitest';
import { extractAllRepoDocumentation, extractDocumentationChunks } from '../src/analyzer/documentationAnalyzer.js';
import { matchCandidates } from '../src/matcher/candidateMatcher.js';
import { generateStructuredReport, formatTerminalReport } from '../src/report/reportGenerator.js';
import { buildDriftFindings } from '../src/evidence/evidenceEngine.js';
import { MockLLMClient } from '../src/ai/llmClient.js';

describe('Edge Case: No README.md or Zero Documentation Files', () => {
  it('handles repositories with documentation in docs/ but NO root README.md', () => {
    const configDoc = `# Config Guide
The default timeout is 30 seconds.`;

    // Extracted from docs/config.md (no README.md present)
    const chunks = extractDocumentationChunks(configDoc, 'docs/config.md');
    expect(chunks).toHaveLength(1);
    expect(chunks[0].file).toBe('docs/config.md');

    const entity = {
      name: 'DEFAULT_TIMEOUT',
      oldValue: '30',
      newValue: '60',
      file: 'src/config.js',
      line: 1
    };

    const candidates = matchCandidates([entity], chunks);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].docChunk.file).toBe('docs/config.md');
  });

  it('handles repositories with completely zero documentation gracefully', async () => {
    const emptyDocChunks = [];
    const changedEntities = [
      {
        name: 'TIMEOUT',
        oldValue: '10',
        newValue: '20',
        file: 'src/app.js',
        line: 5
      }
    ];

    // Zero candidates matched because 0 documentation files exist
    const candidates = matchCandidates(changedEntities, emptyDocChunks);
    expect(candidates).toHaveLength(0);

    const mockClient = new MockLLMClient();
    const findings = await buildDriftFindings(candidates, mockClient, []);
    expect(findings).toHaveLength(0);

    const report = generateStructuredReport(findings, {
      filesAnalyzed: 2,
      documentsAnalyzed: 0,
      candidatePairsEvaluated: 0
    });

    expect(report.status).toBe('PASS');
    expect(report.summary.documentsAnalyzed).toBe(0);
    expect(report.findings).toHaveLength(0);

    const terminalOutput = formatTerminalReport(report);
    expect(terminalOutput).toContain('PASS');
    expect(terminalOutput).toContain('Docs Analyzed:    0');
  });

  it('handles source-only PRs where no documentation was touched', () => {
    const parsedDiffs = [
      {
        file: 'src/math.js',
        type: 'source',
        hunks: [
          {
            oldStart: 1,
            newStart: 1,
            added: ['const PI = 3.14159;'],
            removed: ['const PI = 3.14;']
          }
        ]
      }
    ];

    // Only source files in diff, 0 documentation in diff
    const docDiffs = parsedDiffs.filter(d => d.type === 'documentation');
    expect(docDiffs).toHaveLength(0);
  });
});

