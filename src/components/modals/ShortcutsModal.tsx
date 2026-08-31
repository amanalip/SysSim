import React, { useRef } from 'react';
import { Keyboard, X } from 'lucide-react';
import styles from './ShortcutsModal.module.css';
import { useModalAccessibility } from './useModalAccessibility';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalAccessibility(isOpen, onClose, dialogRef);

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
    { label: 'Open Architecture Snapshot Manager', key: 'Ctrl + B / Cmd + B' },
    { label: 'Toggle Chaos Monkey Failure Mode', key: 'C' },
    { label: 'Toggle Real-Time Metrics Drawer', key: 'M' },
    { label: 'Switch to Palette / Scenarios / Calculator', key: '1 / 2 / 3' },
    { label: 'Open Keyboard Shortcuts Help', key: '?' },
  ];

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        ref={dialogRef}
        className={styles.modalContent}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div id="shortcuts-title" className={styles.modalTitle}>
            <Keyboard size={16} color="var(--accent-primary)" />
            <span>Keyboard Shortcuts</span>
          </div>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close keyboard shortcuts"
            title="Close shortcuts (Escape)"
          >
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
