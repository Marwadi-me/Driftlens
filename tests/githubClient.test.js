import { describe, it, expect, vi } from 'vitest';
import { GitHubClient } from '../src/github/githubClient.js';

describe('GitHubClient', () => {
  it('configures authentication headers properly', () => {
    const unauthed = new GitHubClient(null);
    expect(unauthed.getHeaders()['Authorization']).toBeUndefined();

    const authed = new GitHubClient('ghp_test123');
    expect(authed.getHeaders()['Authorization']).toBe('Bearer ghp_test123');
  });

  it('converts GitHub PR files response to unified diff structures', () => {
    const client = new GitHubClient();
    const mockFiles = [
      {
        filename: 'src/config.js',
        status: 'modified',
        additions: 1,
        deletions: 1,
        patch: '@@ -1,3 +1,3 @@\n-const DEFAULT_TIMEOUT = 30;\n+const DEFAULT_TIMEOUT = 60;'
      }
    ];

    const diffs = client.parsePRFilesToDiffs(mockFiles);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].file).toBe('src/config.js');
    expect(diffs[0].hunks[0].removed).toEqual(['const DEFAULT_TIMEOUT = 30;']);
    expect(diffs[0].hunks[0].added).toEqual(['const DEFAULT_TIMEOUT = 60;']);
  });

  it('fetches PR metadata and contents with fetch mocks', async () => {
    const client = new GitHubClient('test-token');

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ number: 123, title: 'Update timeout' }),
      text: async () => '# Documentation\n\nDefault is 30s.'
    });

    const pr = await client.getPullRequest('owner', 'repo', 123);
    expect(pr.number).toBe(123);

    const content = await client.getFileContent('owner', 'repo', 'README.md', 'main');
    expect(content).toContain('Default is 30s.');
  });
});

