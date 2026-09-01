import { describe, expect, it, vi } from 'vitest';
import { verifyCiQualifiedRef } from '../../scripts/verify-ci-qualified-ref.mjs';

const sha = 'a'.repeat(40);

describe('manual Pages deployment qualification', () => {
  it('accepts only an exact successful push-triggered CI run', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            workflow_runs: [
              {
                head_sha: sha,
                event: 'push',
                status: 'completed',
                conclusion: 'success',
              },
            ],
          }),
          { status: 200 },
        ),
    );
    await expect(
      verifyCiQualifiedRef({ repository: 'owner/repo', sha, token: 'token', fetchImpl }),
    ).resolves.toBe(sha);
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining(`/actions/workflows/ci.yml/runs?head_sha=${sha}`),
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: 'Bearer token' }),
      }),
    );
  });

  it('rejects missing qualification, failed lookups, and malformed input', async () => {
    const noRuns = vi.fn(async () => new Response('{"workflow_runs":[]}', { status: 200 }));
    await expect(
      verifyCiQualifiedRef({ repository: 'owner/repo', sha, token: 'token', fetchImpl: noRuns }),
    ).rejects.toThrow(/no successful push-triggered CI run/);
    await expect(
      verifyCiQualifiedRef({
        repository: 'owner/repo',
        sha,
        token: 'token',
        fetchImpl: vi.fn(async () => new Response('', { status: 403 })),
      }),
    ).rejects.toThrow(/HTTP 403/);
    await expect(
      verifyCiQualifiedRef({ repository: 'invalid', sha: 'short', token: '' }),
    ).rejects.toThrow(/GITHUB_REPOSITORY/);
  });
});
