export type IdEntropySource = () => string;

let fallbackSequence = 0;
const fallbackSession = Date.now().toString(36);

function browserEntropy(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  fallbackSequence += 1;
  return `${fallbackSession}-${fallbackSequence.toString(36)}`;
}

let entropySource: IdEntropySource = browserEntropy;

export function createId(scope: string): string {
  const safeScope = scope.replace(/[^A-Za-z0-9_-]/g, '-').replace(/^-+|-+$/g, '') || 'id';
  return `${safeScope}_${entropySource()}`;
}

/** Test-only injection point for deterministic fixtures. Pass no argument to restore production. */
export function setIdEntropySource(source?: IdEntropySource): void {
  entropySource = source ?? browserEntropy;
}
