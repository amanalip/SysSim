export const FORBIDDEN_OBJECT_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

export interface UntrustedDataLimits {
  maxDepth: number;
  maxEntries: number;
  maxStringLength: number;
}

export const DEFAULT_UNTRUSTED_DATA_LIMITS: UntrustedDataLimits = {
  maxDepth: 8,
  maxEntries: 5_000,
  maxStringLength: 10_000,
};

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/**
 * Rejects hostile keys and resource-exhaustion shapes before migration,
 * validation, persistence, or rendering touches caller-controlled data.
 */
export function assertSafeUntrustedValue(
  value: unknown,
  limits: UntrustedDataLimits = DEFAULT_UNTRUSTED_DATA_LIMITS,
): void {
  let entries = 0;
  const visit = (candidate: unknown, path: string, depth: number): void => {
    if (depth > limits.maxDepth) throw new Error(`${path} exceeds the nesting limit`);
    if (typeof candidate === 'string') {
      if (candidate.length > limits.maxStringLength)
        throw new Error(`${path} exceeds the text length limit`);
      return;
    }
    if (candidate === null || typeof candidate !== 'object') return;
    if (Array.isArray(candidate)) {
      entries += candidate.length;
      if (entries > limits.maxEntries) throw new Error('Input contains too many values');
      candidate.forEach((item, index) => visit(item, `${path}[${index}]`, depth + 1));
      return;
    }
    if (!isPlainRecord(candidate)) throw new Error(`${path} must be a plain object`);
    const objectEntries = Object.entries(candidate);
    entries += objectEntries.length;
    if (entries > limits.maxEntries) throw new Error('Input contains too many values');
    for (const [key, item] of objectEntries) {
      if (FORBIDDEN_OBJECT_KEYS.has(key)) throw new Error(`${path} contains forbidden key ${key}`);
      visit(item, `${path}.${key}`, depth + 1);
    }
  };
  visit(value, 'root', 0);
}

export function assertAllowedKeys(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  path: string,
): void {
  const unexpected = Object.keys(value).filter((key) => !allowed.has(key));
  if (unexpected.length) throw new Error(`${path} contains unexpected field ${unexpected[0]}`);
}

export function truncateUntrustedText(value: string, maxLength: number): string {
  const normalized = [...value]
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code >= 32 || code === 9 || code === 10 || code === 13;
    })
    .filter((character) => character.charCodeAt(0) !== 127)
    .join('');
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength - 1)}…`;
}

export function safeDownloadName(rawName: string, extension: string): string {
  const sanitized = rawName
    .normalize('NFKC')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '')
    .slice(0, 80);
  const base = sanitized || 'syssim-export';
  const safeExtension = extension.replace(/[^A-Za-z0-9]/g, '').slice(0, 8) || 'txt';
  return `${base}.${safeExtension}`;
}

export function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}
