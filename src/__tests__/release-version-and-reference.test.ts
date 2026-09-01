import { describe, expect, it } from 'vitest';
import { buildDiagnosticReport } from '../diagnostics/diagnostic-report';
import { compareSimulationEngineVersions } from '../engine/version-compatibility';
import { runSinglePathReference, SINGLE_PATH_REFERENCE } from '../engine/reference-systems';
import { SIMULATION_ENGINE_VERSION } from '../platform/build-info';
import { serializeCanvasState } from '../utils/sharing';

describe('release versioning and analytical references tasks 670-675', () => {
  it('embeds application, schema, engine, commit, and timestamp diagnostics', () => {
    const report = JSON.parse(
      buildDiagnosticReport({
        simulationSeed: 1,
        simulationState: 'idle',
        runtimeMode: 'worker',
        nodeCount: 0,
        edgeCount: 0,
      }),
    );
    expect(report).toMatchObject({
      engineVersion: SIMULATION_ENGINE_VERSION,
      build: { commit: expect.any(String), builtAt: expect.any(String) },
    });
  });

  it('includes schema and engine versions in canonical architecture exports', () => {
    expect(serializeCanvasState()).toMatchObject({
      version: expect.any(Number),
      appVersion: expect.any(String),
      engineVersion: SIMULATION_ENGINE_VERSION,
    });
  });

  it('accepts exact versions, warns for minor differences, and rejects major differences', () => {
    expect(compareSimulationEngineVersions('1.0.0', '1.0.0').status).toBe('compatible');
    expect(compareSimulationEngineVersions('1.0.0', '1.1.0').status).toBe('warning');
    expect(compareSimulationEngineVersions('1.0.0', '2.0.0').status).toBe('rejected');
    expect(compareSimulationEngineVersions(undefined, '1.0.0').status).toBe('warning');
  });

  it('matches the hand-calculated two-node latency reference', () => {
    expect(runSinglePathReference()).toBeCloseTo(
      SINGLE_PATH_REFERENCE.expectedEndToEndLatencyMs,
      8,
    );
  });
});
