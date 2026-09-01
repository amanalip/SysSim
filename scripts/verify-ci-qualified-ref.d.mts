export interface CiQualificationOptions {
  repository?: string;
  sha?: string;
  token?: string;
  fetchImpl?: typeof fetch;
}

export function verifyCiQualifiedRef(options?: CiQualificationOptions): Promise<string>;
