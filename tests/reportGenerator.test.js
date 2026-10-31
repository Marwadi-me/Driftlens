import { describe, it, expect } from 'vitest';
import { 
  determineReportStatus, 
  generateStructuredReport, 
  formatTerminalReport, 
  formatGitHubPRReview 
} from '../src/report/reportGenerator.js';

describe('determineReportStatus', () => {
  it('returns PASS for empty findings', () => {
    expect(determineReportStatus([])).toBe('PASS');
  });

  it('returns FAIL if any high severity finding exists', () => {
    expect(determineReportStatus([{ severity: 'high' }])).toBe('FAIL');
  });

  it('returns WARN if only medium or low findings exist', () => {
    expect(determineReportStatus([{ severity: 'medium' }])).toBe('WARN');
  });
});

describe('generateStructuredReport & formatting', () => {
  const sampleFinding = {
    id: 'DRIFT-001',
    severity: 'high',
    confidence: 0.96,
    source: {
      file: 'src/config.js',
      lineStart: 1,
      entityName: 'DEFAULT_TIMEOUT',
      oldValue: '30',
      newValue: '60',
      before: 'const DEFAULT_TIMEOUT = 30;',
      after: 'const DEFAULT_TIMEOUT = 60;'
    },
    documentation: {
      file: 'README.md',
      lineStart: 42,
      text: 'The default timeout is 30 seconds.'
    },
    reason: 'The documented timeout does not match the new value.',
    suggestion: 'The default timeout is 60 seconds.'
  };

  it('generates structured report with correct counts', () => {
    const report = generateStructuredReport([sampleFinding], {
      filesAnalyzed: 3,
      documentsAnalyzed: 2
    });

    expect(report.status).toBe('FAIL');
    expect(report.summary.findings).toBe(1);
    expect(report.summary.highSeverity).toBe(1);
    expect(report.summary.filesAnalyzed).toBe(3);
    expect(report.findings[0].id).toBe('DRIFT-001');
  });

  it('formats human-readable terminal report', () => {
    const report = generateStructuredReport([sampleFinding], {
      filesAnalyzed: 3,
      documentsAnalyzed: 2
    });

    const term = formatTerminalReport(report);
    expect(term).toContain('DRIFTLENS DRIFT REPORT');
    expect(term).toContain('FAIL');
    expect(term).toContain('README.md:42');
    expect(term).toContain('DEFAULT_TIMEOUT: 30 → 60');
    expect(term).toContain('The default timeout is 60 seconds.');
  });

  it('formats GitHub PR review markdown with suggestions', () => {
    const report = generateStructuredReport([sampleFinding], {
      filesAnalyzed: 3,
      documentsAnalyzed: 2
    });

    const md = formatGitHubPRReview(report);
    expect(md).toContain('## ❌ DriftLens: Documentation Drift Report');
    expect(md).toContain('```suggestion');
    expect(md).toContain('The default timeout is 60 seconds.');
  });
});
