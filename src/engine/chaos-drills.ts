import { AnyComponentConfig, NodeHealthStatus, ProtocolEdgeData, TrafficConfig } from '../model/types';
import { CanvasEdge, useStore } from '../store/use-store';
import { getEdgePurpose } from '../model/edge-semantics';
import { simBridge } from './sim-bridge';

export type ChaosDrillId = 'db_outage' | 'cache_stampede' | 'flash_crowd' | 'ingress_partition' | 'network_latency';

export interface ChaosDrillRecord {
  id: ChaosDrillId;
  startedAt: number;
  affectedTargets: string[];
  injectedParameters: Record<string, string | number | boolean>;
  observedResult: string;
  succeeded: boolean;
}

interface RestorePoint {
  record: ChaosDrillRecord;
  health: Record<string, NodeHealthStatus>;
  configs: Record<string, AnyComponentConfig>;
  edges: Record<string, ProtocolEdgeData>;
  traffic?: TrafficConfig;
}

const cacheTypes = new Set(['redis_cache', 'local_cache', 'cdn_cache', 'browser_cache', 'cdn']);

export class ChaosDrillManager {
  private active = new Map<ChaosDrillId, RestorePoint>();
  private history: ChaosDrillRecord[] = [];

  public getActiveRecords(): ChaosDrillRecord[] { return [...this.active.values()].map((item) => item.record); }
  public getHistory(): ChaosDrillRecord[] { return [...this.history]; }

  public launch(id: ChaosDrillId, options: { stampedeProtection?: boolean } = {}): ChaosDrillRecord {
    if (this.active.size > 0) return this.failure(id, 'Restore the active drill before starting another; overlapping restoration is intentionally blocked.');
    const state = useStore.getState();
    const startedAt = Date.now();
    const health: RestorePoint['health'] = {};
    const configs: RestorePoint['configs'] = {};
    const edgeState: RestorePoint['edges'] = {};
    let affectedTargets: string[] = [];
    let injectedParameters: ChaosDrillRecord['injectedParameters'] = {};
    let observedResult = '';
    let traffic: TrafficConfig | undefined;

    if (id === 'db_outage') {
      const databases = state.nodes.filter((node) => node.data.config.type === 'sql_db' || node.data.config.type === 'nosql_db');
      const primary = databases[0];
      if (!primary) return this.failure(id, 'No database exists, so no failover target can be exercised.');
      const internalFailover = primary.data.config.type === 'sql_db' && primary.data.config.automaticFailover &&
        (primary.data.config.readReplicasCount > 0 || primary.data.config.replicas > 1);
      const alternate = databases.slice(1).find((candidate) => state.edges.some((edge) =>
        edge.target === candidate.id && state.edges.some((peer) => peer.source === edge.source && peer.target === primary.id)));
      if (!internalFailover && !alternate) return this.failure(id, 'Primary database has no configured replica or separately connected failover target.');
      health[primary.id] = primary.data.config.health;
      state.setNodeHealthOverride(primary.id, internalFailover ? 'degraded' : 'down', 'chaos');
      affectedTargets = [primary.id, ...(alternate ? [alternate.id] : [])];
      injectedParameters = { failureMode: internalFailover ? 'internal_replica_failover' : 'topology_failover' };
      observedResult = internalFailover ? 'Primary degraded and SQL automatic failover path activated.' : `Primary down; traffic can continue through ${alternate!.data.config.name}.`;
    } else if (id === 'cache_stampede') {
      const caches = state.nodes.filter((node) => cacheTypes.has(node.data.config.type));
      if (!caches.length) return this.failure(id, 'No cache exists to flush or bypass.');
      const updates: Record<string, Partial<AnyComponentConfig>> = {};
      for (const cache of caches) {
        configs[cache.id] = structuredClone(cache.data.config);
        const partial: Record<string, unknown> = { hitRatioPercent: 0 };
        if ('requestCoalescingEnabled' in cache.data.config) partial.requestCoalescingEnabled = Boolean(options.stampedeProtection);
        updates[cache.id] = partial as Partial<AnyComponentConfig>;
      }
      state.updateNodeConfigs(updates);
      affectedTargets = caches.map((cache) => cache.id);
      injectedParameters = { cacheHitRatioPercent: 0, stampedeProtection: Boolean(options.stampedeProtection) };
      observedResult = options.stampedeProtection ? 'Caches bypassed; concurrent misses are coalesced before origin fill.' : 'Caches bypassed; every miss is forwarded to origin traffic.';
    } else if (id === 'flash_crowd') {
      traffic = structuredClone(state.trafficConfig);
      const baseQps = Math.max(0, state.trafficConfig.baseQps);
      const injectedQps = baseQps * 5;
      state.setTrafficConfig({ baseQps: injectedQps });
      simBridge.syncConfig({ baseQps: injectedQps });
      affectedTargets = ['traffic'];
      injectedParameters = { multiplier: 5, originalQps: baseQps, injectedQps, preservedPattern: state.trafficConfig.pattern };
      observedResult = `Offered base traffic changed once from ${baseQps} to ${injectedQps} QPS.`;
    } else if (id === 'ingress_partition') {
      const ingress = this.findIngressEdges(state.edges);
      const edge = ingress[0];
      if (!edge) return this.failure(id, 'No semantically valid request ingress edge exists.');
      edgeState[edge.id] = structuredClone(edge.data);
      state.setEdges((edges) => edges.map((candidate) => candidate.id === edge.id ? { ...candidate, data: { ...candidate.data, isCut: true } } : candidate));
      affectedTargets = [edge.id];
      injectedParameters = { isCut: true, purpose: getEdgePurpose(edge.data) };
      observedResult = `Request ingress edge ${edge.id} was partitioned.`;
    } else {
      const ingress = this.findIngressEdges(state.edges);
      const targets = ingress.length ? ingress : state.edges.filter((edge) => getEdgePurpose(edge.data) === 'request' && !edge.data?.isCut);
      if (!targets.length) return this.failure(id, 'No active request edge exists for latency injection.');
      for (const edge of targets) edgeState[edge.id] = structuredClone(edge.data);
      const ids = new Set(targets.map((edge) => edge.id));
      state.setEdges((edges) => edges.map((edge) => ids.has(edge.id)
        ? { ...edge, data: { ...edge.data, latencyMs: Math.max(0, edge.data?.latencyMs || 0) + 400 } }
        : edge));
      affectedTargets = [...ids];
      injectedParameters = { addedLatencyMs: 400 };
      observedResult = `Added 400ms to ${ids.size} active ingress request edge${ids.size === 1 ? '' : 's'}.`;
    }

    const record = { id, startedAt, affectedTargets, injectedParameters, observedResult, succeeded: true } satisfies ChaosDrillRecord;
    this.active.set(id, { record, health, configs, edges: edgeState, traffic });
    this.history.push(record);
    return record;
  }

