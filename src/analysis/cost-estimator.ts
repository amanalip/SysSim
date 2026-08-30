import { AnyComponentConfig, ComponentType } from '../model/types';

export type CloudProvider = 'aws' | 'gcp' | 'azure';

export const ILLUSTRATIVE_PRICING_CONTEXT = {
  effectiveDate: '2026-08-01', region: 'US reference region', currency: 'USD',
  source: 'SysSim illustrative internal baseline; not live provider pricing', egressPerGb: 0.08,
} as const;

export interface PriceProfile {
  category: 'Compute' | 'Database' | 'Caching' | 'Networking' | 'Messaging' | 'Security' | 'Storage' | 'Client';
  monthlyUsd: number;
  includedStorageGb: number;
  storagePerGbMonthUsd: number;
  requestPerMillionUsd: number;
  profiles: Record<CloudProvider, string>;
  spotEligible: boolean;
  mappingRationale: string;
}

const common = (aws: string, gcp: string, azure: string): Record<CloudProvider, string> => ({ aws, gcp, azure });
const profile = (
  category: PriceProfile['category'], monthlyUsd: number, aws: string, gcp: string, azure: string,
  mappingRationale: string, options: Partial<Pick<PriceProfile, 'includedStorageGb' | 'storagePerGbMonthUsd' | 'requestPerMillionUsd' | 'spotEligible'>> = {},
): PriceProfile => ({
  category, monthlyUsd, profiles: common(aws, gcp, azure), mappingRationale,
  includedStorageGb: options.includedStorageGb ?? 0,
  storagePerGbMonthUsd: options.storagePerGbMonthUsd ?? 0,
  requestPerMillionUsd: options.requestPerMillionUsd ?? 0,
  spotEligible: options.spotEligible ?? false,
});

