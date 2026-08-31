import { APPLICATION_VERSION, ARCHITECTURE_SCHEMA_VERSION } from '../model/architecture-schema';
import { getRuntimePerformanceSnapshot } from './runtime-performance';

export interface DiagnosticReportContext {
  simulationSeed: number;
  simulationState: string;
  runtimeMode: string;
  nodeCount: number;
  edgeCount: number;
  lastErrorCategory?: string;
}

export function buildDiagnosticReport(context: DiagnosticReportContext): string {
  return JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      applicationVersion: APPLICATION_VERSION,
      architectureSchemaVersion: ARCHITECTURE_SCHEMA_VERSION,
      browser:
        typeof navigator === 'undefined'
          ? 'unavailable'
          : `${navigator.userAgent} (${navigator.language})`,
      simulation: {
        seed: context.simulationSeed,
        state: context.simulationState,
        runtimeMode: context.runtimeMode,
      },
      graphShape: { nodes: context.nodeCount, edges: context.edgeCount },
      performance: getRuntimePerformanceSnapshot(),
      lastErrorCategory: context.lastErrorCategory || null,
      privacy:
        'Architecture names, configuration values, scenario notes, traces, and URL hashes are intentionally excluded.',
    },
    null,
    2,
  );
}
