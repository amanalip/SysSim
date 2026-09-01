import { APPLICATION_VERSION, ARCHITECTURE_SCHEMA_VERSION } from '../model/architecture-schema';
import { getRuntimePerformanceSnapshot } from './runtime-performance';
import { BUILD_INFO } from '../platform/build-info';
import { formatUtcDateForFilename } from '../platform/time';

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
      engineVersion: BUILD_INFO.engineVersion,
      build: { commit: BUILD_INFO.commit, builtAt: BUILD_INFO.builtAt },
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

export function downloadDiagnosticReport(context: DiagnosticReportContext): void {
  const blob = new Blob([buildDiagnosticReport(context)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `syssim-diagnostics-${formatUtcDateForFilename(Date.now())}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