/** Stable educational analogues, not provider equivalence or billing claims. */
export const ILLUSTRATIVE_PRICE_TABLE: Record<ComponentType, PriceProfile> = {
  client: profile('Client', 0, 'External client', 'External client', 'External client', 'Client devices are outside the modeled cloud bill.'),
  app_server: profile('Compute', 38, 'c6g.large', 'c2-standard-4', 'D4s_v5', 'General-purpose stateless compute instance.', { spotEligible: true }),
  worker: profile('Compute', 38, 'c6g.large', 'c2-standard-4', 'D4s_v5', 'General-purpose asynchronous compute instance.', { spotEligible: true }),
  serverless: profile('Compute', 0, 'Lambda workload unit', 'Cloud Functions workload unit', 'Functions workload unit', 'Request-priced managed function.', { requestPerMillionUsd: 0.2 }),
  load_balancer: profile('Networking', 25, 'Application Load Balancer unit', 'Cloud Load Balancing unit', 'Application Gateway unit', 'Managed Layer 7 load-balancing baseline.', { requestPerMillionUsd: 0.08 }),
  api_gateway: profile('Networking', 25, 'API Gateway workload unit', 'API Gateway workload unit', 'API Management workload unit', 'Managed API ingress and policy baseline.', { requestPerMillionUsd: 1 }),
  cdn: profile('Networking', 20, 'CloudFront distribution unit', 'Cloud CDN distribution unit', 'Front Door distribution unit', 'Managed edge-distribution baseline.', { requestPerMillionUsd: 0.1 }),
  dns: profile('Networking', 1, 'Route 53 hosted-zone unit', 'Cloud DNS zone unit', 'Azure DNS zone unit', 'Authoritative DNS zone and query baseline.', { requestPerMillionUsd: 0.4 }),
  firewall: profile('Security', 35, 'AWS WAF workload unit', 'Cloud Armor workload unit', 'Web Application Firewall unit', 'Managed web-application filtering baseline.', { requestPerMillionUsd: 0.6 }),
  reverse_proxy: profile('Networking', 38, 'c6g.large proxy', 'c2-standard-4 proxy', 'D4s_v5 proxy', 'Self-managed proxy on general-purpose compute.', { spotEligible: true }),
  sql_db: profile('Database', 145, 'db.r6g.xlarge', 'Cloud SQL 4 vCPU / 16 GB', 'E4s_v5 managed DB', 'Managed relational database compute plus allocated storage.', { includedStorageGb: 100, storagePerGbMonthUsd: 0.12 }),
  nosql_db: profile('Database', 95, 'DynamoDB provisioned tier', 'Firestore provisioned tier', 'Cosmos DB provisioned tier', 'Provisioned managed document/key-value baseline.', { includedStorageGb: 100, storagePerGbMonthUsd: 0.25, requestPerMillionUsd: 0.25 }),
  object_storage: profile('Storage', 0, 'S3 Standard', 'Cloud Storage Standard', 'Blob Storage Hot', 'Durable object storage capacity baseline.', { includedStorageGb: 1_000, storagePerGbMonthUsd: 0.023, requestPerMillionUsd: 0.05 }),
  search_index: profile('Database', 110, 'OpenSearch data node', 'Managed Elasticsearch node', 'AI Search service unit', 'Managed search-index node with attached storage.', { includedStorageGb: 100, storagePerGbMonthUsd: 0.12 }),
  graph_db: profile('Database', 160, 'Neptune instance unit', 'Graph database VM unit', 'Cosmos DB graph unit', 'Managed or hosted graph-database compute baseline.', { includedStorageGb: 100, storagePerGbMonthUsd: 0.2 }),
  timeseries_db: profile('Database', 120, 'Timestream workload unit', 'Managed time-series workload unit', 'Data Explorer workload unit', 'Managed time-series ingestion and retention baseline.', { includedStorageGb: 100, storagePerGbMonthUsd: 0.15, requestPerMillionUsd: 0.3 }),
  redis_cache: profile('Caching', 55, 'cache.r6g.large', 'Memorystore standard small', 'Azure Cache Premium P1', 'Managed in-memory cache node.', { includedStorageGb: 13 }),
  local_cache: profile('Caching', 12, 'In-process memory allocation', 'In-process memory allocation', 'In-process memory allocation', 'Incremental host memory allocation for a process-local cache.'),
  cdn_cache: profile('Caching', 20, 'CloudFront cache unit', 'Cloud CDN cache unit', 'Front Door cache unit', 'Managed CDN cache behavior baseline.', { requestPerMillionUsd: 0.1 }),
  browser_cache: profile('Client', 0, 'Browser-managed cache', 'Browser-managed cache', 'Browser-managed cache', 'Browser storage is outside the modeled cloud bill.'),
  message_queue: profile('Messaging', 42, 'Managed broker unit', 'Pub/Sub workload unit', 'Service Bus workload unit', 'Managed durable broker baseline.', { includedStorageGb: 20, storagePerGbMonthUsd: 0.1, requestPerMillionUsd: 0.4 }),
  pubsub: profile('Messaging', 20, 'SNS workload unit', 'Pub/Sub workload unit', 'Service Bus topic unit', 'Managed fan-out topic baseline.', { requestPerMillionUsd: 0.4 }),
  event_bus: profile('Messaging', 20, 'EventBridge workload unit', 'Eventarc workload unit', 'Event Grid workload unit', 'Managed event-routing baseline.', { requestPerMillionUsd: 1 }),
  task_queue: profile('Messaging', 30, 'SQS workload unit', 'Cloud Tasks workload unit', 'Storage Queue workload unit', 'Managed task queue baseline.', { requestPerMillionUsd: 0.4 }),
  rate_limiter: profile('Security', 18, 'Gateway policy unit', 'Gateway policy unit', 'API Management policy unit', 'Managed or hosted request-policy enforcement baseline.', { requestPerMillionUsd: 0.1 }),
  auth_service: profile('Security', 35, 'Cognito workload unit', 'Identity Platform workload unit', 'Entra External ID workload unit', 'Managed identity request baseline.', { requestPerMillionUsd: 2.5 }),
  encryption_service: profile('Security', 15, 'KMS key workload unit', 'Cloud KMS workload unit', 'Key Vault workload unit', 'Managed key-operation baseline.', { requestPerMillionUsd: 1 }),
};

export interface CostLineItem {
  id: string; nodeName: string; category: PriceProfile['category']; instanceType: string; replicas: number;
  unitMonthlyCost: number; totalMonthlyCost: number; managedServiceCost: number; redundancyCost: number;
  storageCost: number; requestCost: number; spotEligible: boolean; mappingRationale: string;
}

