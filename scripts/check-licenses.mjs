import { readFileSync } from 'node:fs';

const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
const reviewedLicenses = new Set([
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'BlueOak-1.0.0',
  'CC-BY-4.0',
  'CC0-1.0',
  'ISC',
  'MIT',
  'MIT AND ISC',
  'MIT-0',
  'MPL-2.0',
  'Python-2.0',
]);

const unresolved = Object.entries(lock.packages)
  .filter(([path]) => path.startsWith('node_modules/'))
  .filter(([, metadata]) => !metadata.license || !reviewedLicenses.has(metadata.license))
  .map(
    ([path, metadata]) => `${path.replace('node_modules/', '')}: ${metadata.license ?? 'missing'}`,
  );

if (unresolved.length) {
  console.error(`Unreviewed dependency licenses:\n${unresolved.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(
    `Verified ${Object.keys(lock.packages).length - 1} locked dependency entries against the GPL-3.0-only compatibility review.`,
  );
}
