import React from 'react';
import {
  Activity,
  Layers,
  Moon,
  Sun,
  X,
  Share2,
  Download,
  RotateCcw,
  BookOpen,
  LayoutGrid,
} from 'lucide-react';
import { useStore } from '../../store/use-store';
import styles from './Header.module.css';

interface HeaderProps {
  onShareClick?: () => void;
  onExportPngClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onShareClick,
  onExportPngClick,
}) => {
  const {
    theme,
    setTheme,
    activeScenario,
    closeScenario,
    clearCanvas,
    autoLayout,
    showReferenceOverlay,
    toggleReferenceOverlay,
    nodes,
    simState,
  } = useStore();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className={styles.header}>
      <div className={styles.leftSection}>
        <div className={styles.logo}>
          <Activity size={20} color="var(--accent-primary)" />
          <span>SysSim</span>
          <span className={styles.logoBadge}>Simulation Engine</span>
        </div>

        {activeScenario && (
          <div className={styles.activeScenarioBanner}>
            <BookOpen size={14} color="var(--accent-primary)" />
            <span>Scenario:</span>
            <span className={styles.scenarioTitle}>{activeScenario.title}</span>
            <button
              className={styles.closeScenarioBtn}
              onClick={closeScenario}
              title="Close Scenario"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      <div className={styles.centerSection}>
        {activeScenario && (
          <button
            className={`${styles.btn} ${showReferenceOverlay ? styles.btnPrimary : ''}`}
            onClick={toggleReferenceOverlay}
            title="Toggle Reference Architecture Overlay"
          >
            <Layers size={14} />
            <span>{showReferenceOverlay ? 'Hide Reference' : 'Show Reference'}</span>
          </button>
        )}
      </div>

      <div className={styles.rightSection}>
        <button
          className={styles.btn}
          onClick={autoLayout}
          disabled={nodes.length === 0}
          title="Auto-arrange components left to right"
        >
          <LayoutGrid size={14} />
          <span>Auto Layout</span>
        </button>

        <button
          className={styles.btn}
          onClick={clearCanvas}
          disabled={nodes.length === 0 || simState === 'running'}
          title="Clear all canvas components"
        >
          <RotateCcw size={14} />
          <span>Clear</span>
        </button>

        {onShareClick && (
          <button
            className={styles.btn}
            onClick={onShareClick}
            disabled={nodes.length === 0}
            title="Share architecture link"
          >
            <Share2 size={14} />
            <span>Share</span>
          </button>
        )}

        {onExportPngClick && (
          <button
            className={styles.btn}
            onClick={onExportPngClick}
            disabled={nodes.length === 0}
            title="Export architecture image"
          >
            <Download size={14} />
            <span>Export PNG</span>
          </button>
        )}

        <button
          className={styles.iconBtn}
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  );
};
