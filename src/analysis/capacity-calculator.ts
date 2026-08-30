import { CalculatorInputs, CalculatorOutputs, EstimateRange } from '../model/types';

export const CAPACITY_UNIT_CONVENTION = {
  storage: 'Decimal SI: 1 KB = 1,000 bytes; 1 GB = 1,000,000,000 bytes; 1 TB = 1,000 GB.',
  bandwidth: 'Decimal SI: Mbps means 1,000,000 bits per second.',
  qps: 'Total QPS includes read and write operations. readWriteRatio is reads per write.',
} as const;

export const DEFAULT_CAPACITY_ASSUMPTIONS = {
  readRequestPayloadKb: 0.5,
  writeResponsePayloadKb: 0.2,
  dbAverageServiceTimeMs: 20,
  dbTargetUtilizationPercent: 70,
  cacheWorkingSetDays: 1,
  cacheHotSetPercent: 20,
  cacheCompressionRatio: 0.7,
  serverTargetUtilizationPercent: 70,
  serverHeadroomPercent: 20,
  failoverCapacityPercent: 20,
  indexingOverheadPercent: 20,
  metadataOverheadPercent: 5,
  storageCompressionRatio: 0.7,
  annualGrowthPercent: 30,
} as const;

const finite = (value: number | undefined, fallback: number, min = 0, max = 1_000_000_000): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
const round = (value: number, digits = 1): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};
const range = (expected: number, uncertainty: number, integer = false): EstimateRange => {
  const transform = integer ? Math.ceil : (value: number) => round(value, 2);
  return { low: transform(expected * (1 - uncertainty)), expected: transform(expected), high: transform(expected * (1 + uncertainty)) };
};

