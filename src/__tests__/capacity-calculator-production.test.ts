import { describe, expect, it } from 'vitest';
import {
  buildCapacityAssumptionsJson,
  calculateCapacity,
  CAPACITY_UNIT_CONVENTION,
} from '../analysis/capacity-calculator';
import { CalculatorInputs } from '../model/types';

const golden: CalculatorInputs = {
  qps: 1_000,
  payloadSizeKb: 2,
  retentionDays: 1,
  readWriteRatio: 1,
  replicationFactor: 1,
  slaAvailabilityPercent: 99.9,
  serverCapacityQps: 500,
  readRequestPayloadKb: 0.5,
  readResponsePayloadKb: 2,
  writeResponsePayloadKb: 0.2,
  dbAverageServiceTimeMs: 20,
  dbTargetUtilizationPercent: 100,
  cacheWorkingSetDays: 1,
  cacheHotSetPercent: 20,
  cacheCompressionRatio: 1,
  serverTargetUtilizationPercent: 100,
  serverHeadroomPercent: 0,
  failoverCapacityPercent: 0,
  indexingOverheadPercent: 0,
  metadataOverheadPercent: 0,
  storageCompressionRatio: 1,
  annualGrowthPercent: 0,
};

describe('production capacity calculator tasks 285-297', () => {
  it('matches a hand-calculated decimal-SI golden reference', () => {
    const output = calculateCapacity(golden);
    expect(output).toMatchObject({
      readQps: 500,
      writeQps: 500,
      dailyNewDataGb: 86.4,
      totalStorageNeededTb: 0.09,
      totalReplicatedStorageTb: 0.09,
      inboundBandwidthMbps: 10,
      outboundBandwidthMbps: 8.8,
      estimatedServersNeeded: 2,
      recommendedCacheMemoryGb: 17.3,
      estimatedDbConnections: 20,
    });
  });

  it('uses total QPS and independent request/response payload assumptions', () => {
    const output = calculateCapacity({
      ...golden,
      readWriteRatio: 3,
      readRequestPayloadKb: 1,
      readResponsePayloadKb: 4,
    });
    expect(output.readQps + output.writeQps).toBe(1_000);
    expect(output.inboundBandwidthMbps).toBe(10);
    expect(output.outboundBandwidthMbps).toBe(24.4);
    expect(CAPACITY_UNIT_CONVENTION.qps).toMatch(/read and write/);
  });

  it('models headroom, failover reserve, and utilization in server count', () => {
    const baseline = calculateCapacity(golden).estimatedServersNeeded;
    const protectedCount = calculateCapacity({
      ...golden,
      serverTargetUtilizationPercent: 50,
      serverHeadroomPercent: 25,
      failoverCapacityPercent: 25,
    }).estimatedServersNeeded;
    expect(baseline).toBe(2);
    expect(protectedCount).toBe(6);
  });

  it('models database concurrency with service time and target utilization', () => {
    expect(calculateCapacity(golden).estimatedDbConnections).toBe(20);
    expect(
      calculateCapacity({ ...golden, dbAverageServiceTimeMs: 40, dbTargetUtilizationPercent: 50 })
        .estimatedDbConnections,
    ).toBe(80);
  });

  it('models cache working set and storage overhead independently', () => {
    const modeled = calculateCapacity({
      ...golden,
      cacheWorkingSetDays: 2,
      cacheHotSetPercent: 50,
      cacheCompressionRatio: 0.5,
      indexingOverheadPercent: 20,
      metadataOverheadPercent: 10,
      storageCompressionRatio: 0.5,
      annualGrowthPercent: 20,
      replicationFactor: 3,
    });
    expect(modeled.recommendedCacheMemoryGb).toBe(21.6);
    expect(modeled.totalReplicatedStorageTb).toBe(0.2);
  });

  it('returns bounded uncertainty ranges instead of false precision', () => {
    const output = calculateCapacity(golden);
    for (const estimate of Object.values(output.ranges)) {
      expect(estimate.low).toBeLessThanOrEqual(estimate.expected);
      expect(estimate.high).toBeGreaterThanOrEqual(estimate.expected);
    }
  });

  it('handles zero, negative, non-finite, and extreme boundaries without NaN or Infinity', () => {
    const output = calculateCapacity({
      ...golden,
      qps: Number.NaN,
      payloadSizeKb: -1,
      serverCapacityQps: 0,
      storageCompressionRatio: Infinity,
    });
    const numeric = JSON.stringify(output);
    expect(numeric).not.toContain('NaN');
    expect(numeric).not.toContain('Infinity');
    expect(output.estimatedServersNeeded).toBe(0);
  });

  it('exports machine-readable assumptions, formulas, units, and ranges', () => {
    const output = calculateCapacity(golden);
    const exported = JSON.parse(buildCapacityAssumptionsJson(golden, output));
    expect(exported.units.storage).toContain('Decimal SI');
    expect(exported.formulas.dbConnections).toContain('service time');
    expect(exported.uncertaintyRanges.serversNeeded.high).toBeGreaterThanOrEqual(2);
  });
});
