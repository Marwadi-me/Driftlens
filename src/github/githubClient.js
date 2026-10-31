import { parseDiff } from '../git/diffParser.js';
import { extractDocumentationChunks } from '../analyzer/documentationAnalyzer.js';

export class GitHubClient {
  constructor(token = process.env.GITHUB_TOKEN) {
    this.token = token;
    this.apiBase = 'https://api.github.com';
  }

  getHeaders() {
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'DriftLens-Bot/0.1.0'
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  /**
   * Fetches metadata for a GitHub Pull Request.
   * @param {string} owner 
   * @param {string} repo 
   * @param {number|string} prNumber 
   * @returns {Promise<object>}
   */
  async getPullRequest(owner, repo, prNumber) {
    const url = `${this.apiBase}/repos/${owner}/${repo}/pulls/${prNumber}`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`GitHub API error (${res.status}) fetching PR #${prNumber}: ${err}`);
    }
    return res.json();
  }

  /**
   * Fetches changed files and patches for a GitHub Pull Request.
   * @param {string} owner 
   * @param {string} repo 
   * @param {number|string} prNumber 
   * @returns {Promise<Array<object>>}
   */
  async getPullRequestFiles(owner, repo, prNumber) {
    const url = `${this.apiBase}/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`GitHub API error (${res.status}) fetching files for PR #${prNumber}: ${err}`);
    }
    return res.json();
  }

  /**
   * Fetches raw content of a file from a repository at a given ref/commit.
   * @param {string} owner 
   * @param {string} repo 
   * @param {string} filePath 
   * @param {string} ref 
   * @returns {Promise<string>}
   */
  async getFileContent(owner, repo, filePath, ref = 'main') {
    const url = `${this.apiBase}/repos/${owner}/${repo}/contents/${filePath}?ref=${ref}`;
    const headers = {
      ...this.getHeaders(),
      'Accept': 'application/vnd.github.v3.raw'
    };

    const res = await fetch(url, { headers });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`GitHub API error (${res.status}) fetching file ${filePath}: ${err}`);
    }
    return res.text();
  }

  /**
   * Transforms GitHub PR changed files into unified diff objects compatible with DriftLens diffParser.
   * @param {Array<object>} ghFiles 
   * @returns {Array<object>}
   */
  parsePRFilesToDiffs(ghFiles) {
    let combinedDiffText = '';
    for (const f of ghFiles) {
      if (f.patch) {
        combinedDiffText += `diff --git a/${f.filename} b/${f.filename}\n`;
        combinedDiffText += `--- a/${f.filename}\n`;
        combinedDiffText += `+++ b/${f.filename}\n`;
        combinedDiffText += `${f.patch}\n`;
      }
    }
    return parseDiff(combinedDiffText);
  }

  /**
   * Scans and extracts documentation chunks from known repo markdown files on GitHub.
   * @param {string} owner 
   * @param {string} repo 
   * @param {Array<string>} docPaths 
   * @param {string} ref 
   * @returns {Promise<Array<object>>}
   */
  async fetchDocumentationChunks(owner, repo, docPaths = ['README.md'], ref = 'main') {
    const allChunks = [];
    for (const docPath of docPaths) {
      try {
        const content = await this.getFileContent(owner, repo, docPath, ref);
        const chunks = extractDocumentationChunks(content, docPath);
        allChunks.push(...chunks);
      } catch {
        // Skip missing files gracefully
      }
    }
    return allChunks;
  }
}
