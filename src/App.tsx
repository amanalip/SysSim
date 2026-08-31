import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from './store/use-store';
import { ZoneData } from './model/types';
import { toCanvasEdges, toCanvasNodes } from './model/canvas-types';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { ComponentPalette } from './components/palette/ComponentPalette';
import { ArchitectureCanvas } from './components/canvas/ArchitectureCanvas';
import { PropertiesPanel } from './components/panels/PropertiesPanel';
import { SimulationControls } from './components/playback/SimulationControls';
import { EnvelopeCalculator } from './components/panels/EnvelopeCalculator';
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
import { startUiPerformanceMonitor } from './diagnostics/runtime-performance';

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
const ShortcutsModal = lazy(() =>
  import('./components/modals/ShortcutsModal').then((module) => ({
    default: module.ShortcutsModal,
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
    keyboardShortcutsEnabled,
  } = useStore(
    useShallow((state) => ({
      theme: state.theme,
      nodes: state.nodes,
      isChaosMode: state.isChaosMode,
      setChaosMode: state.setChaosMode,
      chaosIntervalSec: state.chaosIntervalSec,
      simState: state.simState,
      loadCanvasState: state.loadCanvasState,
      loadScenario: state.loadScenario,
      loadReferenceDesign: state.loadReferenceDesign,
      setTrafficConfig: state.setTrafficConfig,
      addToast: state.addToast,
      autoLayout: state.autoLayout,
      isBottomDrawerOpen: state.isBottomDrawerOpen,
      setIsBottomDrawerOpen: state.setIsBottomDrawerOpen,
      keyboardShortcutsEnabled: state.keyboardShortcutsEnabled,
    })),
  );

  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth > 1100);
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    return startUiPerformanceMonitor();
  }, []);

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
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    if (window.location.hash) {
      const decoded = decodeStateFromUrlHash(window.location.hash);
      if (decoded && decoded.nodes && decoded.edges) {
        loadCanvasState(
          toCanvasNodes(decoded.nodes),
          toCanvasEdges(decoded.edges),
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
  }, [
    addToast,
    loadCanvasState,
    loadReferenceDesign,
    loadScenario,
    nodes.length,
    setTrafficConfig,
  ]);

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
      const target = e.target instanceof HTMLElement ? e.target : document.body;
      const isEditing =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;
      const isInsideModal = Boolean(target.closest('[role="dialog"]'));

      // Never let application shortcuts escape a modal or editing context.
      if (isInsideModal) return;

      // Command Palette uses a conventional modified shortcut and remains available
      // when single-key shortcuts are disabled, except while editing form content.
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        if (isEditing) return;
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      if (isEditing || !keyboardShortcutsEnabled) return;

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
    keyboardShortcutsEnabled,
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
      <div className={styles.srOnly} aria-live="polite" aria-atomic="true">
        {simState === 'running'
          ? 'Simulation running'
          : simState === 'paused'
            ? 'Simulation paused'
            : simState === 'stopped'
              ? 'Simulation stopped'
              : 'Simulation idle'}
      </div>
      {isShortcutsModalOpen ? (
        <Suspense fallback={null}>
          <ShortcutsModal isOpen onClose={() => setIsShortcutsModalOpen(false)} />
        </Suspense>
      ) : null}
      {isCommandPaletteOpen ? (
        <Suspense fallback={null}>
          <CommandPalette isOpen onClose={() => setIsCommandPaletteOpen(false)} />
        </Suspense>
      ) : null}
    </div>
  );
}

export default App;
