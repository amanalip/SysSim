import React from 'react';
import {
  X,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { useStore } from '../../store/use-store';
import { ComponentIcon } from '../icons/ComponentIcon';
import { createDefaultConfig } from '../../model/component-defaults';
import {
  CacheEvictionPolicy,
  LoadBalancerAlgorithm,
  NodeHealthStatus,
  RateLimiterAlgorithm,
} from '../../model/types';
import styles from './PropertiesPanel.module.css';

export const PropertiesPanel: React.FC = () => {
  const {
    nodes,
    selectedNodeId,
    selectNode,
    updateNodeConfig,
    removeNode,
    setNodeHealthOverride,
    isPropertiesPanelOpen,
    setIsPropertiesPanelOpen,
  } = useStore();

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  React.useEffect(() => {
    if (!isPropertiesPanelOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPropertiesPanelOpen(false);
        selectNode(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPropertiesPanelOpen, setIsPropertiesPanelOpen, selectNode]);

  if (!isPropertiesPanelOpen || !selectedNode) {
    return null;
  }

  const config = selectedNode.data.config;

  const handleClose = () => {
    setIsPropertiesPanelOpen(false);
    selectNode(null);
  };

  const handleResetDefaults = () => {
    const defaultConfig = createDefaultConfig(config.type, config.id, config.name);
    updateNodeConfig(config.id, defaultConfig);
  };

  const handleDelete = () => {
    removeNode(config.id);
  };

  const handleHealthChange = (health: NodeHealthStatus) => {
    setNodeHealthOverride(config.id, health);
  };

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div className={styles.headerLeft}>
          <ComponentIcon type={config.type} size={16} color="var(--accent-primary)" />
          <span className={styles.headerTitle}>Properties</span>
        </div>
        <button className={styles.closeBtn} onClick={handleClose} title="Close properties panel">
          <X size={15} />
        </button>
      </div>

      <div className={styles.panelBody}>
        {/* Basic Information */}
        <div className={styles.section}>
          <div className={styles.sectionLabel}>General</div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Component Name</label>
            <input
              type="text"
              className={styles.input}
              value={config.name}
              onChange={(e) => updateNodeConfig(config.id, { name: e.target.value })}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Health Status</label>
            <div className={styles.healthSelector}>
              {(['healthy', 'degraded', 'down', 'overloaded'] as NodeHealthStatus[]).map((status) => (
                <button
                  key={status}
                  className={`${styles.healthOption} ${
                    config.health === status ? styles.healthOptionActive : ''
                  }`}
                  onClick={() => handleHealthChange(status)}
                >
                  <span
                    className={styles.healthDot}
                    style={{
                      backgroundColor:
                        status === 'healthy'
                          ? 'var(--success)'
                          : status === 'degraded'
                          ? 'var(--warning)'
                          : status === 'down'
                          ? 'var(--error)'
                          : '#f97316',
                    }}
                  />
                  <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Component Specific Config */}
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Configuration</div>

          {/* Replicas (if applicable) */}
          {'replicas' in config && (
            <div className={styles.fieldGroup}>
              <div className={styles.fieldLabel}>
                <span>Replicas</span>
                <span className={styles.fieldValueBadge}>{config.replicas}</span>
              </div>
              <div className={styles.rangeContainer}>
                <input
                  type="range"
                  min="1"
                  max="20"
                  className={styles.rangeInput}
                  value={config.replicas}
                  onChange={(e) =>
                    updateNodeConfig(config.id, { replicas: parseInt(e.target.value, 10) })
                  }
                />
              </div>
            </div>
          )}

          {/* Processing / Base Latency */}
          {('processingLatencyMs' in config ||
            'baseLatencyMs' in config ||
            'latencyMs' in config ||
            'queryLatencyMs' in config) && (
            <div className={styles.fieldGroup}>
              <div className={styles.fieldLabel}>
                <span>Latency (ms)</span>
                <span className={styles.fieldValueBadge}>
                  {'processingLatencyMs' in config
                    ? config.processingLatencyMs
                    : 'baseLatencyMs' in config
                    ? config.baseLatencyMs
                    : 'latencyMs' in config
                    ? config.latencyMs
                    : (config as any).queryLatencyMs}{' '}
                  ms
                </span>
              </div>
              <div className={styles.rangeContainer}>
                <input
                  type="range"
                  min="1"
                  max="500"
                  className={styles.rangeInput}
                  value={
                    'processingLatencyMs' in config
                      ? config.processingLatencyMs
                      : 'baseLatencyMs' in config
                      ? config.baseLatencyMs
                      : 'latencyMs' in config
                      ? config.latencyMs
                      : (config as any).queryLatencyMs
                  }
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if ('processingLatencyMs' in config) {
                      updateNodeConfig(config.id, { processingLatencyMs: val });
                    } else if ('baseLatencyMs' in config) {
                      updateNodeConfig(config.id, { baseLatencyMs: val });
                    } else if ('latencyMs' in config) {
                      updateNodeConfig(config.id, { latencyMs: val });
                    } else {
                      updateNodeConfig(config.id, { queryLatencyMs: val } as any);
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* Load Balancer Algorithm */}
          {'algorithm' in config && config.type === 'load_balancer' && (
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Balancing Algorithm</label>
              <select
                className={styles.select}
                value={config.algorithm}
                onChange={(e) =>
                  updateNodeConfig(config.id, {
                    algorithm: e.target.value as LoadBalancerAlgorithm,
                  })
                }
              >
                <option value="round_robin">Round Robin</option>
                <option value="least_connections">Least Connections</option>
                <option value="consistent_hashing">Consistent Hashing</option>
                <option value="weighted">Weighted Round Robin</option>
                <option value="ip_hash">IP Hash</option>
              </select>
            </div>
          )}

          {/* Rate Limiter Algorithm & Limit */}
          {'algorithm' in config && config.type === 'rate_limiter' && (
            <>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Rate Limit Algorithm</label>
                <select
                  className={styles.select}
                  value={config.algorithm}
                  onChange={(e) =>
                    updateNodeConfig(config.id, {
                      algorithm: e.target.value as RateLimiterAlgorithm,
                    })
                  }
                >
                  <option value="token_bucket">Token Bucket</option>
                  <option value="sliding_window">Sliding Window Counter</option>
                  <option value="fixed_window">Fixed Window</option>
                  <option value="leaky_bucket">Leaky Bucket</option>
                </select>
              </div>

              <div className={styles.fieldGroup}>
                <div className={styles.fieldLabel}>
                  <span>Limit (QPS)</span>
                  <span className={styles.fieldValueBadge}>{config.limitQps}</span>
                </div>
                <input
                  type="number"
                  className={styles.input}
                  value={config.limitQps}
                  onChange={(e) =>
                    updateNodeConfig(config.id, { limitQps: parseInt(e.target.value, 10) || 100 })
                  }
                />
              </div>
            </>
          )}

          {/* Cache Hit Ratio */}
          {'hitRatioPercent' in config && (
            <div className={styles.fieldGroup}>
              <div className={styles.fieldLabel}>
                <span>Cache Hit Ratio</span>
                <span className={styles.fieldValueBadge}>{config.hitRatioPercent}%</span>
              </div>
              <div className={styles.rangeContainer}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  className={styles.rangeInput}
                  value={config.hitRatioPercent}
                  onChange={(e) =>
                    updateNodeConfig(config.id, {
                      hitRatioPercent: parseInt(e.target.value, 10),
                    })
                  }
                />
              </div>
            </div>
          )}

          {/* Cache Eviction Policy */}
          {'evictionPolicy' in config && (
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Eviction Policy</label>
              <select
                className={styles.select}
                value={config.evictionPolicy}
                onChange={(e) =>
                  updateNodeConfig(config.id, {
                    evictionPolicy: e.target.value as CacheEvictionPolicy,
                  })
                }
              >
                <option value="LRU">Least Recently Used (LRU)</option>
                <option value="LFU">Least Frequently Used (LFU)</option>
                <option value="TTL">Time to Live (TTL)</option>
                <option value="FIFO">First In First Out (FIFO)</option>
              </select>
            </div>
          )}

          {/* SQL DB Read Replicas */}
          {'readReplicasCount' in config && (
            <div className={styles.fieldGroup}>
              <div className={styles.fieldLabel}>
                <span>Read Replicas</span>
                <span className={styles.fieldValueBadge}>{config.readReplicasCount}</span>
              </div>
              <div className={styles.rangeContainer}>
                <input
                  type="range"
                  min="0"
                  max="10"
                  className={styles.rangeInput}
                  value={config.readReplicasCount}
                  onChange={(e) =>
                    updateNodeConfig(config.id, {
                      readReplicasCount: parseInt(e.target.value, 10),
                    })
                  }
                />
              </div>
            </div>
          )}

          {/* NoSQL Consistency Level */}
          {'consistencyLevel' in config && (
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Consistency Level</label>
              <select
                className={styles.select}
                value={config.consistencyLevel}
                onChange={(e) =>
                  updateNodeConfig(config.id, {
                    consistencyLevel: e.target.value as any,
                  })
                }
              >
                <option value="eventual">Eventual Consistency</option>
                <option value="strong">Strong Consistency</option>
                <option value="session">Session Consistency</option>
                <option value="bounded_staleness">Bounded Staleness</option>
              </select>
            </div>
          )}

          {/* Queue Partitions & Throughput */}
          {'partitions' in config && (
            <div className={styles.fieldGroup}>
              <div className={styles.fieldLabel}>
                <span>Partitions</span>
                <span className={styles.fieldValueBadge}>{config.partitions}</span>
              </div>
              <div className={styles.rangeContainer}>
                <input
                  type="range"
                  min="1"
                  max="32"
                  className={styles.rangeInput}
                  value={config.partitions}
                  onChange={(e) =>
                    updateNodeConfig(config.id, {
                      partitions: parseInt(e.target.value, 10),
                    })
                  }
                />
              </div>
            </div>
          )}

          {/* Max Connections (DB / Servers) */}
          {'maxConnections' in config && (
            <div className={styles.fieldGroup}>
              <div className={styles.fieldLabel}>
                <span>Max Connection Pool</span>
                <span className={styles.fieldValueBadge}>{config.maxConnections}</span>
              </div>
              <input
                type="number"
                className={styles.input}
                value={config.maxConnections}
                onChange={(e) =>
                  updateNodeConfig(config.id, {
                    maxConnections: parseInt(e.target.value, 10) || 100,
                  })
                }
              />
            </div>
          )}

          {/* Max Throughput Capacity (QPS) */}
          {'maxThroughputQps' in config && (
            <div className={styles.fieldGroup}>
              <div className={styles.fieldLabel}>
                <span>Max Capacity (QPS)</span>
                <span className={styles.fieldValueBadge}>{config.maxThroughputQps}</span>
              </div>
              <input
                type="number"
                className={styles.input}
                value={config.maxThroughputQps}
                onChange={(e) =>
                  updateNodeConfig(config.id, {
                    maxThroughputQps: parseInt(e.target.value, 10) || 1000,
                  })
                }
              />
            </div>
          )}

          {/* Failure Rate (%) */}
          {'failureRatePercent' in config && (
            <div className={styles.fieldGroup}>
              <div className={styles.fieldLabel}>
                <span>Failure Rate</span>
                <span className={styles.fieldValueBadge}>{config.failureRatePercent}%</span>
              </div>
              <div className={styles.rangeContainer}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  className={styles.rangeInput}
                  value={config.failureRatePercent}
                  onChange={(e) =>
                    updateNodeConfig(config.id, {
                      failureRatePercent: parseInt(e.target.value, 10),
                    })
                  }
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className={styles.footerActions}>
          <button
            className={styles.actionBtn}
            onClick={() => {
              useStore.getState().duplicateNode(config.id);
              useStore.getState().addToast(`Duplicated ${config.name}`, 'success');
            }}
            title="Duplicate component (Ctrl+D)"
          >
            <span>Duplicate</span>
          </button>
          <button
            className={styles.actionBtn}
            onClick={handleResetDefaults}
            title="Reset component settings to defaults"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>
          <button
            className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
            onClick={handleDelete}
            title="Remove component from canvas"
          >
            <Trash2 size={12} />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
};
