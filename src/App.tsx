import { lazy, Suspense, useEffect, useState } from 'react';
import { useStore, CanvasNode, CanvasEdge } from './store/use-store';
import { ZoneData } from './model/types';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { ComponentPalette } from './components/palette/ComponentPalette';
import { ArchitectureCanvas } from './components/canvas/ArchitectureCanvas';
import { PropertiesPanel } from './components/panels/PropertiesPanel';
import { SimulationControls } from './components/playback/SimulationControls';
import { EnvelopeCalculator } from './components/panels/EnvelopeCalculator';
import { ShortcutsModal } from './components/modals/ShortcutsModal';
import { ToastContainer } from './components/ui/Toast';
import { chaosRunner } from './engine/metrics/chaos-runner';
import {
  initializeSimulationRuntime,
  disposeSimulationRuntime,
  simulationRuntime as simBridge,
} from './engine/simulation-runtime';
import { decodeStateFromUrlHash } from './utils/sharing';
import { CORE_SCENARIOS } from './scenarios/core';
import { normalizeScenario } from './scenarios/normalize';
import styles from './App.module.css';

const MetricsDashboard = lazy(() =>
  import('./components/panels/MetricsDashboard').then((module) => ({
    default: module.MetricsDashboard,
  })),
);
const ScenarioManager = lazy(() =>
  import('./components/scenarios/ScenarioManager').then((module) => ({
    default: module.ScenarioManager,
  })),
);
const CommandPalette = lazy(() =>
  import('./components/modals/CommandPalette').then((module) => ({
    default: module.CommandPalette,
  })),
);

export function App() {
  const {
    theme,
    nodes,
    isChaosMode,
    setChaosMode,
    chaosIntervalSec,
    simState,
    loadCanvasState,
    loadScenario,
    loadReferenceDesign,
    setTrafficConfig,
    addToast,
    autoLayout,
    isBottomDrawerOpen,
    setIsBottomDrawerOpen,
  } = useStore();

  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth > 1100);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1101px)');
    const syncSidebar = (event: MediaQueryListEvent | MediaQueryList) =>
      setIsSidebarOpen(event.matches);
    syncSidebar(media);
    media.addEventListener('change', syncSidebar);
    return () => media.removeEventListener('change', syncSidebar);
  }, []);

  useEffect(() => {
    initializeSimulationRuntime();
    return () => disposeSimulationRuntime();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Decode URL hash state on initial boot or load starter architecture
  useEffect(() => {
    if (window.location.hash) {
      const decoded = decodeStateFromUrlHash(window.location.hash);
      if (decoded && decoded.nodes && decoded.edges) {
        loadCanvasState(
          decoded.nodes as unknown as CanvasNode[],
          decoded.edges as unknown as CanvasEdge[],
          (decoded.zones || []) as ZoneData[],
        );
        if (decoded.trafficConfig) {
          setTrafficConfig(decoded.trafficConfig);
        }
        addToast('Loaded shared architecture from URL', 'success');
        return;
      }
    }

    // Load initial starter architecture if canvas is empty
    if (nodes.length === 0) {
      const starter = normalizeScenario(CORE_SCENARIOS[0]); // URL Shortener
      loadScenario(starter);
      loadReferenceDesign(starter.referenceDesign);
    }
  }, []);

  // Chaos runner synchronization
  useEffect(() => {
    if (isChaosMode) {
      chaosRunner.start(chaosIntervalSec);
    } else {
      chaosRunner.stop();
    }
    return () => chaosRunner.stop();
  }, [isChaosMode, chaosIntervalSec]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Command Palette (Ctrl+K or Cmd+K) - works even if typing in some inputs
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      // Ignore standard single-key shortcuts when user is actively typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (simState === 'running') {
          simBridge.pause();
        } else if (simState === 'paused') {
          simBridge.resume();
        } else if (nodes.length > 0) {
          simBridge.start();
        }
        return;
      }

      if (e.key === 'l' || e.key === 'L') {
        if (!e.ctrlKey && !e.metaKey) {
          autoLayout();
          return;
        }
      }

      if (e.key === 'c' || e.key === 'C') {
        if (!e.ctrlKey && !e.metaKey) {
          setChaosMode(!isChaosMode);
          addToast(`Chaos mode ${!isChaosMode ? 'Enabled' : 'Disabled'}`, 'info');
          return;
        }
      }

      if (e.key === 'm' || e.key === 'M') {
        if (!e.ctrlKey && !e.metaKey) {
          setIsBottomDrawerOpen(!isBottomDrawerOpen);
          return;
        }
      }

      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === '1') {
          useStore.getState().setActiveSidebarTab('palette');
          return;
        }
        if (e.key === '2') {
          useStore.getState().setActiveSidebarTab('scenarios');
          return;
        }
        if (e.key === '3') {
          useStore.getState().setActiveSidebarTab('calculator');
          return;
        }
      }

      if (e.key === '?') {
        setIsShortcutsModalOpen((prev) => !prev);
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    simState,
    nodes,
    isChaosMode,
    setChaosMode,
    autoLayout,
    isBottomDrawerOpen,
    setIsBottomDrawerOpen,
    addToast,
  ]);

  return (
    <div className={styles.appContainer}>
      <Header
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
      />
      <div className={styles.mainLayout}>
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          paletteSlot={<ComponentPalette />}
          scenariosSlot={
            <Suspense fallback={<div className={styles.lazyFallback}>Loading scenarios…</div>}>
              <ScenarioManager />
            </Suspense>
          }
          calculatorSlot={<EnvelopeCalculator />}
        />

        <main className={styles.canvasContainer}>
          <div className={styles.canvasWrapper} id="syssim-canvas">
            <ArchitectureCanvas />
            {nodes.length === 0 && (
              <div className={styles.emptyCanvasNotice}>
                <div className={styles.emptyNoticeTitle}>SysSim Architecture Canvas</div>
                <div className={styles.emptyNoticeText}>
                  Drag components from the sidebar palette onto the canvas to construct your system
                  architecture.
                </div>
              </div>
            )}
            <SimulationControls />
            <div className={styles.unsupportedSize} role="status">
              This viewport is too small for safe diagram editing. Use at least 320 × 560 pixels.
            </div>
          </div>
          <Suspense fallback={null}>
            <MetricsDashboard />
          </Suspense>
        </main>

        <PropertiesPanel />
      </div>
      <ToastContainer />
      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
      {isCommandPaletteOpen ? (
        <Suspense fallback={null}>
          <CommandPalette isOpen onClose={() => setIsCommandPaletteOpen(false)} />
        </Suspense>
      ) : null}
    </div>
  );
}

export default App;
