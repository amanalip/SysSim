import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readRepoFile = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('Persistent quality rubric', () => {
  const rubric = readRepoFile('docs/quality-rubric.md');

  it('contains binary evidence requirements totaling exactly 100 points', () => {
    const rubricRows = [
      ...rubric.matchAll(/^\|\s*([A-Z0-9]+-\d+)\s*\|\s*(\d+)\s*\|\s*([^|]+)\|\s*([^|]+)\|$/gm),
    ];
    const totalWeight = rubricRows.reduce((sum, row) => sum + Number(row[2]), 0);

    expect(rubricRows.length).toBeGreaterThan(0);
    expect(totalWeight).toBe(100);
    rubricRows.forEach((row) => {
      expect(row[3].trim().length).toBeGreaterThan(10);
      expect(row[4].trim().length).toBeGreaterThan(10);
    });
  });

  it('defines mandatory deductions, the production threshold, and dated history', () => {
    expect(rubric).toContain('## Automatic deductions and caps');
    expect(rubric).toContain('at least **95/100**');
    expect(rubric).toContain('## Score history');
    expect(rubric).toContain('| 2026-08-27 | `042d627` |');
    expect(rubric).toMatch(
      /\|\s*2026-08-27\s*\|\s*`438a79d`\s*\|\s*6\s*\|\s*−43; cap 49\s*\|\s*0\s*\|/,
    );
  });

  it('keeps README positioning and license aligned with the product contract', () => {
    const readme = readRepoFile('README.md');

    expect(readme).toContain('education-first system-design architecture playground');
    expect(readme).toContain('[product contract](docs/product-contract.md)');
    expect(readme).toContain('GNU General Public License v3.0');
    expect(readme).not.toContain('MIT License');
    expect(readme).not.toContain('Discrete Event Simulation');
  });
});
