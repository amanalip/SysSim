import { readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

function sourceFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return ['.ts', '.tsx'].includes(extname(path)) ? [path] : [];
  });
}

describe('architecture dependency direction', () => {
  it('keeps model code independent from UI, store, and engine adapters', () => {
    for (const file of sourceFiles(join(process.cwd(), 'src/model'))) {
      const source = readFileSync(file, 'utf8');
      expect(source, file).not.toMatch(/from ['"]\.\.\/(components|store|engine)\//);
    }
  });

  it('keeps pure engine modules independent from UI and Zustand store state', () => {
    const roots = ['components', 'metrics', 'routing']
      .flatMap((directory) => sourceFiles(join(process.cwd(), 'src/engine', directory)))
      .filter((file) => !file.endsWith('metrics/chaos-runner.ts'));
    for (const file of roots) {
      const source = readFileSync(file, 'utf8');
      expect(source, file).not.toMatch(/from ['"].*\/(components|store)\//);
    }
  });
});
