import React, { useState, useEffect } from 'react';
import { Bookmark, X, Save, Upload, Trash2, Clock } from 'lucide-react';
import { useStore, CanvasNode, CanvasEdge } from '../../store/use-store';
import { TrafficConfig, ZoneData } from '../../model/types';
import { simBridge } from '../../engine/sim-bridge';
import styles from './SnapshotManagerModal.module.css';

interface SnapshotSlot {
  id: number;
  name: string;
  timestamp: number | null;
  nodeCount: number;
  edgeCount: number;
  nodes?: CanvasNode[];
  edges?: CanvasEdge[];
  zones?: ZoneData[];
  trafficConfig?: TrafficConfig;
}

const STORAGE_KEY = 'syssim_architecture_snapshots';

interface SnapshotManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SnapshotManagerModal: React.FC<SnapshotManagerModalProps> = ({ isOpen, onClose }) => {
  const { nodes, edges, zones, trafficConfig, setTrafficConfig, loadCanvasState, addToast } = useStore();
  const [slots, setSlots] = useState<SnapshotSlot[]>([]);
  const [customNames, setCustomNames] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setSlots(JSON.parse(saved));
      } else {
        // Initialize 5 empty slots
        const initialSlots: SnapshotSlot[] = Array.from({ length: 5 }, (_, i) => ({
          id: i + 1,
          name: `Architecture Snapshot ${i + 1}`,
          timestamp: null,
          nodeCount: 0,
          edgeCount: 0,
        }));
        setSlots(initialSlots);
      }
    } catch {
      // safe fallback
    }
  }, [isOpen]);

  const saveSlotsToStorage = (updated: SnapshotSlot[]) => {
    setSlots(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // safe fallback
    }
  };

  const handleSaveToSlot = (slotId: number) => {
    if (nodes.length === 0) {
      addToast('Cannot save an empty canvas to snapshot slot', 'warning');
      return;
    }

    const updated = slots.map((s) => {
      if (s.id === slotId) {
        return {
          ...s,
          name: customNames[slotId]?.trim() || s.name,
          timestamp: Date.now(),
          nodeCount: nodes.length,
          edgeCount: edges.length,
          nodes: JSON.parse(JSON.stringify(nodes)),
          edges: JSON.parse(JSON.stringify(edges)),
          zones: JSON.parse(JSON.stringify(zones)),
          trafficConfig: JSON.parse(JSON.stringify(trafficConfig)),
        };
      }
      return s;
    });

    saveSlotsToStorage(updated);
    addToast(`Saved canvas design to Slot ${slotId}`, 'success');
  };

  const handleLoadFromSlot = (slot: SnapshotSlot) => {
    if (!slot.nodes || slot.nodes.length === 0) {
      addToast(`Slot ${slot.id} is empty`, 'warning');
      return;
    }

    simBridge.reset();
    loadCanvasState(slot.nodes, slot.edges || [], slot.zones || []);
    if (slot.trafficConfig) {
      setTrafficConfig(slot.trafficConfig);
      simBridge.syncConfig(slot.trafficConfig);
    }
    simBridge.syncGraph();
    addToast(`Loaded ${slot.name} to canvas`, 'success');
    onClose();
  };

  const handleClearSlot = (slotId: number) => {
    const updated = slots.map((s) => {
      if (s.id === slotId) {
        return {
          id: slotId,
          name: `Architecture Snapshot ${slotId}`,
          timestamp: null,
          nodeCount: 0,
          edgeCount: 0,
        };
      }
      return s;
    });

    saveSlotsToStorage(updated);
    addToast(`Cleared Snapshot Slot ${slotId}`, 'info');
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.titleGroup}>
            <div className={styles.iconBadge}>
              <Bookmark size={16} color="var(--accent-primary)" />
            </div>
            <div>
              <div className={styles.modalTitle}>Architecture Snapshots Manager</div>
              <div className={styles.modalSubtitle}>
                Save and recall multi-slot architecture checkpoints locally
              </div>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        <div className={styles.slotsList}>
          {slots.map((slot) => {
            const hasData = slot.timestamp !== null;
            return (
              <div
                key={slot.id}
                className={`${styles.slotCard} ${hasData ? styles.slotCardFilled : ''}`}
              >
                <div className={styles.slotLeft}>
                  <div className={styles.slotBadge}>#{slot.id}</div>
                  <div className={styles.slotInfo}>
                    <input
                      type="text"
                      className={styles.slotNameInput}
                      value={customNames[slot.id] ?? slot.name}
                      onChange={(e) =>
                        setCustomNames((prev) => ({ ...prev, [slot.id]: e.target.value }))
                      }
                      onBlur={() => {
                        if (customNames[slot.id]) {
                          const updated = slots.map((s) =>
                            s.id === slot.id ? { ...s, name: customNames[slot.id].trim() } : s
                          );
                          saveSlotsToStorage(updated);
                        }
                      }}
                      placeholder={`Snapshot ${slot.id}`}
                    />
                    <div className={styles.slotMeta}>
                      {hasData ? (
                        <>
                          <span className={styles.statPill}>
                            {slot.nodeCount} nodes • {slot.edgeCount} links
                          </span>
                          <span className={styles.datePill}>
                            <Clock size={10} />
                            {new Date(slot.timestamp!).toLocaleTimeString()}
                          </span>
                        </>
                      ) : (
                        <span className={styles.emptyLabel}>Empty Slot</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className={styles.slotActions}>
                  <button
                    className={styles.saveBtn}
                    onClick={() => handleSaveToSlot(slot.id)}
                    title="Save current canvas state to this slot"
                  >
                    <Save size={12} />
                    <span>Save</span>
                  </button>

                  {hasData && (
                    <>
                      <button
                        className={styles.loadBtn}
                        onClick={() => handleLoadFromSlot(slot)}
                        title="Load this snapshot onto canvas"
                      >
                        <Upload size={12} />
                        <span>Load</span>
                      </button>
                      <button
                        className={styles.clearBtn}
                        onClick={() => handleClearSlot(slot.id)}
                        title="Clear this snapshot slot"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
