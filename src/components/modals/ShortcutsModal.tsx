import React, { useEffect } from 'react';
import { Keyboard, X } from 'lucide-react';
import styles from './ShortcutsModal.module.css';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
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

  if (!isOpen) return null;

  const shortcuts = [
    { label: 'Start / Pause Simulation', key: 'Space' },
    { label: 'Open Command Palette', key: 'Ctrl + K / Cmd + K' },
    { label: 'Undo Canvas Action', key: 'Ctrl + Z / Cmd + Z' },
    { label: 'Redo Canvas Action', key: 'Ctrl + Shift + Z' },
    { label: 'Duplicate Selected Component', key: 'Ctrl + D / Cmd + D' },
    { label: 'Select All Components', key: 'Ctrl + A / Cmd + A' },
    { label: 'Delete Selected Component / Edge', key: 'Delete / Backspace' },
    { label: 'Compute Topological Auto Layout', key: 'L' },
    { label: 'Toggle Chaos Monkey Failure Mode', key: 'C' },
    { label: 'Toggle Real-Time Metrics Drawer', key: 'M' },
    { label: 'Switch to Palette / Scenarios / Calculator', key: '1 / 2 / 3' },
    { label: 'Open Keyboard Shortcuts Help', key: '?' },
  ];

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            <Keyboard size={16} color="var(--accent-primary)" />
            <span>Keyboard Shortcuts</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose} title="Close shortcuts (Escape)">
            <X size={15} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {shortcuts.map((s, idx) => (
            <div key={idx} className={styles.shortcutRow}>
              <span className={styles.shortcutLabel}>{s.label}</span>
              <span className={styles.keyBadge}>{s.key}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
