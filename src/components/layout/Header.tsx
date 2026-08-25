import React, { useRef, useState } from 'react';
import {
  Share2,
  Download,
  Upload,
  Image as ImageIcon,
  Trash2,
  Sun,
  Moon,
  Sparkles,
  Keyboard,
} from 'lucide-react';
import { useStore } from '../../store/use-store';
import {
  encodeStateToUrlHash,
  exportArchitectureJson,
  exportCanvasToPng,
  importArchitectureJson,
} from '../../utils/sharing';
import { ShortcutsModal } from '../modals/ShortcutsModal';
import styles from './Header.module.css';

export const Header: React.FC = () => {
  const {
    theme,
    setTheme,
    clearCanvas,
    autoLayout,
    addToast,
    nodes,
  } = useStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleShare = async () => {
    if (nodes.length === 0) {
      addToast('Construct an architecture on the canvas before sharing', 'warning');
      return;
    }
    const hash = encodeStateToUrlHash();
    window.location.hash = hash;
    try {
      await navigator.clipboard.writeText(window.location.href);
      addToast('Shareable architecture link copied to clipboard', 'success');
    } catch {
      addToast('Failed to copy link automatically. URL updated in address bar', 'info');
    }
  };

  const handleExportPng = async () => {
    if (nodes.length === 0) {
      addToast('Canvas is empty. Add components before exporting', 'warning');
      return;
    }
    try {
      addToast('Generating architecture PNG...', 'info');
      await exportCanvasToPng();
      addToast('PNG export downloaded successfully', 'success');
    } catch (err: any) {
      addToast(`PNG export failed: ${err?.message || 'Unknown error'}`, 'error');
    }
  };

  const handleExportJson = () => {
    if (nodes.length === 0) {
      addToast('Canvas is empty. Add components before exporting', 'warning');
      return;
    }
    exportArchitectureJson();
    addToast('Architecture JSON exported', 'success');
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    importArchitectureJson(
      file,
      () => addToast('Architecture JSON imported successfully', 'success'),
      (msg) => addToast(msg, 'error')
    );

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.logoSection}>
        <div className={styles.logoBadge}>
          <Sparkles size={16} color="#ffffff" />
        </div>
        <div className={styles.titleGroup}>
          <span className={styles.title}>SysSim</span>
          <span className={styles.subtitle}>Interactive System Design Simulator</span>
        </div>
      </div>

      <div className={styles.actionsSection}>
        <button
          className={styles.actionBtn}
          onClick={autoLayout}
          title="Topologically arrange components (L)"
        >
          <span>Auto Layout</span>
        </button>

        <button
          className={styles.actionBtn}
          onClick={clearCanvas}
          title="Clear all components from canvas"
        >
          <Trash2 size={13} />
          <span>Clear</span>
        </button>

        <div className={styles.divider} />

        <button
          className={styles.actionBtn}
          onClick={handleShare}
          title="Copy shareable link encoded with architecture state"
        >
          <Share2 size={13} />
          <span>Share</span>
        </button>

        <button
          className={styles.actionBtn}
          onClick={handleExportPng}
          title="Export architecture as PNG screenshot"
        >
          <ImageIcon size={13} />
          <span>PNG</span>
        </button>

        <button
          className={styles.actionBtn}
          onClick={handleExportJson}
          title="Export architecture as JSON file"
        >
          <Download size={13} />
          <span>Export</span>
        </button>

        <button
          className={styles.actionBtn}
          onClick={() => fileInputRef.current?.click()}
          title="Import architecture from JSON file"
        >
          <Upload size={13} />
          <span>Import</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleImportFileChange}
        />

        <div className={styles.divider} />

        <button
          className={styles.iconBtn}
          onClick={() => setIsShortcutsOpen(true)}
          title="Keyboard shortcuts (?)"
        >
          <Keyboard size={15} />
        </button>

        <button
          className={styles.iconBtn}
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>

      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </header>
  );
};
