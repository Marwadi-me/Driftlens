/**
 * Report Generator
 * Produces structured JSON, terminal summaries, and GitHub PR review comments.
 */

/**
 * Calculates overall status based on findings.
 * @param {Array<object>} findings 
 * @returns {'PASS' | 'WARN' | 'FAIL'}
 */
export function determineReportStatus(findings) {
  if (!findings || findings.length === 0) return 'PASS';
  const hasHigh = findings.some(f => f.severity === 'high');
  if (hasHigh) return 'FAIL';
  return 'WARN';
}

/**
 * Compiles a structured drift report object.
 * @param {Array<object>} findings 
 * @param {object} stats 
 * @returns {object}
 */
export function generateStructuredReport(findings, stats = {}) {
  const status = determineReportStatus(findings);

  const highCount = findings.filter(f => f.severity === 'high').length;
  const mediumCount = findings.filter(f => f.severity === 'medium').length;
  const lowCount = findings.filter(f => f.severity === 'low').length;

  return {
    status,
    timestamp: new Date().toISOString(),
    summary: {
      status,
      filesAnalyzed: stats.filesAnalyzed ?? 0,
      documentsAnalyzed: stats.documentsAnalyzed ?? 0,
      candidatePairsEvaluated: stats.candidatePairsEvaluated ?? 0,
      findings: findings.length,
      highSeverity: highCount,
      mediumSeverity: mediumCount,
      lowSeverity: lowCount
    },
    findings
  };
}

/**
 * Formats findings for console / terminal output.
 * @param {object} report 
 * @returns {string}
 */
export function formatTerminalReport(report) {
  const { status, summary, findings } = report;
  const lines = [];

  lines.push('');
  lines.push('======================================================================');
  lines.push('                      DRIFTLENS DRIFT REPORT                          ');
  lines.push('          "Catch the documentation a code change just made wrong."     ');
  lines.push('======================================================================');
  lines.push('');

  const statusSymbol = status === 'FAIL' ? '❌ FAIL' : (status === 'WARN' ? '⚠️ WARN' : '✅ PASS');
  lines.push(`Overall Status:   ${statusSymbol}`);
  lines.push(`Files Analyzed:   ${summary.filesAnalyzed}`);
  lines.push(`Docs Analyzed:    ${summary.documentsAnalyzed}`);
  lines.push(`Total Findings:   ${summary.findings} (${summary.highSeverity} High, ${summary.mediumSeverity} Medium, ${summary.lowSeverity} Low)`);
  lines.push('');

  if (findings.length === 0) {
    if (summary.documentsAnalyzed === 0) {
      lines.push('ℹ️ No documentation files found in repository. No documentation drift detected.');
    } else {
      lines.push('✅ No documentation drift detected. All documentation remains consistent with changes.');
    }
    lines.push('');
    return lines.join('\n');
  }

  lines.push('-------------------------- DETECTED DRIFT ----------------------------');

  for (const f of findings) {
    const sevBadge = `[${f.severity.toUpperCase()}]`;
    const confPercent = Math.round(f.confidence * 100);

    lines.push('');
    lines.push(`${sevBadge} Finding: ${f.id} (Confidence: ${confPercent}%)`);
    lines.push(`Documentation: ${f.documentation.file}:${f.documentation.lineStart}`);
    lines.push(`  "${f.documentation.text}"`);
    lines.push('');
    lines.push(`Responsible Code Change:`);
    lines.push(`  Source: ${f.source.file}:${f.source.lineStart}`);
    if (f.source.oldValue !== undefined && f.source.newValue !== undefined) {
      lines.push(`  Changed: ${f.source.entityName}: ${f.source.oldValue} → ${f.source.newValue}`);
    }
    if (f.source.before && f.source.after) {
      lines.push(`  - Before: ${f.source.before}`);
      lines.push(`  + After:  ${f.source.after}`);
    }
    lines.push('');
    lines.push(`Reason:`);
    lines.push(`  ${f.reason}`);
    lines.push('');
    lines.push(`Suggested Correction:`);
    lines.push(`  "${f.suggestion}"`);
    lines.push('----------------------------------------------------------------------');
  }

  return lines.join('\n');
}

/**
 * Formats findings as a GitHub Pull Request review comment markdown.
 * @param {object} report 
 * @returns {string}
 */
export function formatGitHubPRReview(report) {
  const { status, summary, findings } = report;
  const statusEmoji = status === 'FAIL' ? '❌' : (status === 'WARN' ? '⚠️' : '✅');

  let md = `## ${statusEmoji} DriftLens: Documentation Drift Report\n\n`;
  md += `> **"Catch the documentation a code change just made wrong."**\n\n`;

  md += `| Status | Files Analyzed | Documents Checked | Drift Findings |\n`;
  md += `| :---: | :---: | :---: | :---: |\n`;
  md += `| **${status}** | ${summary.filesAnalyzed} | ${summary.documentsAnalyzed} | **${summary.findings}** (${summary.highSeverity} High, ${summary.mediumSeverity} Med) |\n\n`;

  if (findings.length === 0) {
    if (summary.documentsAnalyzed === 0) {
      md += `ℹ️ **No documentation files found in repository.** No documentation drift detected.\n`;
    } else {
      md += `✅ **No documentation drift detected.** Documentation appears consistent with code changes.\n`;
    }
    return md;
  }

  md += `### ⚠️ Inconsistencies Requiring Attention\n\n`;

  for (const f of findings) {
    const confPercent = Math.round(f.confidence * 100);
    const sevBadge = f.severity === 'high' ? '🔴 HIGH' : (f.severity === 'medium' ? '🟡 MEDIUM' : '⚪ LOW');

    md += `<details open>\n`;
    md += `<summary><b>${f.id}: ${f.documentation.file}:${f.documentation.lineStart}</b> [${sevBadge} | ${confPercent}% Confidence]</summary>\n\n`;
    md += `**Affected Documentation Statement:**\n`;
    md += `> ${f.documentation.text}\n\n`;
    md += `**Responsible Code Change:**\n`;
    md += `- **File**: \`${f.source.file}:${f.source.lineStart}\`\n`;
    if (f.source.before && f.source.after) {
      md += `\`\`\`diff\n- ${f.source.before}\n+ ${f.source.after}\n\`\`\`\n\n`;
    }
    md += `**Why Drift Occurred:**\n${f.reason}\n\n`;
    md += `**Suggested Correction:**\n`;
    md += `\`\`\`suggestion\n${f.suggestion}\n\`\`\`\n\n`;
    md += `</details>\n\n`;
  }

  md += `\n*Automated report generated by DriftLens via open-weight model Qwen 2.5 7B.*`;
  return md;
}
