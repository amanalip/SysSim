import React, { useState, useEffect, useRef } from 'react';
import { Bookmark, X, Save, Upload, Trash2, Clock, Download, FileUp } from 'lucide-react';
import { useStore, CanvasNode, CanvasEdge } from '../../store/use-store';
import { simulationRuntime as simBridge } from '../../engine/simulation-runtime';
import { APPLICATION_VERSION, ARCHITECTURE_SCHEMA_VERSION } from '../../model/architecture-schema';
import { emptySnapshotSlot, exportSnapshotSlots, importSnapshotSlots, parseSnapshotSlots, persistSnapshotSlots, SNAPSHOT_STORAGE_KEY, SnapshotSlot } from '../../model/snapshot-storage';
import styles from './SnapshotManagerModal.module.css';

interface SnapshotManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SnapshotManagerModal: React.FC<SnapshotManagerModalProps> = ({ isOpen, onClose }) => {
  const { nodes, edges, zones, trafficConfig, setTrafficConfig, loadCanvasState, addToast } = useStore();
  const [slots, setSlots] = useState<SnapshotSlot[]>([]);
  const [customNames, setCustomNames] = useState<Record<number, string>>({});
  const importInputRef = useRef<HTMLInputElement>(null);

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
      setSlots(parseSnapshotSlots(localStorage.getItem(SNAPSHOT_STORAGE_KEY)));
    } catch (error) {
      setSlots(parseSnapshotSlots(null));
      addToast(`Could not read snapshots: ${error instanceof Error ? error.message : 'storage unavailable'}`, 'error');
    }
  }, [isOpen]);

  const saveSlotsToStorage = (updated: SnapshotSlot[]): boolean => {
    try {
      persistSnapshotSlots(localStorage, updated);
      setSlots(updated);
      return true;
    } catch (error) {
      addToast(`Snapshot storage failed${error instanceof DOMException && error.name === 'QuotaExceededError' ? ': browser quota exceeded' : ''}`, 'error');
      return false;
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
          schemaVersion: ARCHITECTURE_SCHEMA_VERSION,
          applicationVersion: APPLICATION_VERSION,
          restorationMode: 'architecture-and-traffic-reset-simulation' as const,
          corrupted: false,
          corruptionReason: undefined,
        };
      }
      return s;
    });

    if (saveSlotsToStorage(updated)) addToast(`Saved canvas design to Slot ${slotId}`, 'success');
  };

  const handleLoadFromSlot = (slot: SnapshotSlot) => {
    if (!slot.nodes || slot.nodes.length === 0) {
      addToast(`Slot ${slot.id} is empty`, 'warning');
      return;
    }

    simBridge.reset();
    loadCanvasState(slot.nodes as CanvasNode[], (slot.edges || []) as CanvasEdge[], slot.zones || []);
    if (slot.trafficConfig) {
      setTrafficConfig(slot.trafficConfig);
      simBridge.syncConfig(slot.trafficConfig);
    }
    addToast(`Loaded ${slot.name} to canvas`, 'success');
    onClose();
  };

  const handleClearSlot = (slotId: number) => {
    const updated = slots.map((s) => {
      if (s.id === slotId) {
        return emptySnapshotSlot(slotId);
      }
      return s;
    });

    if (saveSlotsToStorage(updated)) addToast(`Cleared Snapshot Slot ${slotId}`, 'info');
  };

  const handleExportAll = () => {
    const url = URL.createObjectURL(new Blob([exportSnapshotSlots(slots)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `syssim-snapshots-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    addToast('Exported all snapshot slots', 'success');
  };

  const handleImportAll = async (file: File) => {
    try {
      const imported = importSnapshotSlots(await file.text());
      if (saveSlotsToStorage(imported)) addToast('Imported and validated all snapshot slots', 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Snapshot import failed', 'error');
    }
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
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close snapshot manager">
            <X size={15} />
          </button>
        </div>

        <div className={styles.slotActions}>
          <button className={styles.saveBtn} onClick={handleExportAll} title="Export all snapshot slots as JSON">
            <Download size={12} /><span>Export all</span>
          </button>
          <button className={styles.loadBtn} onClick={() => importInputRef.current?.click()} title="Import all snapshot slots from JSON">
            <FileUp size={12} /><span>Import all</span>
          </button>
          <input ref={importInputRef} type="file" accept="application/json,.json" hidden onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleImportAll(file);
            event.currentTarget.value = '';
          }} />
        </div>

        <div className={styles.slotsList}>
          {slots.map((slot) => {
            const hasData = slot.timestamp !== null && !slot.corrupted;
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
                        if (customNames[slot.id] !== undefined) {
                          const normalized = customNames[slot.id].trim();
                          const updated = slots.map((s) =>
                            s.id === slot.id ? { ...s, name: normalized || `Architecture Snapshot ${slot.id}` } : s
                          );
                          saveSlotsToStorage(updated);
                        }
                      }}
                      placeholder={`Snapshot ${slot.id}`}
                    />
                    <div className={styles.slotMeta}>
                      {slot.corrupted ? (
                        <span className={styles.emptyLabel}>Corrupted: {slot.corruptionReason}</span>
                      ) : hasData ? (
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

                  {(hasData || slot.corrupted) && (
                    <>
                      {hasData ? <button
                        className={styles.loadBtn}
                        onClick={() => handleLoadFromSlot(slot)}
                        title="Load this snapshot onto canvas"
                      >
                        <Upload size={12} />
                        <span>Load</span>
                      </button> : null}
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
