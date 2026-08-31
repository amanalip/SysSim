import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import path from 'node:path';

const assetDir = new URL('../dist/assets/', import.meta.url);
const files = await readdir(assetDir);
const rows = [];

for (const name of files.filter((file) => file.endsWith('.js') || file.endsWith('.css'))) {
  const bytes = await readFile(new URL(name, assetDir));
  rows.push({
    name,
    type: path.extname(name).slice(1),
    bytes: bytes.length,
    gzipBytes: gzipSync(bytes).length,
  });
}

const js = rows.filter((row) => row.type === 'js');
const css = rows.filter((row) => row.type === 'css');
const entryJs = js.filter((row) => row.name.startsWith('index-'));
const entryCss = css.filter((row) => row.name.startsWith('index-'));
const report = {
  generatedAt: new Date().toISOString(),
  budgets: {
    entryJavaScriptGzipBytes: 250_000,
    entryCssBytes: 75_000,
    largestJavaScriptChunkBytes: 500_000,
  },
  totals: {
    entryJavaScriptGzipBytes: entryJs.reduce((sum, row) => sum + row.gzipBytes, 0),
    entryCssBytes: entryCss.reduce((sum, row) => sum + row.bytes, 0),
    largestJavaScriptChunkBytes: Math.max(...js.map((row) => row.bytes)),
  },
  assets: rows.sort((a, b) => b.bytes - a.bytes),
};

await mkdir(new URL('../reports/', import.meta.url), { recursive: true });
await writeFile(
  new URL('../reports/bundle-report.json', import.meta.url),
  `${JSON.stringify(report, null, 2)}\n`,
);

console.table(report.totals);
const violations = Object.entries(report.totals).filter(
  ([name, value]) => value > report.budgets[name],
);
if (violations.length) {
  console.error(`Bundle budget exceeded: ${violations.map(([name]) => name).join(', ')}`);
  process.exitCode = 1;
}