export function calculateCapacity(raw: CalculatorInputs): CalculatorOutputs {
  const qps = finite(raw.qps, 0);
  const writePayloadKb = finite(raw.payloadSizeKb, 1, 0.001);
  const retentionDays = finite(raw.retentionDays, 1, 1, 36_500);
  const ratio = finite(raw.readWriteRatio, 10, 0);
  const replicationFactor = finite(raw.replicationFactor, 1, 1, 20);
  const serverCapacityQps = finite(raw.serverCapacityQps, 1, 1);
  const readRequestPayloadKb = finite(raw.readRequestPayloadKb, DEFAULT_CAPACITY_ASSUMPTIONS.readRequestPayloadKb, 0);
  const readResponsePayloadKb = finite(raw.readResponsePayloadKb, writePayloadKb, 0);
  const writeResponsePayloadKb = finite(raw.writeResponsePayloadKb, DEFAULT_CAPACITY_ASSUMPTIONS.writeResponsePayloadKb, 0);
  const dbAverageServiceTimeMs = finite(raw.dbAverageServiceTimeMs, DEFAULT_CAPACITY_ASSUMPTIONS.dbAverageServiceTimeMs, 0.1, 60_000);
  const dbTargetUtilizationPercent = finite(raw.dbTargetUtilizationPercent, DEFAULT_CAPACITY_ASSUMPTIONS.dbTargetUtilizationPercent, 1, 100);
  const cacheWorkingSetDays = finite(raw.cacheWorkingSetDays, DEFAULT_CAPACITY_ASSUMPTIONS.cacheWorkingSetDays, 0.01, retentionDays);
  const cacheHotSetPercent = finite(raw.cacheHotSetPercent, DEFAULT_CAPACITY_ASSUMPTIONS.cacheHotSetPercent, 0, 100);
  const cacheCompressionRatio = finite(raw.cacheCompressionRatio, DEFAULT_CAPACITY_ASSUMPTIONS.cacheCompressionRatio, 0.01, 1);
  const targetUtilization = finite(raw.serverTargetUtilizationPercent, DEFAULT_CAPACITY_ASSUMPTIONS.serverTargetUtilizationPercent, 1, 100) / 100;
  const headroom = finite(raw.serverHeadroomPercent, DEFAULT_CAPACITY_ASSUMPTIONS.serverHeadroomPercent, 0, 500) / 100;
  const failover = finite(raw.failoverCapacityPercent, DEFAULT_CAPACITY_ASSUMPTIONS.failoverCapacityPercent, 0, 500) / 100;
  const indexing = finite(raw.indexingOverheadPercent, DEFAULT_CAPACITY_ASSUMPTIONS.indexingOverheadPercent, 0, 500) / 100;
  const metadata = finite(raw.metadataOverheadPercent, DEFAULT_CAPACITY_ASSUMPTIONS.metadataOverheadPercent, 0, 500) / 100;
  const compression = finite(raw.storageCompressionRatio, DEFAULT_CAPACITY_ASSUMPTIONS.storageCompressionRatio, 0.01, 1);
  const growth = finite(raw.annualGrowthPercent, DEFAULT_CAPACITY_ASSUMPTIONS.annualGrowthPercent, 0, 1_000) / 100;

  const writeQps = ratio === 0 ? qps : qps / (ratio + 1);
  const readQps = qps - writeQps;
  const dailyNewDataGb = writeQps * writePayloadKb * 86_400 / 1_000_000;
  const rawRetentionTb = dailyNewDataGb * retentionDays / 1_000;
  const overheadAdjustedTb = rawRetentionTb * (1 + indexing + metadata) * compression * (1 + growth);
  const totalReplicatedStorageTb = overheadAdjustedTb * replicationFactor;
  const inboundBandwidthMbps = (writeQps * writePayloadKb + readQps * readRequestPayloadKb) * 8 / 1_000;
  const outboundBandwidthMbps = (readQps * readResponsePayloadKb + writeQps * writeResponsePayloadKb) * 8 / 1_000;
  const requiredServerQps = qps * (1 + headroom + failover);
  const usableServerQps = serverCapacityQps * targetUtilization;
  const estimatedServersNeeded = qps === 0 ? 0 : Math.ceil(requiredServerQps / usableServerQps);
  const recommendedCacheMemoryGb = dailyNewDataGb * cacheWorkingSetDays * cacheHotSetPercent / 100 * cacheCompressionRatio;
  const estimatedDbConnections = qps === 0 ? 0 : Math.ceil(qps * (dbAverageServiceTimeMs / 1_000) / (dbTargetUtilizationPercent / 100));

  const outputs: CalculatorOutputs = {
    readQps: round(readQps, 2), writeQps: round(writeQps, 2),
    dailyNewDataGb: round(dailyNewDataGb), totalStorageNeededTb: round(overheadAdjustedTb, 2),
    totalReplicatedStorageTb: round(totalReplicatedStorageTb, 2),
    inboundBandwidthMbps: round(inboundBandwidthMbps), outboundBandwidthMbps: round(outboundBandwidthMbps),
    estimatedServersNeeded, recommendedCacheMemoryGb: round(recommendedCacheMemoryGb), estimatedDbConnections,
    ranges: {
      replicatedStorageTb: range(totalReplicatedStorageTb, 0.2),
      serversNeeded: range(estimatedServersNeeded, 0.2, true),
      cacheMemoryGb: range(recommendedCacheMemoryGb, 0.35),
      dbConnections: range(estimatedDbConnections, 0.3, true),
    },
    assumptions: {
      unitConvention: CAPACITY_UNIT_CONVENTION.storage,
      qpsDefinition: CAPACITY_UNIT_CONVENTION.qps,
      requestPayloads: `Writes ${writePayloadKb} KB, reads ${readRequestPayloadKb} KB`,
      responsePayloads: `Reads ${readResponsePayloadKb} KB, writes ${writeResponsePayloadKb} KB`,
      serverTargetUtilizationPercent: targetUtilization * 100,
      serverHeadroomPercent: headroom * 100,
      failoverCapacityPercent: failover * 100,
      dbAverageServiceTimeMs,
      dbTargetUtilizationPercent,
      cacheWorkingSetDays,
      cacheHotSetPercent,
      cacheCompressionRatio,
      indexingOverheadPercent: indexing * 100,
      metadataOverheadPercent: metadata * 100,
      storageCompressionRatio: compression,
      annualGrowthPercent: growth * 100,
    },
    formulas: {
      dailyStorage: `${round(writeQps)} write QPS × ${writePayloadKb} KB × 86,400s ÷ 1,000,000`,
      storage: `raw retention × ${(1 + indexing + metadata).toFixed(2)} overhead × ${compression} compression × ${(1 + growth).toFixed(2)} growth × ${replicationFactor} replicas`,
      servers: `${round(requiredServerQps)} required QPS ÷ ${round(usableServerQps)} usable QPS/instance`,
      cache: `${round(dailyNewDataGb)} GB/day × ${cacheWorkingSetDays} days × ${cacheHotSetPercent}% hot set × ${cacheCompressionRatio} compression`,
      bandwidth: `inbound=request bodies; outbound=response bodies; decimal Mbps`,
      dbConnections: `${qps} QPS × ${dbAverageServiceTimeMs}ms service time ÷ ${dbTargetUtilizationPercent}% target utilization`,
    },
  };
  return outputs;
}

export function buildCapacityAssumptionsJson(inputs: CalculatorInputs, outputs: CalculatorOutputs): string {
  return JSON.stringify({
    generatedAt: new Date().toISOString(),
    model: 'SysSim illustrative capacity worksheet',
    units: CAPACITY_UNIT_CONVENTION,
    inputs,
    normalizedAssumptions: outputs.assumptions,
    uncertaintyRanges: outputs.ranges,
    formulas: outputs.formulas,
  }, null, 2);
}
