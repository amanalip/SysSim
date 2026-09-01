const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
if (!repository || !token) {
  console.log('Release milestone blocker check skipped outside authenticated GitHub CI.');
  process.exit(0);
}

const headers = {
  accept: 'application/vnd.github+json',
  authorization: `Bearer ${token}`,
  'x-github-api-version': '2022-11-28',
};
const blockers = new Map();
for (const priority of ['P0', 'P1']) {
  const query = encodeURIComponent(
    `repo:${repository} is:issue is:open milestone:* label:${priority}`,
  );
  const response = await fetch(`https://api.github.com/search/issues?q=${query}&per_page=100`, {
    headers,
  });
  if (!response.ok) throw new Error(`GitHub issue search failed with HTTP ${response.status}`);
  const payload = await response.json();
  for (const issue of payload.items || []) blockers.set(issue.html_url, issue.title);
}
if (blockers.size) {
  for (const [url, title] of blockers) console.error(`Release blocker: ${title} — ${url}`);
  throw new Error(`${blockers.size} open P0/P1 release-milestone issue(s) block deployment`);
}
console.log('No open P0/P1 issues are assigned to a release milestone.');
