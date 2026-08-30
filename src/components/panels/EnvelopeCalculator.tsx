import React, { useMemo } from 'react';
import { ArrowUpRight, Download } from 'lucide-react';
import { useStore } from '../../store/use-store';
import { CalculatorInputs } from '../../model/types';
import { buildCapacityAssumptionsJson, calculateCapacity, CAPACITY_UNIT_CONVENTION } from '../../analysis/capacity-calculator';
import { ModelNotice } from '../ui/ModelNotice';
import styles from './EnvelopeCalculator.module.css';

const NumericAssumptionField: React.FC<{ label: string; value: number; min?: number; max?: number; step?: number; onChange: (value: number) => void }> =
  ({ label, value, min = 0, max, step = 1, onChange }) => (
    <div className={styles.fieldGroup}>
      <label className={styles.fieldLabel}>{label}</label>
      <input type="number" className={styles.input} value={value} min={min} max={max} step={step}
        onChange={(event) => { const parsed = Number(event.target.value); if (Number.isFinite(parsed)) onChange(parsed); }} />
    </div>
  );

export const EnvelopeCalculator: React.FC = () => {
  const { calculatorInputs, setCalculatorInputs, nodes, selectNode } = useStore();

  const [qpsText, setQpsText] = React.useState(String(calculatorInputs.qps));
  const [payloadText, setPayloadText] = React.useState(String(calculatorInputs.payloadSizeKb));
  const [retentionText, setRetentionText] = React.useState(String(calculatorInputs.retentionDays));
  const [ratioText, setRatioText] = React.useState(String(calculatorInputs.readWriteRatio));
  const [replicationText, setReplicationText] = React.useState(String(calculatorInputs.replicationFactor));
  const [capacityText, setCapacityText] = React.useState(String(calculatorInputs.serverCapacityQps));

  React.useEffect(() => {
    setQpsText(String(calculatorInputs.qps));
    setPayloadText(String(calculatorInputs.payloadSizeKb));
    setRetentionText(String(calculatorInputs.retentionDays));
    setRatioText(String(calculatorInputs.readWriteRatio));
    setReplicationText(String(calculatorInputs.replicationFactor));
    setCapacityText(String(calculatorInputs.serverCapacityQps));
  }, [
    calculatorInputs.qps,
    calculatorInputs.payloadSizeKb,
    calculatorInputs.retentionDays,
    calculatorInputs.readWriteRatio,
    calculatorInputs.replicationFactor,
    calculatorInputs.serverCapacityQps,
  ]);

  const outputs = useMemo(() => calculateCapacity(calculatorInputs), [calculatorInputs]);

  const downloadAssumptions = () => {
    const url = URL.createObjectURL(new Blob([buildCapacityAssumptionsJson(calculatorInputs, outputs)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `syssim-capacity-assumptions-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handlePreset = (preset: Partial<CalculatorInputs>) => {
    setCalculatorInputs(preset);
  };

  const dbNode = nodes.find((n) => n.data.config.type === 'sql_db' || n.data.config.type === 'nosql_db');
  const serverNode = nodes.find((n) => n.data.config.type === 'app_server');
  const cacheNode = nodes.find((n) => n.data.config.type === 'redis_cache' || n.data.config.type === 'local_cache');

  return (
    <div className={styles.calculatorContainer}>
      <ModelNotice
        kind="estimate"
        detail={`${CAPACITY_UNIT_CONVENTION.qps} ${CAPACITY_UNIT_CONVENTION.storage} Results are ranges, not production guarantees.`}
        assumptionLabel="capacity worksheet simplifications"
        assumptionSection="deliberate-simplifications-and-rationale"
      />

      {/* Presets */}
      <div className={styles.presetsBar}>
        <div className={styles.presetHeader}>
          <div className={styles.presetLabel}>Architecture Presets</div>
          <button className={styles.downloadBtn} onClick={downloadAssumptions} title="Download inputs, formulas, units, and uncertainty ranges">
            <Download size={11} /> Assumptions JSON
          </button>
        </div>
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
            <label className={styles.fieldLabel}>Total QPS (reads + writes)</label>
            <input
              type="number"
              className={styles.input}
              value={qpsText}
              onChange={(e) => {
                setQpsText(e.target.value);
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val > 0) setCalculatorInputs({ qps: val });
              }}
              onBlur={() => {
                const val = parseInt(qpsText, 10);
                if (isNaN(val) || val <= 0) setQpsText(String(calculatorInputs.qps));
              }}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Write / stored payload (decimal KB)</label>
            <input
              type="number"
              className={styles.input}
              value={payloadText}
              onChange={(e) => {
                setPayloadText(e.target.value);
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val > 0) setCalculatorInputs({ payloadSizeKb: val });
              }}
              onBlur={() => {
                const val = parseFloat(payloadText);
                if (isNaN(val) || val <= 0) setPayloadText(String(calculatorInputs.payloadSizeKb));
              }}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Retention (Days)</label>
            <input
              type="number"
              className={styles.input}
              value={retentionText}
              onChange={(e) => {
                setRetentionText(e.target.value);
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val > 0) setCalculatorInputs({ retentionDays: val });
              }}
              onBlur={() => {
                const val = parseInt(retentionText, 10);
                if (isNaN(val) || val <= 0) setRetentionText(String(calculatorInputs.retentionDays));
              }}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Read / Write Ratio</label>
            <input
              type="number"
              className={styles.input}
              value={ratioText}
              onChange={(e) => {
                setRatioText(e.target.value);
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val >= 0) setCalculatorInputs({ readWriteRatio: val });
              }}
              onBlur={() => {
                const val = parseFloat(ratioText);
                if (isNaN(val) || val < 0) setRatioText(String(calculatorInputs.readWriteRatio));
              }}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Replication Factor</label>
            <input
              type="number"
              className={styles.input}
              value={replicationText}
              onChange={(e) => {
                setReplicationText(e.target.value);
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val > 0) setCalculatorInputs({ replicationFactor: val });
              }}
              onBlur={() => {
                const val = parseInt(replicationText, 10);
                if (isNaN(val) || val <= 0) setReplicationText(String(calculatorInputs.replicationFactor));
              }}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Server QPS Capacity</label>
            <input
              type="number"
              className={styles.input}
              value={capacityText}
              onChange={(e) => {
                setCapacityText(e.target.value);
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val > 0) setCalculatorInputs({ serverCapacityQps: val });
              }}
              onBlur={() => {
                const val = parseInt(capacityText, 10);
                if (isNaN(val) || val <= 0) setCapacityText(String(calculatorInputs.serverCapacityQps));
              }}
            />
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Workload & Reliability Assumptions</div>
        <div className={styles.fieldGrid}>
          <NumericAssumptionField label="Read request (KB)" value={calculatorInputs.readRequestPayloadKb ?? 0.5} step={0.1} onChange={(readRequestPayloadKb) => setCalculatorInputs({ readRequestPayloadKb })} />
          <NumericAssumptionField label="Read response (KB)" value={calculatorInputs.readResponsePayloadKb ?? calculatorInputs.payloadSizeKb} step={0.1} onChange={(readResponsePayloadKb) => setCalculatorInputs({ readResponsePayloadKb })} />
          <NumericAssumptionField label="Write response (KB)" value={calculatorInputs.writeResponsePayloadKb ?? 0.2} step={0.1} onChange={(writeResponsePayloadKb) => setCalculatorInputs({ writeResponsePayloadKb })} />
          <NumericAssumptionField label="DB service time (ms)" value={calculatorInputs.dbAverageServiceTimeMs ?? 20} step={1} min={0.1} onChange={(dbAverageServiceTimeMs) => setCalculatorInputs({ dbAverageServiceTimeMs })} />
          <NumericAssumptionField label="DB target utilization (%)" value={calculatorInputs.dbTargetUtilizationPercent ?? 70} max={100} onChange={(dbTargetUtilizationPercent) => setCalculatorInputs({ dbTargetUtilizationPercent })} />
          <NumericAssumptionField label="Server target utilization (%)" value={calculatorInputs.serverTargetUtilizationPercent ?? 70} max={100} onChange={(serverTargetUtilizationPercent) => setCalculatorInputs({ serverTargetUtilizationPercent })} />
          <NumericAssumptionField label="Server headroom (%)" value={calculatorInputs.serverHeadroomPercent ?? 20} onChange={(serverHeadroomPercent) => setCalculatorInputs({ serverHeadroomPercent })} />
          <NumericAssumptionField label="Failover reserve (%)" value={calculatorInputs.failoverCapacityPercent ?? 20} onChange={(failoverCapacityPercent) => setCalculatorInputs({ failoverCapacityPercent })} />
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Storage & Working-Set Assumptions</div>
        <div className={styles.fieldGrid}>
          <NumericAssumptionField label="Cache working set (days)" value={calculatorInputs.cacheWorkingSetDays ?? 1} step={0.1} min={0.01} onChange={(cacheWorkingSetDays) => setCalculatorInputs({ cacheWorkingSetDays })} />
          <NumericAssumptionField label="Cache hot set (%)" value={calculatorInputs.cacheHotSetPercent ?? 20} max={100} onChange={(cacheHotSetPercent) => setCalculatorInputs({ cacheHotSetPercent })} />
          <NumericAssumptionField label="Cache compression ratio" value={calculatorInputs.cacheCompressionRatio ?? 0.7} step={0.05} min={0.01} max={1} onChange={(cacheCompressionRatio) => setCalculatorInputs({ cacheCompressionRatio })} />
          <NumericAssumptionField label="Index overhead (%)" value={calculatorInputs.indexingOverheadPercent ?? 20} onChange={(indexingOverheadPercent) => setCalculatorInputs({ indexingOverheadPercent })} />
          <NumericAssumptionField label="Metadata overhead (%)" value={calculatorInputs.metadataOverheadPercent ?? 5} onChange={(metadataOverheadPercent) => setCalculatorInputs({ metadataOverheadPercent })} />
          <NumericAssumptionField label="Storage compression ratio" value={calculatorInputs.storageCompressionRatio ?? 0.7} step={0.05} min={0.01} max={1} onChange={(storageCompressionRatio) => setCalculatorInputs({ storageCompressionRatio })} />
          <NumericAssumptionField label="Annual growth reserve (%)" value={calculatorInputs.annualGrowthPercent ?? 30} onChange={(annualGrowthPercent) => setCalculatorInputs({ annualGrowthPercent })} />
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
                {outputs.ranges.replicatedStorageTb.low}–{outputs.ranges.replicatedStorageTb.high} TB
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
                {outputs.ranges.serversNeeded.low}–{outputs.ranges.serversNeeded.high} instances
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
                {outputs.ranges.cacheMemoryGb.low}–{outputs.ranges.cacheMemoryGb.high} GB
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
              <span className={styles.outputLabel}>Inbound Bandwidth (Request Bodies)</span>
              <span className={styles.outputValue}>
                {outputs.inboundBandwidthMbps} Mbps
              </span>
            </div>
            <span className={styles.formulaText}>{outputs.writeQps} write + {outputs.readQps} read QPS request bodies</span>
          </div>

          <div className={styles.outputCard}>
            <div className={styles.outputHeader}>
              <span className={styles.outputLabel}>Outbound Bandwidth (Response Bodies)</span>
              <span className={styles.outputValue}>
                {outputs.outboundBandwidthMbps} Mbps
              </span>
            </div>
            <span className={styles.formulaText}>Read responses plus write acknowledgements; decimal Mbps</span>
          </div>

          <div className={styles.outputCard}>
            <div className={styles.outputHeader}>
              <span className={styles.outputLabel}>Estimated DB Pool</span>
              <span className={styles.outputValue}>
                {outputs.ranges.dbConnections.low}–{outputs.ranges.dbConnections.high} conns
              </span>
            </div>
            <span className={styles.formulaText}>{outputs.formulas.dbConnections}</span>
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
