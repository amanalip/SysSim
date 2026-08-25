import React, { useMemo } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { useStore } from '../../store/use-store';
import { CalculatorInputs, CalculatorOutputs } from '../../model/types';
import styles from './EnvelopeCalculator.module.css';

export const EnvelopeCalculator: React.FC = () => {
  const { calculatorInputs, setCalculatorInputs, nodes, selectNode } = useStore();

  const outputs: CalculatorOutputs = useMemo(() => {
    const safeQps = Math.max(1, calculatorInputs.qps || 1);
    const safePayload = Math.max(0.1, calculatorInputs.payloadSizeKb || 1);
    const safeRetention = Math.max(1, calculatorInputs.retentionDays || 1);
    const safeRatio = Math.max(0.01, calculatorInputs.readWriteRatio !== undefined ? calculatorInputs.readWriteRatio : 10);
    const safeReplication = Math.max(1, calculatorInputs.replicationFactor || 1);
    const safeCapacity = Math.max(1, calculatorInputs.serverCapacityQps || 1000);

    const writeFraction = 1 / (safeRatio + 1);
    const writeQps = safeQps * writeFraction;
    const readQps = Math.max(0, safeQps - writeQps);

    // Daily new write data (GB) = writeQps * payloadKB * 86400 / 1024 / 1024
    const dailyNewDataGb = Math.round(((writeQps * safePayload * 86400) / (1024 * 1024)) * 10) / 10;

    // Total raw storage (TB) = (dailyNewDataGb * retentionDays) / 1024
    const totalStorageNeededTb = Math.round(((dailyNewDataGb * safeRetention) / 1024) * 100) / 100;

    // Replicated storage (TB)
    const totalReplicatedStorageTb = Math.round(totalStorageNeededTb * safeReplication * 100) / 100;

    // Inbound & Outbound Bandwidth (Mbps) = QPS * payloadKB * 8 / 1024
    const inboundBandwidthMbps = Math.round(((writeQps * safePayload * 8) / 1024) * 10) / 10;
    const outboundBandwidthMbps = Math.round(((readQps * safePayload * 8) / 1024) * 10) / 10;

    // Estimated servers needed = Math.ceil(qps / serverCapacityQps)
    const estimatedServersNeeded = Math.max(1, Math.ceil(safeQps / safeCapacity));

    // Recommended Cache memory (GB) = 20% of daily data (80/20 rule)
    const recommendedCacheMemoryGb = Math.round(dailyNewDataGb * 0.2 * 10) / 10;

    // Estimated DB connections = writeQps * 2 + readQps * 0.5
    const estimatedDbConnections = Math.round(writeQps * 2 + readQps * 0.5);

    return {
      dailyNewDataGb,
      totalStorageNeededTb,
      totalReplicatedStorageTb,
      inboundBandwidthMbps,
      outboundBandwidthMbps,
      estimatedServersNeeded,
      recommendedCacheMemoryGb,
      estimatedDbConnections,
      formulas: {
        dailyStorage: `(${Math.round(writeQps)} write QPS * ${safePayload} KB * 86,400s) / 10^6`,
        servers: `${safeQps} total QPS / ${safeCapacity} QPS per instance`,
        cache: `20% Pareto cache of daily write traffic (${dailyNewDataGb} GB)`,
        bandwidth: `${safeQps} total QPS * ${safePayload} KB * 8 bits`,
      },
    };
  }, [calculatorInputs]);

  const handlePreset = (preset: Partial<CalculatorInputs>) => {
    setCalculatorInputs(preset);
  };

  const dbNode = nodes.find((n) => n.data.config.type === 'sql_db' || n.data.config.type === 'nosql_db');
  const serverNode = nodes.find((n) => n.data.config.type === 'app_server');
  const cacheNode = nodes.find((n) => n.data.config.type === 'redis_cache' || n.data.config.type === 'local_cache');

  return (
    <div className={styles.calculatorContainer}>
      {/* Presets */}
      <div className={styles.presetsBar}>
        <div className={styles.presetLabel}>Architecture Presets</div>
        <div className={styles.presetsGrid}>
          <button
            className={styles.presetBtn}
            onClick={() =>
              handlePreset({
                qps: 50000,
                payloadSizeKb: 1,
                readWriteRatio: 50,
                retentionDays: 365,
                replicationFactor: 3,
                serverCapacityQps: 2000,
              })
            }
          >
            Social Media (Read-heavy)
          </button>
          <button
            className={styles.presetBtn}
            onClick={() =>
              handlePreset({
                qps: 20000,
                payloadSizeKb: 4,
                readWriteRatio: 2,
                retentionDays: 180,
                replicationFactor: 3,
                serverCapacityQps: 1500,
              })
            }
          >
            Chat Messaging (Write-heavy)
          </button>
          <button
            className={styles.presetBtn}
            onClick={() =>
              handlePreset({
                qps: 10000,
                payloadSizeKb: 500,
                readWriteRatio: 100,
                retentionDays: 730,
                replicationFactor: 3,
                serverCapacityQps: 500,
              })
            }
          >
            Video Streaming (Media-heavy)
          </button>
          <button
            className={styles.presetBtn}
            onClick={() =>
              handlePreset({
                qps: 15000,
                payloadSizeKb: 5,
                readWriteRatio: 10,
                retentionDays: 365,
                replicationFactor: 3,
                serverCapacityQps: 1000,
              })
            }
          >
            E-Commerce (Standard)
          </button>
        </div>
      </div>

      {/* Input Parameters */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Input Parameters</div>
        <div className={styles.fieldGrid}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Total QPS</label>
            <input
              type="number"
              className={styles.input}
              value={calculatorInputs.qps}
              onChange={(e) =>
                setCalculatorInputs({ qps: parseInt(e.target.value, 10) || 100 })
              }
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Payload (KB)</label>
            <input
              type="number"
              className={styles.input}
              value={calculatorInputs.payloadSizeKb}
              onChange={(e) =>
                setCalculatorInputs({ payloadSizeKb: parseFloat(e.target.value) || 1 })
              }
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Retention (Days)</label>
            <input
              type="number"
              className={styles.input}
              value={calculatorInputs.retentionDays}
              onChange={(e) =>
                setCalculatorInputs({ retentionDays: parseInt(e.target.value, 10) || 30 })
              }
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Read / Write Ratio</label>
            <input
              type="number"
              className={styles.input}
              value={calculatorInputs.readWriteRatio}
              onChange={(e) =>
                setCalculatorInputs({ readWriteRatio: parseFloat(e.target.value) || 1 })
              }
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Replication Factor</label>
            <input
              type="number"
              className={styles.input}
              value={calculatorInputs.replicationFactor}
              onChange={(e) =>
                setCalculatorInputs({ replicationFactor: parseInt(e.target.value, 10) || 1 })
              }
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Server QPS Capacity</label>
            <input
              type="number"
              className={styles.input}
              value={calculatorInputs.serverCapacityQps}
              onChange={(e) =>
                setCalculatorInputs({ serverCapacityQps: parseInt(e.target.value, 10) || 500 })
              }
            />
          </div>
        </div>
      </div>

      {/* Calculated Results */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Capacity Estimations</div>
        <div className={styles.outputsGrid}>
          <div className={styles.outputCard}>
            <div className={styles.outputHeader}>
              <span className={styles.outputLabel}>Daily New Data</span>
              <span className={styles.outputValue}>{outputs.dailyNewDataGb} GB/day</span>
            </div>
            <span className={styles.formulaText}>{outputs.formulas.dailyStorage}</span>
          </div>

          <div className={styles.outputCard}>
            <div className={styles.outputHeader}>
              <span className={styles.outputLabel}>Replicated Storage</span>
              <span className={styles.outputValue}>
                {outputs.totalReplicatedStorageTb} TB
              </span>
            </div>
            {dbNode && (
              <button
                className={styles.linkNodeBtn}
                onClick={() => selectNode(dbNode.id)}
              >
                Focus {dbNode.data.config.name} <ArrowUpRight size={10} />
              </button>
            )}
          </div>

          <div className={styles.outputCard}>
            <div className={styles.outputHeader}>
              <span className={styles.outputLabel}>App Servers Needed</span>
              <span className={styles.outputValue} style={{ color: 'var(--accent-primary)' }}>
                {outputs.estimatedServersNeeded} instances
              </span>
            </div>
            <span className={styles.formulaText}>{outputs.formulas.servers}</span>
            {serverNode && (
              <button
                className={styles.linkNodeBtn}
                onClick={() => selectNode(serverNode.id)}
              >
                Focus {serverNode.data.config.name} <ArrowUpRight size={10} />
              </button>
            )}
          </div>

          <div className={styles.outputCard}>
            <div className={styles.outputHeader}>
              <span className={styles.outputLabel}>Recommended Cache RAM</span>
              <span className={styles.outputValue}>
                {outputs.recommendedCacheMemoryGb} GB
              </span>
            </div>
            <span className={styles.formulaText}>{outputs.formulas.cache}</span>
            {cacheNode && (
              <button
                className={styles.linkNodeBtn}
                onClick={() => selectNode(cacheNode.id)}
              >
                Focus {cacheNode.data.config.name} <ArrowUpRight size={10} />
              </button>
            )}
          </div>

          <div className={styles.outputCard}>
            <div className={styles.outputHeader}>
              <span className={styles.outputLabel}>Inbound Bandwidth (Writes)</span>
              <span className={styles.outputValue}>
                {outputs.inboundBandwidthMbps} Mbps
              </span>
            </div>
            <span className={styles.formulaText}>Writes: {Math.round(outputs.dailyNewDataGb)} GB/day at {outputs.inboundBandwidthMbps} Mbps</span>
          </div>

          <div className={styles.outputCard}>
            <div className={styles.outputHeader}>
              <span className={styles.outputLabel}>Outbound Bandwidth (Reads)</span>
              <span className={styles.outputValue}>
                {outputs.outboundBandwidthMbps} Mbps
              </span>
            </div>
            <span className={styles.formulaText}>Reads: {outputs.outboundBandwidthMbps} Mbps egress traffic</span>
          </div>

          <div className={styles.outputCard}>
            <div className={styles.outputHeader}>
              <span className={styles.outputLabel}>Estimated DB Pool</span>
              <span className={styles.outputValue}>
                {outputs.estimatedDbConnections} conns
              </span>
            </div>
            <span className={styles.formulaText}>Pool estimate: 2x writes + 0.5x reads</span>
            {dbNode && (
              <button
                className={styles.linkNodeBtn}
                onClick={() => selectNode(dbNode.id)}
              >
                Focus {dbNode.data.config.name} <ArrowUpRight size={10} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