  public restore(id: ChaosDrillId): boolean {
    const point = this.active.get(id);
    if (!point) return false;
    const state = useStore.getState();
    for (const [nodeId, health] of Object.entries(point.health)) state.setNodeHealthOverride(nodeId, health, 'manual');
    state.updateNodeConfigs(point.configs);
    if (Object.keys(point.edges).length) state.setEdges((edges) => edges.map((edge) => point.edges[edge.id] ? { ...edge, data: structuredClone(point.edges[edge.id]) } : edge));
    if (point.traffic) {
      state.setTrafficConfig(point.traffic);
      simBridge.syncConfig(point.traffic);
    }
    this.active.delete(id);
    return true;
  }

  public restoreAll(): void { for (const id of [...this.active.keys()]) this.restore(id); }
  public resetForTests(): void { this.active.clear(); this.history = []; }

  private failure(id: ChaosDrillId, observedResult: string): ChaosDrillRecord {
    const record = { id, startedAt: Date.now(), affectedTargets: [], injectedParameters: {}, observedResult, succeeded: false } satisfies ChaosDrillRecord;
    this.history.push(record);
    return record;
  }

  private findIngressEdges(edges: CanvasEdge[]): CanvasEdge[] {
    const nodes = useStore.getState().nodes;
    const ingressTypes = new Set(['client', 'dns', 'cdn', 'firewall', 'reverse_proxy', 'api_gateway', 'load_balancer']);
    return edges.filter((edge) => {
      const source = nodes.find((node) => node.id === edge.source);
      const target = nodes.find((node) => node.id === edge.target);
      return !edge.data?.isCut && getEdgePurpose(edge.data) === 'request' && Boolean(source && target) &&
        (source!.data.config.type === 'client' || ingressTypes.has(target!.data.config.type));
    });
  }
}

export const chaosDrills = new ChaosDrillManager();
