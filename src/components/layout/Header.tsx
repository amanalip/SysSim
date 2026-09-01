import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
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
  Flame,
  Layout,
  Bookmark,
  Menu,
  PanelLeft,
  ClipboardCopy,
  Accessibility,
} from 'lucide-react';
import { useStore } from '../../store/use-store';
import {
  encodeStateToUrlHash,
  exportArchitectureJson,
  exportCanvasToPng,
  applyImportedArchitecture,
  readArchitectureJson,
  PRACTICAL_SHARE_URL_LENGTH,
} from '../../utils/sharing';
import styles from './Header.module.css';
import { safeErrorMessage } from '../../errors/app-error';
import { downloadDiagnosticReport } from '../../diagnostics/diagnostic-report';
import { confirmCanvasReplacement } from '../../utils/destructive-actions';
import { BUILD_INFO } from '../../platform/build-info';

const ShortcutsModal = lazy(() =>
  import('../modals/ShortcutsModal').then((module) => ({ default: module.ShortcutsModal })),
);
const ChaosDrillModal = lazy(() =>
  import('../modals/ChaosDrillModal').then((module) => ({ default: module.ChaosDrillModal })),
);
const SnapshotManagerModal = lazy(() =>
  import('../modals/SnapshotManagerModal').then((module) => ({
    default: module.SnapshotManagerModal,
  })),
);

