import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store/use-store';
import { detectBottlenecks } from '../engine/metrics/bottleneck-detector';

describe('Deep Audit Pass 5 Bug Fixes & Feature Tests (10+ Verifications)', () => {
  beforeEach(() => {
    useStore.getState().clearCanvas();
    useStore.getState().resetSimulation();
  });

  it('1. verifies setTrafficConfig updates baseQps and pattern in state store', () => {
    useStore.getState().setTrafficConfig({ baseQps: 2500, pattern: 'bursty' });
    const config = useStore.getState().trafficConfig;
    expect(config.baseQps).toBe(2500);
    expect(config.pattern).toBe('bursty');
  });

  it('2. verifies setTrafficConfig preserves other parameters when updating partially', () => {
    const originalBurst = useStore.getState().trafficConfig.burstMultiplier;
    useStore.getState().setTrafficConfig({ pattern: 'spike' });

    expect(useStore.getState().trafficConfig.pattern).toBe('spike');
    expect(useStore.getState().trafficConfig.burstMultiplier).toBe(originalBurst);
  });

  it('3. verifies addZone initializes zone with designated bounding box and category color', () => {
    useStore.getState().addZone('Private VPC', 'private', {
      x: 100,
      y: 150,
      width: 500,
      height: 400,
    });

    const zones = useStore.getState().zones;
    expect(zones.length).toBe(1);
    expect(zones[0].label).toBe('Private VPC');
    expect(zones[0].category).toBe('private');
    expect(zones[0].width).toBe(500);
    expect(zones[0].height).toBe(400);
  });

  it('4. verifies removeZone deletes target zone by ID', () => {
    useStore.getState().addZone('Zone A', 'public', { x: 0, y: 0, width: 200, height: 200 });
    const zoneId = useStore.getState().zones[0].id;
    expect(useStore.getState().zones.length).toBe(1);

    useStore.getState().removeZone(zoneId);
    expect(useStore.getState().zones.length).toBe(0);
  });

  it('5. verifies node health toggle between healthy and down', () => {
    const nodeId = useStore.getState().addNode('app_server', { x: 100, y: 100 });
    expect(useStore.getState().nodes[0].data.config.health).toBe('healthy');

    useStore.getState().setNodeHealthOverride(nodeId, 'down');
    expect(useStore.getState().nodes[0].data.config.health).toBe('down');

    useStore.getState().setNodeHealthOverride(nodeId, 'healthy');
    expect(useStore.getState().nodes[0].data.config.health).toBe('healthy');
  });

  it('6. verifies cache eviction policy update in node configuration', () => {
    const nodeId = useStore.getState().addNode('redis_cache', { x: 100, y: 100 });
    useStore.getState().updateNodeConfig(nodeId, { evictionPolicy: 'LFU' });

    const node = useStore.getState().nodes.find((n) => n.id === nodeId);
    expect((node?.data.config as any).evictionPolicy).toBe('LFU');
  });

  it('7. verifies SQL DB read replicas count configuration', () => {
    const nodeId = useStore.getState().addNode('sql_db', { x: 100, y: 100 });
    useStore.getState().updateNodeConfig(nodeId, { readReplicasCount: 5 });

    const node = useStore.getState().nodes.find((n) => n.id === nodeId);
    expect((node?.data.config as any).readReplicasCount).toBe(5);
  });

  it('8. verifies NoSQL consistency level configuration', () => {
    const nodeId = useStore.getState().addNode('nosql_db', { x: 100, y: 100 });
    useStore.getState().updateNodeConfig(nodeId, { consistencyLevel: 'strong' });

    const node = useStore.getState().nodes.find((n) => n.id === nodeId);
    expect((node?.data.config as any).consistencyLevel).toBe('strong');
  });

  it('9. verifies detectBottlenecks returns empty array for empty canvas', () => {
    const issues = detectBottlenecks([], []);
    expect(issues.length).toBe(0);
  });

  it('10. verifies redo restores previously undone actions', () => {
    expect(useStore.getState().nodes.length).toBe(0);

    useStore.getState().addNode('client', { x: 0, y: 0 });
    expect(useStore.getState().nodes.length).toBe(1);

    useStore.getState().undo();
    expect(useStore.getState().nodes.length).toBe(0);

    useStore.getState().redo();
    expect(useStore.getState().nodes.length).toBe(1);
  });
});
