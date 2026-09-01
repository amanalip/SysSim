import { pathToFileURL, URLSearchParams } from 'node:url';
import { resolve } from 'node:path';

export async function verifyCiQualifiedRef({
  repository = process.env.GITHUB_REPOSITORY,
  sha = process.env.SYSSIM_CANDIDATE_SHA,
  token = process.env.GITHUB_TOKEN,
  fetchImpl = fetch,
} = {}) {
  if (!repository || !/^[\w.-]+\/[\w.-]+$/.test(repository))
    throw new Error('GITHUB_REPOSITORY must identify the owner and repository');
  if (!sha || !/^[0-9a-f]{40}$/i.test(sha))
    throw new Error('SYSSIM_CANDIDATE_SHA must be a full commit SHA');
  if (!token) throw new Error('GITHUB_TOKEN is required to verify CI qualification');

  const query = new URLSearchParams({
    head_sha: sha,
    event: 'push',
    status: 'success',
    per_page: '100',
  });
  const response = await fetchImpl(
    `https://api.github.com/repos/${repository}/actions/workflows/ci.yml/runs?${query}`,
    {
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'x-github-api-version': '2022-11-28',
      },
    },
  );
  if (!response.ok)
    throw new Error(`GitHub CI qualification lookup returned HTTP ${response.status}`);
  const payload = await response.json();
  const qualified = Array.isArray(payload.workflow_runs)
    ? payload.workflow_runs.some(
        (run) =>
          run.head_sha === sha &&
          run.event === 'push' &&
          run.status === 'completed' &&
          run.conclusion === 'success',
      )
    : false;
  if (!qualified)
    throw new Error(`Refusing deployment: ${sha} has no successful push-triggered CI run`);
  return sha;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) {
  const sha = await verifyCiQualifiedRef();
  console.log(`Verified successful push-triggered CI for ${sha}`);
}
