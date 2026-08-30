import React, { useMemo, useState } from 'react';
import { DollarSign, Server, Database, Zap, Radio, Globe } from 'lucide-react';
import { useStore } from '../../store/use-store';
import { ModelNotice } from '../ui/ModelNotice';
import { CloudProvider, estimateArchitectureCost, ILLUSTRATIVE_PRICING_CONTEXT } from '../../analysis/cost-estimator';
import styles from './CostEstimatorPanel.module.css';

export const CostEstimatorPanel: React.FC = () => {
  const { nodes, metrics, trafficConfig } = useStore();
  const [cloudProvider, setCloudProvider] = useState<CloudProvider>('aws');
  const [useSpotInstances, setUseSpotInstances] = useState(false);
  const workloadQps = metrics.completedThroughputQps || trafficConfig.baseQps;
  const costBreakdown = useMemo(
    () => estimateArchitectureCost(nodes, workloadQps, cloudProvider, useSpotInstances),
    [nodes, workloadQps, cloudProvider, useSpotInstances],
  );

  if (nodes.length === 0) {
    return (
      <div className={styles.container}>
        <ModelNotice
          kind="estimate"
          detail={`Illustrative ${ILLUSTRATIVE_PRICING_CONTEXT.currency} baseline dated ${ILLUSTRATIVE_PRICING_CONTEXT.effectiveDate} for ${ILLUSTRATIVE_PRICING_CONTEXT.region}; not live provider pricing or a billing quote.`}
          assumptionLabel="cloud-cost simplifications"
          assumptionSection="deliberate-simplifications-and-rationale"
        />
        <div className={styles.emptyState}>
          <DollarSign size={28} color="var(--text-muted)" />
          <span className={styles.emptyTitle}>No Provisioned Cloud Infrastructure</span>
          <span className={styles.emptySubtitle}>
            Add components to the canvas to view an illustrative monthly cost estimate.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <ModelNotice
        kind="estimate"
        detail={`Illustrative ${ILLUSTRATIVE_PRICING_CONTEXT.currency} baseline dated ${ILLUSTRATIVE_PRICING_CONTEXT.effectiveDate} for ${ILLUSTRATIVE_PRICING_CONTEXT.region}; not live provider pricing or a billing quote.`}
        assumptionLabel="cloud-cost simplifications"
        assumptionSection="deliberate-simplifications-and-rationale"
      />
      {/* Top Total Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.costBadge}>
            <DollarSign size={22} color="var(--success)" />
          </div>
          <div>
            <div className={styles.totalNumber}>
              ${costBreakdown.totalMonthly.toLocaleString()}
              <span className={styles.perMonth}> / month</span>
            </div>
            <div className={styles.subtitle}>
              Est. ${Math.round(costBreakdown.totalMonthly / 730 * 100) / 100}/hr across {nodes.length} nodes at {Math.round(workloadQps).toLocaleString()} QPS
            </div>
          </div>
        </div>

        <div className={styles.headerRight}>
          {/* Provider Switcher */}
          <div className={styles.segmentedProvider}>
            {(['aws', 'gcp', 'azure'] as const).map((p) => (
              <button
                key={p}
                className={`${styles.providerBtn} ${cloudProvider === p ? styles.providerBtnActive : ''}`}
                onClick={() => setCloudProvider(p)}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>

          <label className={styles.spotToggle}>
            <input
              type="checkbox"
              checked={useSpotInstances}
              onChange={(e) => setUseSpotInstances(e.target.checked)}
            />
            <span>Eligible compute spot (-60%)</span>
          </label>
        </div>
      </div>

      {/* Independent cost drivers */}
      <div className={styles.cardsGrid}>
        <div className={styles.categoryCard}>
          <div className={styles.cardHeader}>
            <Server size={14} color="#3b82f6" />
            <span>Managed services</span>
          </div>
          <span className={styles.categoryVal}>${costBreakdown.managedServiceCost}/mo</span>
        </div>

        <div className={styles.categoryCard}>
          <div className={styles.cardHeader}>
            <Database size={14} color="#10b981" />
            <span>Storage capacity</span>
          </div>
          <span className={styles.categoryVal}>${costBreakdown.capacityStorageCost}/mo</span>
        </div>

        <div className={styles.categoryCard}>
          <div className={styles.cardHeader}>
            <Zap size={14} color="#f59e0b" />
            <span>Requests</span>
          </div>
          <span className={styles.categoryVal}>${costBreakdown.requestCost}/mo</span>
        </div>

        <div className={styles.categoryCard}>
          <div className={styles.cardHeader}>
            <Globe size={14} color="#8b5cf6" />
            <span>Bandwidth</span>
          </div>
          <span className={styles.categoryVal}>${costBreakdown.bandwidthCost}/mo</span>
        </div>

        <div className={styles.categoryCard}>
          <div className={styles.cardHeader}>
            <Radio size={14} color="#ec4899" />
            <span>Redundancy</span>
          </div>
          <span className={styles.categoryVal}>${costBreakdown.redundancyCost}/mo</span>
        </div>
      </div>

      {/* Line Items Breakdown Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Component</th>
              <th>Category</th>
              <th>Instance Profile</th>
              <th>Mapping basis</th>
              <th>Replicas</th>
              <th>Unit Cost</th>
              <th>Total / Mo</th>
            </tr>
          </thead>
          <tbody>
            {costBreakdown.lineItems.map((item) => (
              <tr key={item.id}>
                <td className={styles.componentNameCell}>{item.nodeName}</td>
                <td>
                  <span className={styles.categoryTag}>{item.category}</span>
                </td>
                <td className={styles.monoCell}>{item.instanceType}</td>
                <td className={styles.mappingCell}>{item.mappingRationale}</td>
                <td className={styles.monoCell}>x{item.replicas}</td>
                <td className={styles.monoCell}>${item.unitMonthlyCost}</td>
                <td className={styles.totalCell}>${item.totalMonthlyCost}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
