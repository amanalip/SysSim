import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

mkdirSync('reports', { recursive: true });
const sbom = execFileSync('npm', ['sbom', '--sbom-format', 'cyclonedx'], {
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
});
JSON.parse(sbom);
writeFileSync('reports/sbom.cdx.json', sbom, 'utf8');
console.log('Wrote reports/sbom.cdx.json');
