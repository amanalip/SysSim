import React, { useRef, useState } from 'react';
import {
  Flame,
  X,
  Database,
  Zap,
  Activity,
  Scissors,
  Clock,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { useStore } from '../../store/use-store';
import { chaosDrills, ChaosDrillId, ChaosDrillRecord } from '../../engine/chaos-drills';
import styles from './ChaosDrillModal.module.css';
import { useModalAccessibility } from './useModalAccessibility';
import { ModalPortal } from './ModalPortal';

interface ChaosDrillModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Drill {
  id: ChaosDrillId;
  name: string;
  category: string;
  description: string;
  icon: React.ReactNode;
  execute: () => void;
}

export const ChaosDrillModal: React.FC<ChaosDrillModalProps> = ({ isOpen, onClose }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalAccessibility(isOpen, onClose, dialogRef);
  const [activeDrill, setActiveDrill] = useState<ChaosDrillRecord | null>(
    () => chaosDrills.getActiveRecords()[0] || null,
  );
  const [stampedeProtection, setStampedeProtection] = useState(false);
  const addToast = useStore((state) => state.addToast);

  const launch = (id: ChaosDrillId) => {
    const result = chaosDrills.launch(id, { stampedeProtection });
    setActiveDrill(result.succeeded ? result : chaosDrills.getActiveRecords()[0] || null);
    addToast(result.observedResult, result.succeeded ? 'warning' : 'error');
  };

  if (!isOpen) return null;

  const drills: Drill[] = [
    {
      id: 'db_outage',
      name: 'Primary Database Outage',
      category: 'Storage Resilience',
      description:
        'Exercises internal SQL replica failover or a separately connected database target; fails explicitly when neither exists.',
      icon: <Database size={16} color="var(--error)" />,
      execute: () => launch('db_outage'),
    },
    {
      id: 'cache_stampede',
      name: 'Cache Stampede / Flush',
      category: 'Caching Resilience',
      description: `Forces 0% cache hits and origin traffic${stampedeProtection ? ' with miss coalescing protection' : ' without stampede protection'}.`,
      icon: <Zap size={16} color="var(--warning)" />,
      execute: () => launch('cache_stampede'),
    },
    {
      id: 'flash_crowd',
      name: '5x Flash Crowd Surge',
      category: 'Traffic Spike',
      description:
        'Multiplies base QPS exactly once while preserving the selected traffic pattern for exact restoration.',
      icon: <Activity size={16} color="var(--accent-primary)" />,
      execute: () => launch('flash_crowd'),
    },
    {
      id: 'ingress_partition',
      name: 'Ingress Network Partition',
      category: 'Network Partition',
      description:
        'Cuts a live request edge at the client or ingress tier, selected using component and edge semantics.',
      icon: <Scissors size={16} color="var(--error)" />,
      execute: () => launch('ingress_partition'),
    },
    {
      id: 'network_latency',
      name: 'High Network Latency (400ms)',
      category: 'Network Degradation',
      description:
        'Adds 400ms to active ingress request edges and restores their exact prior latency values.',
      icon: <Clock size={16} color="var(--warning)" />,
      execute: () => launch('network_latency'),
    },
  ];

  const handleRestore = () => {
    if (activeDrill?.succeeded) chaosDrills.restore(activeDrill.id);
    setActiveDrill(null);
    addToast('Restored the active drill to its exact pre-injection state', 'success');
  };

  return (
    <ModalPortal>
      <div className={styles.overlay}>
        <div
          ref={dialogRef}
          className={styles.modal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="chaos-drills-title"
          aria-describedby="chaos-drills-description"
          tabIndex={-1}
        >
          <div className={styles.modalHeader}>
            <div className={styles.titleGroup}>
              <div className={styles.iconBadge}>
                <Flame size={16} color="var(--error)" />
              </div>
              <div>
                <div id="chaos-drills-title" className={styles.modalTitle}>
                  Chaos Engineering Drills
                </div>
                <div id="chaos-drills-description" className={styles.modalSubtitle}>
                  Explore simplified failure states; results do not certify fault tolerance
                </div>
              </div>
            </div>
            <button
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Close chaos engineering drills"
            >
              <X size={15} />
            </button>
          </div>

          {activeDrill && (
            <div className={styles.activeBanner}>
              <AlertTriangle size={14} color="var(--error)" />
              <span>{activeDrill.observedResult}</span>
              <button className={styles.restoreBtn} onClick={handleRestore}>
                <RotateCcw size={12} />
                <span>Restore System</span>
              </button>
            </div>
          )}

          <div className={styles.drillList}>
            <label className={styles.protectionOption}>
              <input
                type="checkbox"
                checked={stampedeProtection}
                onChange={(event) => setStampedeProtection(event.target.checked)}
                disabled={Boolean(activeDrill)}
              />
              Compare cache stampede with request coalescing protection
            </label>
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
                  disabled={Boolean(activeDrill)}
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
              <span>Restore Active Drill</span>
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
