import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const scenarioDir = resolve('src/scenarios');
const files = (await readdir(scenarioDir)).filter(
  (name) => name.endsWith('.ts') && !['index.ts', 'audit.ts'].includes(name),
);
const urls = new Set();
for (const file of files) {
  const source = await readFile(resolve(scenarioDir, file), 'utf8');
  for (const match of source.matchAll(/url:\s*['"](https?:\/\/[^'"]+)['"]/g))
    urls.add(match[1].replace(/^http:\/\//, 'https://'));
}

const accessRestrictedHosts = new Set([
  'aws.amazon.com',
  'blog.x.com',
  'bytebytego.com',
  'cacm.acm.org',
  'cloud.google.com',
  'developer.apple.com',
  'discord.com',
  'dl.acm.org',
  'doordash.engineering',
  'engineering.fb.com',
  'engineering.linkedin.com',
  'learn.microsoft.com',
  'medium.com',
  'netflixtechblog.com',
  'reddit.com',
  'slack.engineering',
  'www.cloudflare.com',
  'www.oreilly.com',
  'doi.org',
  'tech.ebayinc.com',
  'www.etsy.com',
  'www.life360.com',
  'www.uber.com',
]);

async function check(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    let response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': 'SysSimScenarioLinkChecker/1.0' },
    });
    if (response.status === 405)
      response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'user-agent': 'SysSimScenarioLinkChecker/1.0', range: 'bytes=0-0' },
      });
    const host = new URL(url).hostname;
    const restricted = [403, 406].includes(response.status) && accessRestrictedHosts.has(host);
    return { url, status: response.status, ok: response.ok || restricted, restricted };
  } catch (error) {
    return {
      url,
      status: 0,
      ok: false,
      restricted: false,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

const queue = [...urls];
const results = [];
await Promise.all(
  Array.from({ length: Math.min(10, queue.length) }, async () => {
    while (queue.length) results.push(await check(queue.shift()));
  }),
);
results.sort((a, b) => a.url.localeCompare(b.url));
for (const result of results)
  console.log(
    `${result.ok ? 'OK' : 'FAIL'} ${result.status || 'ERR'} ${result.restricted ? '(access-restricted allowlist) ' : ''}${result.url}${result.error ? ` — ${result.error}` : ''}`,
  );
const failures = results.filter((result) => !result.ok);
console.log(`Checked ${results.length} unique scenario links; ${failures.length} failed.`);
await mkdir(resolve('reports'), { recursive: true });
await writeFile(
  resolve('reports/scenario-links.json'),
  `${JSON.stringify({ checkedAt: new Date().toISOString(), total: results.length, failures, results }, null, 2)}\n`,
);
if (failures.length) process.exitCode = 1;
