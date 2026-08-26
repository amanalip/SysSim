import React, { useState } from 'react';
import { Flame, X, Database, Zap, Activity, Scissors, Clock, RotateCcw, AlertTriangle } from 'lucide-react';
import { useStore } from '../../store/use-store';
import { simBridge } from '../../engine/sim-bridge';
import styles from './ChaosDrillModal.module.css';

interface ChaosDrillModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Drill {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: React.ReactNode;
  execute: () => void;
}

export const ChaosDrillModal: React.FC<ChaosDrillModalProps> = ({ isOpen, onClose }) => {
  const [activeDrill, setActiveDrill] = useState<string | null>(null);
  const { nodes, edges, setNodeHealthOverride, toggleCutEdge, setTrafficConfig, trafficConfig, addToast } = useStore();

  if (!isOpen) return null;

  const drills: Drill[] = [
    {
      id: 'db_crash',
      name: 'Primary Database Outage',
      category: 'Storage Resilience',
      description: 'Crashes the primary SQL database to test automated read replica failover.',
      icon: <Database size={16} color="var(--error)" />,
      execute: () => {
        const db = nodes.find((n) => n.data.config.type === 'sql_db' || n.data.config.type === 'nosql_db');
        if (db) {
          setNodeHealthOverride(db.id, 'down');
          simBridge.syncGraph();
          setActiveDrill('db_crash');
          addToast(`Chaos Drill: Injected outage on ${db.data.config.name}`, 'error');
        } else {
          addToast('No database node found on canvas to inject fault', 'warning');
        }
      },
    },
    {
      id: 'cache_stampede',
      name: 'Cache Stampede / Flush',
      category: 'Caching Resilience',
      description: 'Brings down all cache nodes to observe database thundering herd overload.',
      icon: <Zap size={16} color="var(--warning)" />,
      execute: () => {
        const caches = nodes.filter((n) =>
          ['redis_cache', 'local_cache', 'cdn_cache', 'browser_cache'].includes(n.data.config.type)
        );
        if (caches.length > 0) {
          caches.forEach((c) => setNodeHealthOverride(c.id, 'down'));
          simBridge.syncGraph();
          setActiveDrill('cache_stampede');
          addToast(`Chaos Drill: Brought down ${caches.length} cache instances`, 'warning');
        } else {
          addToast('No cache nodes found on canvas', 'warning');
        }
      },
    },
    {
      id: 'flash_crowd',
      name: '5x Flash Crowd Surge',
      category: 'Traffic Spike',
      description: 'Multiplies inbound traffic 5x to test autoscaling capacity exhaustion.',
      icon: <Activity size={16} color="var(--accent-primary)" />,
      execute: () => {
        const currentQps = trafficConfig.baseQps || 500;
        const newQps = currentQps * 5;
        setTrafficConfig({ baseQps: newQps, pattern: 'spike' });
        simBridge.syncConfig({ baseQps: newQps, pattern: 'spike' });
        simBridge.syncGraph();
        setActiveDrill('flash_crowd');
        addToast(`Chaos Drill: Surged traffic to ${newQps} QPS!`, 'info');
      },
    },
    {
      id: 'network_partition',
      name: 'Ingress Network Partition',
      category: 'Network Partition',
      description: 'Cuts primary edge from client / gateway to simulate network disruption.',
      icon: <Scissors size={16} color="var(--error)" />,
      execute: () => {
        if (edges.length > 0) {
          if (!edges[0].data?.isCut) {
            toggleCutEdge(edges[0].id);
          }
          simBridge.syncGraph();
          setActiveDrill('network_partition');
          addToast(`Chaos Drill: Severed connection ${edges[0].id}`, 'error');
        } else {
          addToast('No active connections to sever', 'warning');
        }
      },
    },
    {
      id: 'latency_jitter',
      name: 'High Network Latency (400ms)',
      category: 'Degradation',
      description: 'Simulates cross-region WAN link degradation and packet delay.',
      icon: <Clock size={16} color="var(--warning)" />,
      execute: () => {
        const appServers = nodes.filter((n) => n.data.config.type === 'app_server');
        if (appServers.length > 0) {
          appServers.forEach((srv) => setNodeHealthOverride(srv.id, 'degraded'));
          simBridge.syncGraph();
          setActiveDrill('latency_jitter');
          addToast(`Chaos Drill: Injected 400ms latency overhead on ${appServers.length} servers`, 'warning');
        } else {
          addToast('No application servers found on canvas to inject latency', 'warning');
        }
      },
    },
  ];

  const handleRestore = () => {
    // Restore healthy node states
    nodes.forEach((n) => {
      if (n.data.config.health === 'down' || n.data.config.health === 'degraded') {
        setNodeHealthOverride(n.id, 'healthy');
      }
    });

    // Restore cut edges
    edges.forEach((e) => {
      if (e.data?.isCut) {
        toggleCutEdge(e.id);
      }
    });

    setTrafficConfig({ pattern: 'steady' });
    simBridge.syncConfig({ pattern: 'steady' });
    simBridge.syncGraph();
    setActiveDrill(null);
    addToast('Restored all system components and network links to healthy', 'success');
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.titleGroup}>
            <div className={styles.iconBadge}>
              <Flame size={16} color="var(--error)" />
            </div>
            <div>
              <div className={styles.modalTitle}>Chaos Engineering Drills</div>
              <div className={styles.modalSubtitle}>
                Targeted failure injection experiments to validate fault tolerance
              </div>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        {activeDrill && (
          <div className={styles.activeBanner}>
            <AlertTriangle size={14} color="var(--error)" />
            <span>Chaos experiment active! System resilience under test.</span>
            <button className={styles.restoreBtn} onClick={handleRestore}>
              <RotateCcw size={12} />
              <span>Restore System</span>
            </button>
          </div>
        )}

        <div className={styles.drillList}>
          {drills.map((drill) => (
            <div key={drill.id} className={styles.drillCard}>
              <div className={styles.cardLeft}>
                <div className={styles.drillIconBox}>{drill.icon}</div>
                <div className={styles.drillInfo}>
                  <div className={styles.drillHeaderRow}>
                    <span className={styles.drillName}>{drill.name}</span>
                    <span className={styles.drillCategory}>{drill.category}</span>
                  </div>
                  <span className={styles.drillDesc}>{drill.description}</span>
                </div>
              </div>
              <button
                className={styles.triggerBtn}
                onClick={drill.execute}
                title={`Launch ${drill.name}`}
              >
                Launch Drill
              </button>
            </div>
          ))}
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.restoreFooterBtn} onClick={handleRestore}>
            <RotateCcw size={13} />
            <span>Reset All Failure Injections</span>
          </button>
        </div>
      </div>
    </div>
  );
};