interface HeaderProps {
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isSidebarOpen = true, onToggleSidebar }) => {
  const {
    theme,
    setTheme,
    motionPreference,
    setMotionPreference,
    clearCanvas,
    autoLayout,
    addToast,
    nodes,
    edges,
    trafficConfig,
    simState,
    simulationRuntimeMode,
  } = useStore(
    useShallow((state) => ({
      theme: state.theme,
      setTheme: state.setTheme,
      motionPreference: state.motionPreference,
      setMotionPreference: state.setMotionPreference,
      clearCanvas: state.clearCanvas,
      autoLayout: state.autoLayout,
      addToast: state.addToast,
      nodes: state.nodes,
      edges: state.edges,
      trafficConfig: state.trafficConfig,
      simState: state.simState,
      simulationRuntimeMode: state.simulationRuntimeMode,
    })),
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isChaosDrillsOpen, setIsChaosDrillsOpen] = useState(false);
  const [isSnapshotsOpen, setIsSnapshotsOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);

  const handleClearCanvas = () => {
    if (confirmCanvasReplacement({ nodes: nodes.length, edges: edges.length }, 'Clear canvas')) {
      clearCanvas();
      addToast('Canvas cleared. Use Undo to restore it', 'info');
    }
  };

  useEffect(() => {
    if (!isActionsOpen) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key !== 'Escape') return;
      if (event instanceof MouseEvent && actionsRef.current?.contains(event.target as Node)) return;
      setIsActionsOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [isActionsOpen]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleShare = async () => {
    if (nodes.length === 0) {
      addToast('Construct an architecture on the canvas before sharing', 'warning');
      return;
    }
    try {
      const hash = encodeStateToUrlHash();
      const shareUrl = `${window.location.href.split('#')[0]}${hash}`;
      if (shareUrl.length > PRACTICAL_SHARE_URL_LENGTH) {
        addToast(
          'Architecture is too large for a reliable share URL. Use JSON Export instead',
          'warning',
        );
        return;
      }
      window.location.hash = hash;
      if (!navigator.clipboard?.writeText)
        throw new Error('Clipboard is unavailable. Copy the address from the browser bar');
      await navigator.clipboard.writeText(shareUrl);
      addToast(
        'Share link copied. It contains architecture data and may remain in history, logs, or referrers',
        'success',
      );
    } catch (error) {
      addToast(safeErrorMessage(error, 'user'), 'error');
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
    } catch (error: unknown) {
      addToast(safeErrorMessage(error, 'export'), 'error');
    }
  };

  const handleExportDiagnostics = () => {
    downloadDiagnosticReport({
      simulationSeed: trafficConfig.seed || 1,
      simulationState: simState,
      runtimeMode: simulationRuntimeMode,
      nodeCount: nodes.length,
      edgeCount: edges.length,
    });
    addToast('Privacy-safe diagnostic report downloaded', 'success');
  };

  const handleExportJson = () => {
    if (nodes.length === 0) {
      addToast('Canvas is empty. Add components before exporting', 'warning');
      return;
    }
    exportArchitectureJson();
    addToast('Architecture JSON exported', 'success');
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imported = await readArchitectureJson(file);
      const replace = confirmCanvasReplacement(
        { nodes: nodes.length, edges: edges.length },
        `Import ${imported.nodes.length} components, ${imported.edges.length} links, ${imported.zones?.length ?? 0} zones (schema v${imported.version}, app ${imported.appVersion ?? 'unknown'}) from “${file.name}”`,
      );
      if (replace) {
        applyImportedArchitecture(imported);
        addToast(
          'Architecture JSON imported successfully. Use Undo to restore the prior canvas',
          'success',
        );
      }
    } catch (error) {
      addToast(safeErrorMessage(error, 'persistence'), 'error');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.logoSection}>
        <button
          type="button"
          className={`${styles.iconBtn} ${styles.sidebarToggle}`}
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? 'Close design tools' : 'Open design tools'}
          aria-expanded={isSidebarOpen}
        >
          <PanelLeft size={18} />
        </button>
        <div className={styles.logoBadge}>
          <Sparkles size={16} color="#ffffff" />
        </div>
        <div className={styles.titleGroup}>
          <span className={styles.title}>SysSim</span>
          <span
            className={styles.version}
            title={`Engine ${BUILD_INFO.engineVersion} · build ${BUILD_INFO.commit}`}
          >
            v{BUILD_INFO.applicationVersion}
          </span>
          <span className={styles.subtitle}>Interactive System Design Simulator</span>
        </div>
        <span className={styles.graphCount}>
          {nodes.length} components • {edges.length} links
        </span>
      </div>

      <div className={styles.actionMenu} ref={actionsRef}>
        <button
          type="button"
          className={`${styles.iconBtn} ${styles.menuToggle}`}
          onClick={() => setIsActionsOpen((open) => !open)}
          aria-label="Architecture actions"
          aria-expanded={isActionsOpen}
          aria-controls="architecture-actions"
        >
          <Menu size={18} />
        </button>
        <div
          id="architecture-actions"
          className={`${styles.actionsSection} ${isActionsOpen ? styles.actionsOpen : ''}`}
          role={isActionsOpen ? 'menu' : undefined}
        >
          <button
            className={`${styles.actionBtn} ${styles.dangerAction}`}
            onClick={autoLayout}
            title="Topologically arrange components (L)"
          >
            <Layout size={13} />
            <span>Auto Layout</span>
          </button>

          <button
            className={styles.actionBtn}
            onClick={() => setIsSnapshotsOpen(true)}
            title="Manage multi-slot architecture snapshots"
          >
            <Bookmark size={13} color="var(--accent-primary)" />
            <span>Snapshots</span>
          </button>

          <button
            className={styles.actionBtn}
            onClick={() => setIsChaosDrillsOpen(true)}
            title="Run targeted Chaos Engineering drills"
          >
            <Flame size={13} />
            <span>Chaos Drills</span>
          </button>

          <button
            className={styles.actionBtn}
            onClick={handleClearCanvas}
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

          <button
            className={styles.actionBtn}
            onClick={handleExportDiagnostics}
            title={`Download privacy-safe diagnostics for app ${BUILD_INFO.applicationVersion}, engine ${BUILD_INFO.engineVersion}, build ${BUILD_INFO.commit}`}
          >
            <ClipboardCopy size={13} />
            <span>Diagnostics</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            hidden
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
            onClick={() =>
              setMotionPreference(motionPreference === 'reduced' ? 'system' : 'reduced')
            }
            title={
              motionPreference === 'reduced'
                ? 'Use system motion preference'
                : 'Reduce motion explicitly'
            }
            aria-pressed={motionPreference === 'reduced'}
            aria-label="Reduce motion"
          >
            <Accessibility size={15} />
          </button>

          <button
            className={styles.iconBtn}
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </div>

      <Suspense fallback={null}>
        {isShortcutsOpen ? (
          <ShortcutsModal isOpen onClose={() => setIsShortcutsOpen(false)} />
        ) : null}
        {isChaosDrillsOpen ? (
          <ChaosDrillModal isOpen onClose={() => setIsChaosDrillsOpen(false)} />
        ) : null}
        {isSnapshotsOpen ? (
          <SnapshotManagerModal isOpen onClose={() => setIsSnapshotsOpen(false)} />
        ) : null}
      </Suspense>
    </header>
  );
};