export interface ArchitectureCostEstimate {
  totalMonthly: number; computeCost: number; storageCost: number; cachingCost: number; networkingCost: number;
  messagingCost: number; otherCost: number; managedServiceCost: number; redundancyCost: number;
  capacityStorageCost: number; requestCost: number; bandwidthCost: number; estimatedMonthlyGb: number;
  estimatedMonthlyRequestsMillions: number; lineItems: CostLineItem[];
}

export function replicasForConfig(config: AnyComponentConfig): number {
  if (config.type === 'sql_db') return Math.max(1, config.replicas) + Math.max(0, config.readReplicasCount);
  return 'replicas' in config ? Math.max(1, Number(config.replicas)) : 1;
}

export function estimateArchitectureCost(
  nodes: Array<{ id: string; data: { config: AnyComponentConfig } }>, workloadQps: number,
  provider: CloudProvider, useSpotInstances: boolean, responsePayloadKb = 2,
): ArchitectureCostEstimate {
  const categoryTotals = { Compute: 0, Database: 0, Caching: 0, Networking: 0, Messaging: 0, Security: 0, Storage: 0, Client: 0 };
  const safeQps = Number.isFinite(workloadQps) ? Math.max(0, workloadQps) : 0;
  const safePayload = Number.isFinite(responsePayloadKb) ? Math.max(0, responsePayloadKb) : 0;
  const monthlyRequestsMillions = safeQps * 86_400 * 30 / 1_000_000;
  const lineItems = nodes.filter((node) => !['client', 'browser_cache'].includes(node.data.config.type)).map((node): CostLineItem => {
    const config = node.data.config;
    const mapped = ILLUSTRATIVE_PRICE_TABLE[config.type];
    const replicas = replicasForConfig(config);
    const discount = useSpotInstances && mapped.spotEligible ? 0.4 : 1;
    const unitMonthlyCost = mapped.monthlyUsd * discount;
    const managedServiceCost = unitMonthlyCost;
    const redundancyCost = unitMonthlyCost * Math.max(0, replicas - 1);
    const storageCost = mapped.includedStorageGb * mapped.storagePerGbMonthUsd * replicas;
    const requestCost = mapped.requestPerMillionUsd * monthlyRequestsMillions;
    const totalMonthlyCost = managedServiceCost + redundancyCost + storageCost + requestCost;
    categoryTotals[mapped.category] += totalMonthlyCost;
    return {
      id: node.id, nodeName: config.name, category: mapped.category, instanceType: mapped.profiles[provider],
      replicas, spotEligible: mapped.spotEligible, unitMonthlyCost: Math.round(unitMonthlyCost),
      totalMonthlyCost: Math.round(totalMonthlyCost), managedServiceCost: Math.round(managedServiceCost),
      redundancyCost: Math.round(redundancyCost), storageCost: Math.round(storageCost),
      requestCost: Math.round(requestCost), mappingRationale: mapped.mappingRationale,
    };
  });
  const estimatedMonthlyGb = safeQps * safePayload * 86_400 * 30 / 1_000_000;
  const bandwidthCost = estimatedMonthlyGb * ILLUSTRATIVE_PRICING_CONTEXT.egressPerGb;
  categoryTotals.Networking += bandwidthCost;
  const managedServiceCost = lineItems.reduce((sum, item) => sum + item.managedServiceCost, 0);
  const redundancyCost = lineItems.reduce((sum, item) => sum + item.redundancyCost, 0);
  const capacityStorageCost = lineItems.reduce((sum, item) => sum + item.storageCost, 0);
  const requestCost = lineItems.reduce((sum, item) => sum + item.requestCost, 0);
  return {
    totalMonthly: Math.round(managedServiceCost + redundancyCost + capacityStorageCost + requestCost + bandwidthCost),
    computeCost: Math.round(categoryTotals.Compute), storageCost: Math.round(categoryTotals.Database + categoryTotals.Storage),
    cachingCost: Math.round(categoryTotals.Caching), networkingCost: Math.round(categoryTotals.Networking),
    messagingCost: Math.round(categoryTotals.Messaging), otherCost: Math.round(categoryTotals.Security),
    managedServiceCost, redundancyCost, capacityStorageCost, requestCost, bandwidthCost: Math.round(bandwidthCost),
    estimatedMonthlyGb: Math.round(estimatedMonthlyGb), estimatedMonthlyRequestsMillions: Math.round(monthlyRequestsMillions), lineItems,
  };
}
