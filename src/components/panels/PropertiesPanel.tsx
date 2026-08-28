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
  ClientOperationType,
  DeliveryGuarantee,
  LoadBalancerAlgorithm,
  MessageOrdering,
  NodeHealthStatus,
  RateLimiterAlgorithm,
  RequestKeyDistribution,
  QueueOverflowPolicy,
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
  const isCacheConfig = ['redis_cache', 'local_cache', 'cdn_cache', 'browser_cache'].includes(config.type);
  const isMessagingConfig = ['message_queue', 'task_queue', 'pubsub', 'event_bus'].includes(config.type);

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
                <span>Cache Hit Target</span>
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

          {isCacheConfig && 'requestCoalescingEnabled' in config && (
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Stampede Mitigation</label>
              <button
                type="button"
                className={`${styles.actionBtn} ${config.requestCoalescingEnabled ? styles.coalescingActive : ''}`}
                aria-pressed={config.requestCoalescingEnabled}
                onClick={() => updateNodeConfig(config.id, {
                  requestCoalescingEnabled: !config.requestCoalescingEnabled,
                } as Partial<typeof config>)}
              >
                Request coalescing {config.requestCoalescingEnabled ? 'ON' : 'OFF'}
              </button>
              <p className={styles.fieldHint}>
                Coalesces concurrent misses for the same key behind one origin fill.
              </p>
            </div>
          )}

          {isCacheConfig && 'ttlSec' in config && (
            <div className={styles.fieldGroup}>
              <div className={styles.fieldLabel}>
                <span>Entry TTL</span>
                <span className={styles.fieldValueBadge}>{config.ttlSec}s</span>
              </div>
              <input
                type="number"
                min="1"
                className={styles.input}
                value={config.ttlSec}
                onChange={(event) => updateNodeConfig(config.id, {
                  ttlSec: Math.max(1, parseInt(event.target.value, 10) || 1),
                } as Partial<typeof config>)}
              />
            </div>
          )}

          {isCacheConfig && 'readLatencyMs' in config && (
            <div className={styles.fieldGroup}>
              <div className={styles.fieldLabel}>
                <span>Cache Read Latency</span>
                <span className={styles.fieldValueBadge}>{config.readLatencyMs}ms</span>
              </div>
              <input
                type="number"
                min="0"
                step="0.1"
                className={styles.input}
                value={config.readLatencyMs}
                onChange={(event) => updateNodeConfig(config.id, {
                  readLatencyMs: Math.max(0, Number(event.target.value) || 0),
                } as Partial<typeof config>)}
              />
            </div>
          )}

          {isCacheConfig && 'sizeMb' in config && (
            <>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Cache Capacity (MB)</label>
                <input
                  type="number"
                  min="1"
                  className={styles.input}
                  value={config.sizeMb}
                  onChange={(event) => updateNodeConfig(config.id, {
                    sizeMb: Math.max(1, parseInt(event.target.value, 10) || 1),
                  } as Partial<typeof config>)}
                />
              </div>
              {'entrySizeKb' in config ? (
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Average Entry Size (KB)</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    className={styles.input}
                    value={config.entrySizeKb}
                    onChange={(event) => updateNodeConfig(config.id, {
                      entrySizeKb: Math.max(0.1, Number(event.target.value) || 0.1),
                    } as Partial<typeof config>)}
                  />
                </div>
              ) : null}
            </>
          )}

          {config.type === 'browser_cache' ? (
            <p className={styles.fieldHint}>Browser entries are isolated per client and terminate before a network request on hit.</p>
          ) : config.type === 'cdn_cache' ? (
            <p className={styles.fieldHint}>CDN entries are shared at the edge and forward misses to the configured origin fallback.</p>
          ) : null}

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

          {/* Auth Service Token Type & TTL */}
          {config.type === 'auth_service' && (
            <>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Token Type</label>
                <select
                  className={styles.select}
                  value={config.tokenType}
                  onChange={(e) =>
                    updateNodeConfig(config.id, {
                      tokenType: e.target.value as any,
                    })
                  }
                >
                  <option value="JWT">JWT (JSON Web Token)</option>
                  <option value="Paseto">Paseto (Platform-Agnostic Security Tokens)</option>
                  <option value="Session">Opaque Session ID</option>
                </select>
              </div>

              <div className={styles.fieldGroup}>
                <div className={styles.fieldLabel}>
                  <span>Token TTL (Minutes)</span>
                  <span className={styles.fieldValueBadge}>{config.ttlMinutes}m</span>
                </div>
                <input
                  type="number"
                  className={styles.input}
                  value={config.ttlMinutes}
                  onChange={(e) =>
                    updateNodeConfig(config.id, {
                      ttlMinutes: parseInt(e.target.value, 10) || 60,
                    })
                  }
                />
              </div>
            </>
          )}

          {/* Encryption Service Algorithm & Key Rotation */}
          {config.type === 'encryption_service' && (
            <>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Cipher Algorithm</label>
                <select
                  className={styles.select}
                  value={config.algorithm}
                  onChange={(e) =>
                    updateNodeConfig(config.id, {
                      algorithm: e.target.value as any,
                    })
                  }
                >
                  <option value="AES-256-GCM">AES-256-GCM (Authenticated)</option>
                  <option value="ChaCha20-Poly1305">ChaCha20-Poly1305 (Fast Stream)</option>
                  <option value="RSA-4096">RSA-4096 (Asymmetric PKI)</option>
                </select>
              </div>

              <div className={styles.fieldGroup}>
                <div className={styles.fieldLabel}>
                  <span>Key Rotation (Days)</span>
                  <span className={styles.fieldValueBadge}>{config.keyRotationDays}d</span>
                </div>
                <input
                  type="number"
                  className={styles.input}
                  value={config.keyRotationDays}
                  onChange={(e) =>
                    updateNodeConfig(config.id, {
                      keyRotationDays: parseInt(e.target.value, 10) || 90,
                    })
                  }
                />
              </div>
            </>
          )}

          {/* Serverless Function Configuration */}
          {config.type === 'serverless' && (
            <>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Base Execution Latency (ms)</label>
                <input type="number" min="1" className={styles.input} value={config.baseExecutionLatencyMs}
                  onChange={(e) => updateNodeConfig(config.id, { baseExecutionLatencyMs: Math.max(1, Number(e.target.value) || 1) })} />
                <p className={styles.fieldHint}>512 MB baseline; memory changes modeled execution time.</p>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Provisioned Warm Instances</label>
                <input type="number" min="0" max={config.concurrencyLimit} className={styles.input} value={config.warmInstances}
                  onChange={(e) => updateNodeConfig(config.id, { warmInstances: Math.max(0, parseInt(e.target.value, 10) || 0) })} />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Warm Idle Timeout (sec)</label>
                <input type="number" min="1" className={styles.input} value={config.idleTimeoutSec}
                  onChange={(e) => updateNodeConfig(config.id, { idleTimeoutSec: Math.max(1, parseInt(e.target.value, 10) || 1) })} />
              </div>
              <div className={styles.fieldGroup}>
                <div className={styles.fieldLabel}>
                  <span>Allocated Memory (MB)</span>
                  <span className={styles.fieldValueBadge}>{config.memoryMb} MB</span>
                </div>
                <select
                  className={styles.select}
                  value={config.memoryMb}
                  onChange={(e) =>
                    updateNodeConfig(config.id, {
                      memoryMb: parseInt(e.target.value, 10) || 512,
                    })
                  }
                >
                  <option value="128">128 MB (Micro)</option>
                  <option value="256">256 MB (Small)</option>
                  <option value="512">512 MB (Standard)</option>
                  <option value="1024">1024 MB (1 GB)</option>
                  <option value="2048">2048 MB (2 GB Compute)</option>
                </select>
              </div>

              <div className={styles.fieldGroup}>
                <div className={styles.fieldLabel}>
                  <span>Execution Timeout (ms)</span>
                  <span className={styles.fieldValueBadge}>{config.timeoutMs} ms</span>
                </div>
                <input
                  type="number"
                  className={styles.input}
                  value={config.timeoutMs}
                  onChange={(e) =>
                    updateNodeConfig(config.id, {
                      timeoutMs: parseInt(e.target.value, 10) || 3000,
                    })
                  }
                />
              </div>

              <div className={styles.fieldGroup}>
                <div className={styles.fieldLabel}>
                  <span>Cold Start Latency (ms)</span>
                  <span className={styles.fieldValueBadge}>{config.coldStartLatencyMs} ms</span>
                </div>
                <input
                  type="number"
                  className={styles.input}
                  value={config.coldStartLatencyMs}
                  onChange={(e) =>
                    updateNodeConfig(config.id, {
                      coldStartLatencyMs: parseInt(e.target.value, 10) || 25,
                    })
                  }
                />
              </div>
            </>
          )}

          {config.type === 'worker' && (
            <>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Per-Replica Concurrency</label>
                <input type="number" min="1" className={styles.input} value={config.concurrencyLimit}
                  onChange={(e) => updateNodeConfig(config.id, { concurrencyLimit: Math.max(1, parseInt(e.target.value, 10) || 1) })} />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Per-Replica Processing Rate (/sec)</label>
                <input type="number" min="1" className={styles.input} value={config.jobProcessingRatePerSec}
                  onChange={(e) => updateNodeConfig(config.id, { jobProcessingRatePerSec: Math.max(1, Number(e.target.value) || 1) })} />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Processing Latency (ms)</label>
                <input type="number" min="0" className={styles.input} value={config.processingLatencyMs}
                  onChange={(e) => updateNodeConfig(config.id, { processingLatencyMs: Math.max(0, Number(e.target.value) || 0) })} />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Worker Retry Limit</label>
                <input type="number" min="0" className={styles.input} value={config.retryLimit}
                  onChange={(e) => updateNodeConfig(config.id, { retryLimit: Math.max(0, parseInt(e.target.value, 10) || 0) })} />
                <p className={styles.fieldHint}>The lower of broker and worker retry limits is enforced.</p>
              </div>
            </>
          )}

          {config.type === 'client' ? (
            <>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Traffic Share Weight (QPS)</label>
                <input
                  type="number"
                  min="0"
                  className={styles.input}
                  value={config.requestRateQps}
                  onChange={(event) => updateNodeConfig(config.id, {
                    requestRateQps: Math.max(0, Number(event.target.value) || 0),
                  })}
                />
                <p className={styles.fieldHint}>Global traffic QPS is the total load; client QPS values divide that total proportionally.</p>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Connection Type</label>
                <select
                  className={styles.select}
                  value={config.connectionType}
                  onChange={(event) => updateNodeConfig(config.id, {
                    connectionType: event.target.value as typeof config.connectionType,
                  })}
                >
                  <option value="HTTP/2">HTTP/2</option>
                  <option value="HTTP/3">HTTP/3</option>
                  <option value="WebSocket">WebSocket</option>
                </select>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Request Payload (KB)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  className={styles.input}
                  value={config.requestPayloadKb}
                  onChange={(event) => updateNodeConfig(config.id, {
                    requestPayloadKb: Math.max(0, Number(event.target.value) || 0),
                  })}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Operation Type</label>
                <select
                  className={styles.select}
                  value={config.operationType}
                  onChange={(event) => updateNodeConfig(config.id, {
                    operationType: event.target.value as ClientOperationType,
                  })}
                >
                  <option value="read">Read</option>
                  <option value="write">Write</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
              {config.operationType === 'mixed' ? (
                <div className={styles.fieldGroup}>
                  <div className={styles.fieldLabel}>
                    <span>Read Share</span>
                    <span className={styles.fieldValueBadge}>{config.readPercentage}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    className={styles.rangeInput}
                    value={config.readPercentage}
                    onChange={(event) => updateNodeConfig(config.id, {
                      readPercentage: parseInt(event.target.value, 10),
                    })}
                  />
                </div>
              ) : null}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Request Key Distribution</label>
                <select
                  className={styles.select}
                  value={config.requestKeyDistribution}
                  onChange={(event) => updateNodeConfig(config.id, {
                    requestKeyDistribution: event.target.value as RequestKeyDistribution,
                  })}
                >
                  <option value="uniform">Uniform</option>
                  <option value="zipfian">Zipfian / hot key</option>
                  <option value="custom">Global custom weights</option>
                </select>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Request Key Space</label>
                <input
                  type="number"
                  min="1"
                  className={styles.input}
                  value={config.requestKeySpaceSize}
                  onChange={(event) => updateNodeConfig(config.id, {
                    requestKeySpaceSize: Math.max(1, parseInt(event.target.value, 10) || 1),
                  })}
                />
              </div>
            </>
          ) : null}

          {isMessagingConfig ? (
            <>
              {'consumerGroups' in config ? (
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Consumer Groups</label>
                  <input
                    type="number"
                    min="1"
                    className={styles.input}
                    value={config.consumerGroups}
                    onChange={(event) => updateNodeConfig(config.id, {
                      consumerGroups: Math.max(1, parseInt(event.target.value, 10) || 1),
                    } as Partial<typeof config>)}
                  />
                  <p className={styles.fieldHint}>Each group receives one logical copy; members within a group share partitions.</p>
                </div>
              ) : null}

              {'subscribersPerTopic' in config ? (
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Subscribers per Topic</label>
                  <input
                    type="number"
                    min="1"
                    className={styles.input}
                    value={config.subscribersPerTopic}
                    onChange={(event) => updateNodeConfig(config.id, {
                      subscribersPerTopic: Math.max(1, parseInt(event.target.value, 10) || 1),
                    } as Partial<typeof config>)}
                  />
                </div>
              ) : null}

              {'fanoutFactor' in config ? (
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Fanout Factor</label>
                  <input
                    type="number"
                    min="1"
                    className={styles.input}
                    value={config.fanoutFactor}
                    onChange={(event) => updateNodeConfig(config.id, {
                      fanoutFactor: Math.max(1, parseInt(event.target.value, 10) || 1),
                    } as Partial<typeof config>)}
                  />
                </div>
              ) : null}

              {'deliveryGuarantee' in config ? (
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Delivery Guarantee</label>
                  <select
                    className={styles.select}
                    value={config.deliveryGuarantee}
                    onChange={(event) => updateNodeConfig(config.id, {
                      deliveryGuarantee: event.target.value as DeliveryGuarantee,
                    } as Partial<typeof config>)}
                  >
                    <option value="at_most_once">At most once</option>
                    <option value="at_least_once">At least once</option>
                    <option value="exactly_once">Exactly once (simulated deduplication)</option>
                  </select>
                </div>
              ) : null}

              {'orderingGuarantee' in config ? (
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Ordering Guarantee</label>
                  <select
                    className={styles.select}
                    value={config.orderingGuarantee}
                    onChange={(event) => updateNodeConfig(config.id, {
                      orderingGuarantee: event.target.value as MessageOrdering,
                    } as Partial<typeof config>)}
                  >
                    <option value="FIFO">Global FIFO</option>
                    <option value="Partition Key">Partition-key order</option>
                    <option value="None">No ordering</option>
                  </select>
                </div>
              ) : null}

              {'producerAckLatencyMs' in config ? (
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Producer Ack Latency (ms)</label>
                  <input
                    type="number"
                    min="0"
                    className={styles.input}
                    value={config.producerAckLatencyMs}
                    onChange={(event) => updateNodeConfig(config.id, {
                      producerAckLatencyMs: Math.max(0, Number(event.target.value) || 0),
                    } as Partial<typeof config>)}
                  />
                </div>
              ) : null}

              {'consumerProcessingLatencyMs' in config ? (
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Consumer Processing Latency (ms)</label>
                  <input
                    type="number"
                    min="1"
                    className={styles.input}
                    value={config.consumerProcessingLatencyMs}
                    onChange={(event) => updateNodeConfig(config.id, {
                      consumerProcessingLatencyMs: Math.max(1, Number(event.target.value) || 1),
                    } as Partial<typeof config>)}
                  />
                </div>
              ) : null}

              {'consumerThroughputPerSec' in config ? (
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Per-Partition Consumer Rate (/sec)</label>
                  <input
                    type="number"
                    min="1"
                    className={styles.input}
                    value={config.consumerThroughputPerSec}
                    onChange={(event) => updateNodeConfig(config.id, {
                      consumerThroughputPerSec: Math.max(1, parseInt(event.target.value, 10) || 1),
                    } as Partial<typeof config>)}
                  />
                </div>
              ) : null}

              {'retryLimit' in config ? (
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Retry Limit</label>
                  <input
                    type="number"
                    min="0"
                    className={styles.input}
                    value={config.retryLimit}
                    onChange={(event) => updateNodeConfig(config.id, {
                      retryLimit: Math.max(0, parseInt(event.target.value, 10) || 0),
                    } as Partial<typeof config>)}
                  />
                </div>
              ) : null}

              {'retryDelayMs' in config ? (
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Initial Retry Delay (ms)</label>
                  <input
                    type="number"
                    min="0"
                    className={styles.input}
                    value={config.retryDelayMs}
                    onChange={(event) => updateNodeConfig(config.id, {
                      retryDelayMs: Math.max(0, parseInt(event.target.value, 10) || 0),
                    } as Partial<typeof config>)}
                  />
                  <p className={styles.fieldHint}>Retries use deterministic exponential backoff.</p>
                </div>
              ) : null}

              {'deadLetterQueue' in config ? (
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Failed Delivery Destination</label>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    aria-pressed={config.deadLetterQueue}
                    onClick={() => updateNodeConfig(config.id, {
                      deadLetterQueue: !config.deadLetterQueue,
                    } as Partial<typeof config>)}
                  >
                    Dead-letter queue {config.deadLetterQueue ? 'ON' : 'OFF'}
                  </button>
                </div>
              ) : null}

              {'maxDepth' in config ? (
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Maximum Pending Deliveries</label>
                  <input
                    type="number"
                    min="1"
                    className={styles.input}
                    value={config.maxDepth}
                    onChange={(event) => updateNodeConfig(config.id, {
                      maxDepth: Math.max(1, parseInt(event.target.value, 10) || 1),
                    } as Partial<typeof config>)}
                  />
                </div>
              ) : null}
              {'retentionHours' in config ? (
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Retention (hours)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    className={styles.input}
                    value={config.retentionHours}
                    onChange={(event) => updateNodeConfig(config.id, {
                      retentionHours: Math.max(0, Number(event.target.value) || 0),
                    } as Partial<typeof config>)}
                  />
                </div>
              ) : null}
              {'overflowPolicy' in config ? (
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Overflow Policy</label>
                  <select
                    className={styles.select}
                    value={config.overflowPolicy}
                    onChange={(event) => updateNodeConfig(config.id, {
                      overflowPolicy: event.target.value as QueueOverflowPolicy,
                    } as Partial<typeof config>)}
                  >
                    <option value="reject_newest">Reject newest message</option>
                    <option value="drop_oldest">Drop oldest pending delivery</option>
                  </select>
                </div>
              ) : null}
            </>
          ) : null}

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
