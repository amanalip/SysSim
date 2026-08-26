import { describe, it, expect } from 'vitest';
import { SysSimEngine } from '../engine/simulator';
import { computeAutoLayout } from '../layout/auto-layout';
import { CanvasNode, CanvasEdge, ZoneData } from '../store/use-store';
import { createDefaultConfig } from '../model/component-defaults';

describe('Bugs Batch 12: Simulator Cold Reset Metrics & Auto Layout Zone Boundary Containment', () => {
  it('Bug 29: Simulator cold reset snapshot produces clean numeric averages without NaN', () => {
    const engine = new SysSimEngine();
    const metrics = engine.getMetricsSnapshot();

    expect(isNaN(metrics.avgEndToEndLatencyMs)).toBe(false);
    expect(metrics.avgEndToEndLatencyMs).toBe(0);
    expect(isNaN(metrics.overallErrorRatePercent)).toBe(false);
    expect(metrics.overallErrorRatePercent).toBe(0);
    expect(isNaN(metrics.overallCacheHitRatioPercent)).toBe(false);
    expect(metrics.overallCacheHitRatioPercent).toBe(0);
  });

  it('Bug 30: Auto layout maintains spatial zone containment for contained nodes', () => {
    const zone: ZoneData = {
      id: 'dmz_zone',
      label: 'DMZ Security Zone',
      category: 'public',
      color: '#3b82f6',
      x: 50,
      y: 50,
      width: 400,
      height: 300,
    };

    const nodeInside: CanvasNode = {
      id: 'gw_1',
      type: 'customComponent',
      position: { x: 100, y: 100 },
      data: { config: createDefaultConfig('api_gateway', 'gw_1', 'Gateway') },
    };

    const nodes: CanvasNode[] = [nodeInside];
    const edges: CanvasEdge[] = [];

    const arranged = computeAutoLayout(nodes, edges, [zone]);
    const arrangedNode = arranged.find((n) => n.id === 'gw_1');

    expect(arrangedNode).toBeDefined();
    // Verify node remains inside zone bounds
    expect(arrangedNode!.position.x).toBeGreaterThanOrEqual(zone.x);
    expect(arrangedNode!.position.x).toBeLessThanOrEqual(zone.x + zone.width);
    expect(arrangedNode!.position.y).toBeGreaterThanOrEqual(zone.y);
    expect(arrangedNode!.position.y).toBeLessThanOrEqual(zone.y + zone.height);
  });
});
