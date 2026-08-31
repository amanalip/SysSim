import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import {
  Power,
  Settings,
  Trash2,
  AlertTriangle,
  Zap,
  Clock,
  Activity,
  Link2,
  Copy,
} from 'lucide-react';
import { AnyComponentConfig } from '../../../model/types';
import { categoryColors } from '../../../theme';
import { ComponentIcon } from '../../icons/ComponentIcon';
import { useStore } from '../../../store/use-store';
import styles from './CustomComponentNode.module.css';

interface NodeData {
  config: AnyComponentConfig;
}

export const CustomComponentNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const nodeData = data as unknown as NodeData;
  const config = nodeData.config;
  const {
    selectNode,
    removeNode,
    duplicateNode,
    setNodeHealthOverride,
    bottlenecks,
    metrics,
    simState,
    addToast,
  } = useStore();

  const categoryColor = categoryColors[config.category]?.main || 'var(--accent-primary)';
  const isDown = config.health === 'down';
  const hasBottleneck = bottlenecks.some((b) => b.nodeId === id);
  const nodeMetric = metrics.componentMetrics?.[id];
  const isSimActive = simState === 'running' || simState === 'paused';

  const toggleHealth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextHealth = config.health === 'down' ? 'healthy' : 'down';
    setNodeHealthOverride(id, nextHealth);
    addToast(`${config.name} marked ${nextHealth}`, 'info');
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    duplicateNode(id);
    addToast(`Duplicated ${config.name}`, 'success');
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    removeNode(id);
    addToast(`Removed ${config.name}`, 'info');
  };

  const handleOpenConfig = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    selectNode(id);
  };

  const getSubtext = () => {
    if ('replicas' in config && config.replicas !== undefined) {
      return `${config.replicas} replica${config.replicas > 1 ? 's' : ''}`;
    }
    if ('algorithm' in config) {
      return `${config.algorithm.replace('_', ' ')}`;
    }
    if ('hitRatioPercent' in config) {
      return `${config.hitRatioPercent}% hit ratio`;
    }
    if ('limitQps' in config) {
      return `${config.limitQps} QPS limit`;
    }
    if ('partitions' in config) {
      return `${config.partitions} partitions`;
    }
    if ('readReplicasCount' in config && config.readReplicasCount !== undefined) {
      return `${config.readReplicasCount} read replica${config.readReplicasCount > 1 ? 's' : ''}`;
    }
    return config.category;
  };

  const getHealthClass = () => {
    switch (config.health) {
      case 'down':
        return styles.healthDown;
      case 'degraded':
        return styles.healthDegraded;
      case 'overloaded':
        return styles.healthOverloaded;
      default:
        return styles.healthHealthy;
    }
  };

  return (
    <div
      className={`${styles.nodeContainer} ${selected ? styles.selected : ''} ${isDown ? styles.isDownContainer : ''}`}
      style={{
        borderLeftColor: categoryColor,
        borderLeftWidth: '3px',
      }}
      onClick={() => selectNode(id)}
    >
      {/* Floating Action Toolbar on Canvas Selection */}
      {selected && (
        <div className={styles.floatingToolbar} onClick={(e) => e.stopPropagation()}>
          <button
            className={styles.floatingBtn}
            onClick={handleDuplicate}
            title="Duplicate Component (Ctrl+D)"
          >
            <Copy size={11} />
          </button>
          <button
            className={styles.floatingBtn}
            onClick={toggleHealth}
            title={isDown ? 'Restore to healthy' : 'Inject fault (mark down)'}
          >
            <Power size={11} color={isDown ? 'var(--error)' : 'inherit'} />
          </button>
          <button
            className={styles.floatingBtn}
            onClick={handleOpenConfig}
            title="Configure in Properties Panel"
          >
            <Settings size={11} />
          </button>
          <button
            className={`${styles.floatingBtn} ${styles.floatingBtnDanger}`}
            onClick={handleDelete}
            title="Delete Component (Delete)"
          >
            <Trash2 size={11} />
          </button>
        </div>
      )}

      <Handle type="target" position={Position.Left} className={styles.customHandle} />

      <div className={styles.categoryStripe} style={{ backgroundColor: categoryColor }} />

      {hasBottleneck && (
        <div
          className={styles.bottleneckWarning}
          title={
            bottlenecks
              .filter((b) => b.nodeId === id)
              .map((b) => b.title)
              .join(' | ') || 'Bottleneck detected'
          }
        >
          <AlertTriangle size={10} />
        </div>
      )}

      <div className={styles.nodeBody}>
        <div className={styles.nodeHeader}>
          <div className={styles.iconAndTitle}>
            <div
              className={styles.iconBox}
              style={{
                color: categoryColor,
                backgroundColor: `${categoryColor}18`,
              }}
            >
              <ComponentIcon type={config.type} size={15} />
            </div>
            <div className={styles.titleArea}>
              <span className={styles.nodeName}>{config.name}</span>
              <span className={styles.nodeType}>{config.type.replace('_', ' ')}</span>
            </div>
          </div>
          <div
            className={`${styles.healthBadge} ${getHealthClass()}`}
            title={`Status: ${config.health}`}
          />
        </div>

        {/* Live Telemetry Pill Bar during active simulation */}
        {isSimActive && nodeMetric && nodeMetric.totalRequests > 0 && (
          <div className={styles.telemetryRow}>
            <div className={styles.telemetryPill} title="Throughput QPS">
              <Zap size={9} color="var(--accent-primary)" />
              <span>{nodeMetric.qps}</span>
            </div>
            <div className={styles.telemetryPill} title="p95 Latency">
              <Clock size={9} color="var(--text-muted)" />
              <span>{nodeMetric.p95LatencyMs}ms</span>
            </div>
            <div
              className={`${styles.telemetryPill} ${
                nodeMetric.utilizationPercent > 85
                  ? styles.utilCritical
                  : nodeMetric.utilizationPercent > 60
                    ? styles.utilWarning
                    : styles.utilNormal
              }`}
              title="Capacity Utilization"
            >
              <Activity size={9} />
              <span>{nodeMetric.utilizationPercent}%</span>
            </div>
            {nodeMetric.activeConnections > 0 && (
              <div className={styles.telemetryPill} title="Active Connections">
                <Link2 size={9} color="var(--text-muted)" />
                <span>{nodeMetric.activeConnections}</span>
              </div>
            )}
          </div>
        )}

        <div className={styles.nodeFooter}>
          <span className={styles.badgeTag}>{getSubtext()}</span>

          <div className={styles.quickActions}>
            <button
              className={styles.actionBtn}
              onClick={handleOpenConfig}
              title="Configure properties"
            >
              <Settings size={11} />
            </button>
            <button
              className={styles.actionBtn}
              onClick={toggleHealth}
              title={isDown ? 'Restore to healthy' : 'Inject failure (mark down)'}
            >
              <Power size={11} color={isDown ? 'var(--error)' : 'var(--text-muted)'} />
            </button>
            <button
              className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
              onClick={handleDelete}
              title="Delete component"
            >
              <Trash2 size={11} />
            </button>
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className={styles.customHandle} />
    </div>
  );
};
