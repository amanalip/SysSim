import React, { useMemo, useState } from 'react';
import { DollarSign, Server, Database, Zap, Radio, Globe } from 'lucide-react';
import { useStore } from '../../store/use-store';
import styles from './CostEstimatorPanel.module.css';

interface CostLineItem {
  id: string;
  nodeName: string;
  category: string;
  instanceType: string;
  replicas: number;
  unitMonthlyCost: number;
  totalMonthlyCost: number;
}

export const CostEstimatorPanel: React.FC = () => {
  const { nodes, metrics } = useStore();
  const [cloudProvider, setCloudProvider] = useState<'aws' | 'gcp' | 'azure'>('aws');
  const [useSpotInstances, setUseSpotInstances] = useState(false);

  const discountMultiplier = useSpotInstances ? 0.4 : 1.0;

  const costBreakdown = useMemo(() => {
    let computeCost = 0;
    let storageCost = 0;
    let cachingCost = 0;
    let networkingCost = 0;
    let messagingCost = 0;
    let otherCost = 0;

    const billableNodes = nodes.filter((n) => n.data.config.type !== 'client');
    const lineItems: CostLineItem[] = billableNodes.map((node) => {
      const config = node.data.config as any;
      const type = config.type;
      const replicas = (config.type === 'sql_db'
        ? (config.replicas || 1) + (config.readReplicasCount || 0)
        : config.replicas) || 1;

      let unitCost = 35;
      let instanceType = 't4g.large (2 vCPU, 8GB)';
      let category = 'Compute';

      if (type === 'app_server' || type === 'worker') {
        unitCost = 38 * discountMultiplier;
        instanceType = cloudProvider === 'aws' ? 'c6g.large' : cloudProvider === 'gcp' ? 'c2-standard-4' : 'D4s_v5';
        category = 'Compute';
        computeCost += unitCost * replicas;
      } else if (type === 'sql_db') {
        unitCost = 145;
        instanceType = cloudProvider === 'aws' ? 'db.r6g.xlarge' : cloudProvider === 'gcp' ? 'custom-4-16384' : 'E4s_v5';
        category = 'Storage';
        storageCost += unitCost * replicas;
      } else if (type === 'nosql_db') {
        unitCost = 95;
        instanceType = 'Provisioned IOPS Tier';
        category = 'Storage';
        storageCost += unitCost * replicas;
      } else if (type === 'redis_cache' || type === 'local_cache') {
        unitCost = 55;
        instanceType = cloudProvider === 'aws' ? 'cache.r6g.large' : cloudProvider === 'gcp' ? 'redis-standard-small' : 'Premium P1';
        category = 'Caching';
        cachingCost += unitCost * replicas;
      } else if (type === 'load_balancer' || type === 'api_gateway') {
        unitCost = 25;
        instanceType = 'Application Load Balancer';
        category = 'Networking';
        networkingCost += unitCost * replicas;
      } else if (type === 'cdn_cache') {
        unitCost = 20;
        instanceType = 'Edge Distribution';
        category = 'Networking';
        networkingCost += unitCost * replicas;
      } else if (type === 'message_queue' || type === 'pubsub' || type === 'event_bus') {
        unitCost = 42;
        instanceType = 'Managed Cluster (3 Nodes)';
        category = 'Messaging';
        messagingCost += unitCost * replicas;
      } else {
        unitCost = 15;
        instanceType = 'Standard Instance';
        category = 'Other';
        otherCost += unitCost * replicas;
      }

      return {
        id: node.id,
        nodeName: config.name,
        category,
        instanceType,
        replicas,
        unitMonthlyCost: Math.round(unitCost),
        totalMonthlyCost: Math.round(unitCost * replicas),
      };
    });

    // Bandwidth egress estimate: $0.08 per GB
    const estimatedMonthlyGb = Math.round((metrics.currentQps * 2 * 3600 * 24 * 30) / (1024 * 1024));
    const bandwidthCost = Math.round(estimatedMonthlyGb * 0.08);
    networkingCost += bandwidthCost;

    const totalMonthly = computeCost + storageCost + cachingCost + networkingCost + messagingCost + otherCost;

    return {
      totalMonthly: Math.round(totalMonthly),
      computeCost: Math.round(computeCost),
      storageCost: Math.round(storageCost),
      cachingCost: Math.round(cachingCost),
      networkingCost: Math.round(networkingCost),
      messagingCost: Math.round(messagingCost),
      bandwidthCost,
      estimatedMonthlyGb,
      lineItems,
    };
  }, [nodes, metrics.currentQps, cloudProvider, discountMultiplier]);

  if (nodes.length === 0) {
    return (
      <div className={styles.emptyState}>
        <DollarSign size={28} color="var(--text-muted)" />
        <span className={styles.emptyTitle}>No Provisioned Cloud Infrastructure</span>
        <span className={styles.emptySubtitle}>
          Add components to the canvas to view real-time monthly cloud cost projections.
        </span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
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
              Est. ${Math.round(costBreakdown.totalMonthly / 730 * 100) / 100}/hr across {nodes.length} nodes
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
            <span>Spot Instances (-60%)</span>
          </label>
        </div>
      </div>

      {/* Category Breakdown Cards */}
      <div className={styles.cardsGrid}>
        <div className={styles.categoryCard}>
          <div className={styles.cardHeader}>
            <Server size={14} color="#3b82f6" />
            <span>Compute</span>
          </div>
          <span className={styles.categoryVal}>${costBreakdown.computeCost}/mo</span>
        </div>

        <div className={styles.categoryCard}>
          <div className={styles.cardHeader}>
            <Database size={14} color="#10b981" />
            <span>Databases</span>
          </div>
          <span className={styles.categoryVal}>${costBreakdown.storageCost}/mo</span>
        </div>

        <div className={styles.categoryCard}>
          <div className={styles.cardHeader}>
            <Zap size={14} color="#f59e0b" />
            <span>Caching</span>
          </div>
          <span className={styles.categoryVal}>${costBreakdown.cachingCost}/mo</span>
        </div>

        <div className={styles.categoryCard}>
          <div className={styles.cardHeader}>
            <Globe size={14} color="#8b5cf6" />
            <span>Networking</span>
          </div>
          <span className={styles.categoryVal}>${costBreakdown.networkingCost}/mo</span>
        </div>

        <div className={styles.categoryCard}>
          <div className={styles.cardHeader}>
            <Radio size={14} color="#ec4899" />
            <span>Messaging</span>
          </div>
          <span className={styles.categoryVal}>${costBreakdown.messagingCost}/mo</span>
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
