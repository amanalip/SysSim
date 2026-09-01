const base = (process.argv[2] || process.env.SYSSIM_DEPLOY_URL || '').replace(/\/?$/, '/');
if (!base) throw new Error('Usage: node scripts/post-deploy-smoke.mjs <deployment-url>');

async function requireOk(url, label) {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`${label} returned HTTP ${response.status}: ${url}`);
  return response;
}

const index = await (await requireOk(base, 'application root')).text();
const assetPaths = [...index.matchAll(/(?:src|href)="([^"]+(?:\.js|\.css|\.svg))"/g)].map(
  (match) => match[1],
);
if (!assetPaths.length) throw new Error('No production assets were referenced by the deployment');
for (const path of assetPaths) await requireOk(new URL(path, base), `asset ${path}`);

const recovery = await (await requireOk(new URL('404.html', base), '404 recovery page')).text();
if (!recovery.includes('sessionStorage.redirect = location.href') || !recovery.includes('/SysSim/'))
  throw new Error('404 recovery page does not preserve the original URL and return to /SysSim/');

await requireOk(`${base}#post-deploy-hash`, 'hash URL');
console.log(`Post-deployment smoke passed for ${base} with ${assetPaths.length} entry assets.`);
