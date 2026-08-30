import { describe, expect, it } from 'vitest';
import { estimateArchitectureCost, ILLUSTRATIVE_PRICE_TABLE, ILLUSTRATIVE_PRICING_CONTEXT } from '../analysis/cost-estimator';
import { createDefaultConfig } from '../model/component-defaults';
import { COMPONENT_METADATA_LIST } from '../model/component-defaults';

const node = (id: string, type: Parameters<typeof createDefaultConfig>[0], patch: Record<string, unknown> = {}) => ({ id, data: { config: { ...createDefaultConfig(type, id, id), ...patch } as ReturnType<typeof createDefaultConfig> } });

describe('transparent cost estimation tasks 298-306', () => {
  it('publishes an explicitly illustrative dated regional pricing context', () => {
    expect(ILLUSTRATIVE_PRICING_CONTEXT.source).toMatch(/illustrative.*not live/i);
    expect(ILLUSTRATIVE_PRICING_CONTEXT.effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(ILLUSTRATIVE_PRICING_CONTEXT.region).toBeTruthy();
  });

  it('maps provider profiles deterministically outside React', () => {
    const nodes = [node('app', 'app_server'), node('db', 'sql_db', { replicas: 1, readReplicasCount: 2 })];
    const aws = estimateArchitectureCost(nodes, 1_000, 'aws', false);
    const gcp = estimateArchitectureCost(nodes, 1_000, 'gcp', false);
    expect(aws.lineItems.find((item) => item.id === 'app')?.instanceType).toBe(ILLUSTRATIVE_PRICE_TABLE.app_server?.profiles.aws);
    expect(gcp.lineItems.find((item) => item.id === 'app')?.instanceType).toBe(ILLUSTRATIVE_PRICE_TABLE.app_server?.profiles.gcp);
    expect(aws.lineItems.find((item) => item.id === 'db')?.replicas).toBe(3);
  });

  it.each(COMPONENT_METADATA_LIST.map(({ type }) => [type]))('maps %s for every provider with a rationale', (type) => {
    const mapped = ILLUSTRATIVE_PRICE_TABLE[type];
    expect(mapped).toBeDefined();
    expect(mapped.mappingRationale).toBeTruthy();
    expect(mapped.profiles.aws).toBeTruthy();
    expect(mapped.profiles.gcp).toBeTruthy();
    expect(mapped.profiles.azure).toBeTruthy();
  });

  it('applies spot discounts only to eligible compute profiles', () => {
    const nodes = [node('app', 'app_server'), node('db', 'sql_db')];
    const regular = estimateArchitectureCost(nodes, 0, 'aws', false);
    const spot = estimateArchitectureCost(nodes, 0, 'aws', true);
    expect(spot.lineItems.find((item) => item.id === 'app')?.unitMonthlyCost).toBeLessThan(regular.lineItems.find((item) => item.id === 'app')?.unitMonthlyCost || 0);
    expect(spot.lineItems.find((item) => item.id === 'db')?.unitMonthlyCost).toBe(regular.lineItems.find((item) => item.id === 'db')?.unitMonthlyCost);
  });

  it('reports managed service, redundancy, storage, request, and bandwidth costs separately', () => {
    const estimate = estimateArchitectureCost([
      node('app', 'app_server', { replicas: 2 }),
      node('db', 'sql_db', { replicas: 1, readReplicasCount: 1 }),
      node('api', 'api_gateway'),
    ], 1_000, 'aws', false);
    expect(estimate.managedServiceCost).toBeGreaterThan(0);
    expect(estimate.redundancyCost).toBeGreaterThan(0);
    expect(estimate.capacityStorageCost).toBeGreaterThan(0);
    expect(estimate.requestCost).toBeGreaterThan(0);
    expect(estimate.bandwidthCost).toBeGreaterThan(0);
    expect(estimate.totalMonthly).toBe(
      Math.round(estimate.managedServiceCost + estimate.redundancyCost + estimate.capacityStorageCost + estimate.requestCost + estimate.bandwidthCost),
    );
  });

  it('keeps currency fixed to the dated pricing context instead of inventing exchange rates', () => {
    expect(ILLUSTRATIVE_PRICING_CONTEXT.currency).toBe('USD');
    expect(Object.keys(ILLUSTRATIVE_PRICING_CONTEXT)).not.toContain('exchangeRate');
  });
});
