import { AnyComponentConfig } from '../model/types';

export type CloudProvider = 'aws' | 'gcp' | 'azure';

export const ILLUSTRATIVE_PRICING_CONTEXT = {
  effectiveDate: '2026-08-01',
  region: 'US reference region',
  currency: 'USD',
  source: 'SysSim illustrative internal baseline; not live provider pricing',
  egressPerGb: 0.08,
} as const;

interface PriceProfile {
  category: 'Compute' | 'Storage' | 'Caching' | 'Networking' | 'Messaging' | 'Other';
  monthlyUsd: number;
  profiles: Record<CloudProvider, string>;
  spotEligible: boolean;
}

const common = (aws: string, gcp: string, azure: string): Record<CloudProvider, string> => ({ aws, gcp, azure });

export const ILLUSTRATIVE_PRICE_TABLE: Partial<Record<AnyComponentConfig['type'], PriceProfile>> = {
  app_server: { category: 'Compute', monthlyUsd: 38, profiles: common('c6g.large', 'c2-standard-4', 'D4s_v5'), spotEligible: true },
  worker: { category: 'Compute', monthlyUsd: 38, profiles: common('c6g.large', 'c2-standard-4', 'D4s_v5'), spotEligible: true },
  serverless: { category: 'Compute', monthlyUsd: 18, profiles: common('Lambda workload unit', 'Cloud Functions workload unit', 'Functions workload unit'), spotEligible: false },
  sql_db: { category: 'Storage', monthlyUsd: 145, profiles: common('db.r6g.xlarge', 'Cloud SQL 4 vCPU / 16 GB', 'E4s_v5 managed DB'), spotEligible: false },
  nosql_db: { category: 'Storage', monthlyUsd: 95, profiles: common('DynamoDB provisioned tier', 'Firestore provisioned tier', 'Cosmos DB provisioned tier'), spotEligible: false },
  redis_cache: { category: 'Caching', monthlyUsd: 55, profiles: common('cache.r6g.large', 'Redis standard small', 'Premium P1'), spotEligible: false },
  local_cache: { category: 'Caching', monthlyUsd: 12, profiles: common('in-process memory allocation', 'in-process memory allocation', 'in-process memory allocation'), spotEligible: false },
  load_balancer: { category: 'Networking', monthlyUsd: 25, profiles: common('Application Load Balancer unit', 'Cloud Load Balancing unit', 'Application Gateway unit'), spotEligible: false },
  api_gateway: { category: 'Networking', monthlyUsd: 25, profiles: common('API Gateway workload unit', 'API Gateway workload unit', 'API Management workload unit'), spotEligible: false },
  cdn_cache: { category: 'Networking', monthlyUsd: 20, profiles: common('CloudFront distribution unit', 'Cloud CDN distribution unit', 'Front Door distribution unit'), spotEligible: false },
  message_queue: { category: 'Messaging', monthlyUsd: 42, profiles: common('Managed broker unit', 'Pub/Sub workload unit', 'Service Bus workload unit'), spotEligible: false },
  pubsub: { category: 'Messaging', monthlyUsd: 42, profiles: common('SNS workload unit', 'Pub/Sub workload unit', 'Service Bus topic unit'), spotEligible: false },
  event_bus: { category: 'Messaging', monthlyUsd: 42, profiles: common('EventBridge workload unit', 'Eventarc workload unit', 'Event Grid workload unit'), spotEligible: false },
};

const DEFAULT_PROFILE: PriceProfile = {
  category: 'Other', monthlyUsd: 15,
  profiles: common('Standard illustrative unit', 'Standard illustrative unit', 'Standard illustrative unit'),
  spotEligible: false,
};

export interface CostLineItem {
  id: string;
  nodeName: string;
  category: PriceProfile['category'];
  instanceType: string;
  replicas: number;
  unitMonthlyCost: number;
  totalMonthlyCost: number;
  spotEligible: boolean;
}

export interface ArchitectureCostEstimate {
  totalMonthly: number;
  computeCost: number;
  storageCost: number;
  cachingCost: number;
  networkingCost: number;
  messagingCost: number;
  otherCost: number;
  bandwidthCost: number;
  estimatedMonthlyGb: number;
  lineItems: CostLineItem[];
}

export function estimateArchitectureCost(
  nodes: Array<{ id: string; data: { config: AnyComponentConfig } }>,
  workloadQps: number,
  provider: CloudProvider,
  useSpotInstances: boolean,
  responsePayloadKb = 2,
): ArchitectureCostEstimate {
  const totals = { Compute: 0, Storage: 0, Caching: 0, Networking: 0, Messaging: 0, Other: 0 };
  const lineItems = nodes.filter((node) => node.data.config.type !== 'client').map((node): CostLineItem => {
    const config = node.data.config;
    const profile = ILLUSTRATIVE_PRICE_TABLE[config.type] || DEFAULT_PROFILE;
    const replicas = config.type === 'sql_db'
      ? Math.max(1, config.replicas) + Math.max(0, config.readReplicasCount)
      : 'replicas' in config ? Math.max(1, Number(config.replicas)) : 1;
    const discount = useSpotInstances && profile.spotEligible ? 0.4 : 1;
    const unitMonthlyCost = profile.monthlyUsd * discount;
    const totalMonthlyCost = unitMonthlyCost * replicas;
    totals[profile.category] += totalMonthlyCost;
    return {
      id: node.id, nodeName: config.name, category: profile.category,
      instanceType: profile.profiles[provider], replicas, spotEligible: profile.spotEligible,
      unitMonthlyCost: Math.round(unitMonthlyCost), totalMonthlyCost: Math.round(totalMonthlyCost),
    };
  });
  const safeQps = Number.isFinite(workloadQps) ? Math.max(0, workloadQps) : 0;
  const safePayload = Number.isFinite(responsePayloadKb) ? Math.max(0, responsePayloadKb) : 0;
  const estimatedMonthlyGb = safeQps * safePayload * 86_400 * 30 / 1_000_000;
  const bandwidthCost = estimatedMonthlyGb * ILLUSTRATIVE_PRICING_CONTEXT.egressPerGb;
  totals.Networking += bandwidthCost;
  return {
    totalMonthly: Math.round(Object.values(totals).reduce((sum, value) => sum + value, 0)),
    computeCost: Math.round(totals.Compute), storageCost: Math.round(totals.Storage),
    cachingCost: Math.round(totals.Caching), networkingCost: Math.round(totals.Networking),
    messagingCost: Math.round(totals.Messaging), otherCost: Math.round(totals.Other),
    bandwidthCost: Math.round(bandwidthCost), estimatedMonthlyGb: Math.round(estimatedMonthlyGb), lineItems,
  };
}
