import { describe, expect, it } from 'vitest';
import { estimateArchitectureCost, ILLUSTRATIVE_PRICE_TABLE, ILLUSTRATIVE_PRICING_CONTEXT } from '../analysis/cost-estimator';
import { createDefaultConfig } from '../model/component-defaults';

const node = (id: string, type: Parameters<typeof createDefaultConfig>[0], patch: Record<string, unknown> = {}) => ({ id, data: { config: { ...createDefaultConfig(type, id, id), ...patch } as ReturnType<typeof createDefaultConfig> } });

describe('transparent cost estimation tasks 298-300', () => {
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

  it('applies spot discounts only to eligible compute profiles', () => {
    const nodes = [node('app', 'app_server'), node('db', 'sql_db')];
    const regular = estimateArchitectureCost(nodes, 0, 'aws', false);
    const spot = estimateArchitectureCost(nodes, 0, 'aws', true);
    expect(spot.lineItems.find((item) => item.id === 'app')?.unitMonthlyCost).toBeLessThan(regular.lineItems.find((item) => item.id === 'app')?.unitMonthlyCost || 0);
    expect(spot.lineItems.find((item) => item.id === 'db')?.unitMonthlyCost).toBe(regular.lineItems.find((item) => item.id === 'db')?.unitMonthlyCost);
  });
});
