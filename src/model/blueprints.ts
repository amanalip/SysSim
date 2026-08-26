import { CanvasNode, CanvasEdge } from '../store/use-store';
import { createDefaultConfig } from './component-defaults';

export interface ArchitectureBlueprint {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  create: (baseX: number, baseY: number) => { nodes: CanvasNode[]; edges: CanvasEdge[] };
}

export const ARCHITECTURE_BLUEPRINTS: ArchitectureBlueprint[] = [
  {
    id: 'scalable_microservice',
    name: 'Scalable Microservice Tier',
    category: 'Compute & Caching',
    description: 'Layer 7 Load Balancer + 3 App Server Replicas + Redis Cache',
    icon: 'Server',
    create: (baseX, baseY) => {
      const ts = Date.now();
      const lbId = `lb_${ts}`;
      const app1Id = `app1_${ts}`;
      const app2Id = `app2_${ts}`;
      const cacheId = `cache_${ts}`;

      const nodes: CanvasNode[] = [
        {
          id: lbId,
          type: 'customComponent',
          position: { x: baseX, y: baseY + 80 },
          data: { config: createDefaultConfig('load_balancer', lbId, 'API Gateway LB') },
        },
        {
          id: app1Id,
          type: 'customComponent',
          position: { x: baseX + 240, y: baseY },
          data: { config: createDefaultConfig('app_server', app1Id, 'App Server Alpha') },
        },
        {
          id: app2Id,
          type: 'customComponent',
          position: { x: baseX + 240, y: baseY + 160 },
          data: { config: createDefaultConfig('app_server', app2Id, 'App Server Beta') },
        },
        {
          id: cacheId,
          type: 'customComponent',
          position: { x: baseX + 480, y: baseY + 80 },
          data: { config: createDefaultConfig('redis_cache', cacheId, 'Shared Redis') },
        },
      ];

      const edges: CanvasEdge[] = [
        {
          id: `e_${lbId}_${app1Id}`,
          source: lbId,
          target: app1Id,
          data: { protocol: 'HTTP', isCut: false, latencyMs: 2 },
        },
        {
          id: `e_${lbId}_${app2Id}`,
          source: lbId,
          target: app2Id,
          data: { protocol: 'HTTP', isCut: false, latencyMs: 2 },
        },
        {
          id: `e_${app1Id}_${cacheId}`,
          source: app1Id,
          target: cacheId,
          data: { protocol: 'gRPC', isCut: false, latencyMs: 1 },
        },
        {
          id: `e_${app2Id}_${cacheId}`,
          source: app2Id,
          target: cacheId,
          data: { protocol: 'gRPC', isCut: false, latencyMs: 1 },
        },
      ];

      return { nodes, edges };
    },
  },
  {
    id: 'ha_database_cluster',
    name: 'HA Database Cluster',
    category: 'Storage',
    description: 'Primary SQL DB + 2 Read Replicas with replication links',
    icon: 'Database',
    create: (baseX, baseY) => {
      const ts = Date.now();
      const primaryId = `db_primary_${ts}`;
      const replica1Id = `db_rep1_${ts}`;
      const replica2Id = `db_rep2_${ts}`;

      const primaryConfig = createDefaultConfig('sql_db', primaryId, 'Primary SQL (Write)');
      const rep1Config = createDefaultConfig('sql_db', replica1Id, 'Read Replica 1');
      const rep2Config = createDefaultConfig('sql_db', replica2Id, 'Read Replica 2');

      const nodes: CanvasNode[] = [
        {
          id: primaryId,
          type: 'customComponent',
          position: { x: baseX, y: baseY + 80 },
          data: { config: primaryConfig },
        },
        {
          id: replica1Id,
          type: 'customComponent',
          position: { x: baseX + 260, y: baseY },
          data: { config: rep1Config },
        },
        {
          id: replica2Id,
          type: 'customComponent',
          position: { x: baseX + 260, y: baseY + 160 },
          data: { config: rep2Config },
        },
      ];

      const edges: CanvasEdge[] = [
        {
          id: `e_${primaryId}_${replica1Id}`,
          source: primaryId,
          target: replica1Id,
          data: { protocol: 'TCP', isCut: false, latencyMs: 5 },
        },
        {
          id: `e_${primaryId}_${replica2Id}`,
          source: primaryId,
          target: replica2Id,
          data: { protocol: 'TCP', isCut: false, latencyMs: 5 },
        },
      ];

      return { nodes, edges };
    },
  },
  {
    id: 'event_driven_pipeline',
    name: 'Event-Driven Async Pipeline',
    category: 'Messaging',
    description: 'API Gateway + Message Queue + 2 Background Workers + NoSQL Sink',
    icon: 'Radio',
    create: (baseX, baseY) => {
      const ts = Date.now();
      const gwId = `gw_${ts}`;
      const queueId = `q_${ts}`;
      const w1Id = `w1_${ts}`;
      const w2Id = `w2_${ts}`;
      const sinkId = `sink_${ts}`;

      const nodes: CanvasNode[] = [
        {
          id: gwId,
          type: 'customComponent',
          position: { x: baseX, y: baseY + 80 },
          data: { config: createDefaultConfig('api_gateway', gwId, 'Ingress Gateway') },
        },
        {
          id: queueId,
          type: 'customComponent',
          position: { x: baseX + 220, y: baseY + 80 },
          data: { config: createDefaultConfig('message_queue', queueId, 'Kafka Topic') },
        },
        {
          id: w1Id,
          type: 'customComponent',
          position: { x: baseX + 440, y: baseY },
          data: { config: createDefaultConfig('worker', w1Id, 'Worker Alpha') },
        },
        {
          id: w2Id,
          type: 'customComponent',
          position: { x: baseX + 440, y: baseY + 160 },
          data: { config: createDefaultConfig('worker', w2Id, 'Worker Beta') },
        },
        {
          id: sinkId,
          type: 'customComponent',
          position: { x: baseX + 660, y: baseY + 80 },
          data: { config: createDefaultConfig('nosql_db', sinkId, 'Analytics NoSQL Sink') },
        },
      ];

      const edges: CanvasEdge[] = [
        {
          id: `e_${gwId}_${queueId}`,
          source: gwId,
          target: queueId,
          data: { protocol: 'gRPC', isCut: false, latencyMs: 2 },
        },
        {
          id: `e_${queueId}_${w1Id}`,
          source: queueId,
          target: w1Id,
          data: { protocol: 'TCP', isCut: false, latencyMs: 1 },
        },
        {
          id: `e_${queueId}_${w2Id}`,
          source: queueId,
          target: w2Id,
          data: { protocol: 'TCP', isCut: false, latencyMs: 1 },
        },
        {
          id: `e_${w1Id}_${sinkId}`,
          source: w1Id,
          target: sinkId,
          data: { protocol: 'gRPC', isCut: false, latencyMs: 3 },
        },
        {
          id: `e_${w2Id}_${sinkId}`,
          source: w2Id,
          target: sinkId,
          data: { protocol: 'gRPC', isCut: false, latencyMs: 3 },
        },
      ];

      return { nodes, edges };
    },
  },
];
