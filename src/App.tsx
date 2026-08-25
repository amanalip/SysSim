import { useEffect } from 'react';
import { useStore } from './store/use-store';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { ComponentPalette } from './components/palette/ComponentPalette';
import { ArchitectureCanvas } from './components/canvas/ArchitectureCanvas';
import { PropertiesPanel } from './components/panels/PropertiesPanel';
import { SimulationControls } from './components/playback/SimulationControls';
import { MetricsDashboard } from './components/panels/MetricsDashboard';
import { EnvelopeCalculator } from './components/panels/EnvelopeCalculator';
import { ScenarioManager } from './components/scenarios/ScenarioManager';
import { ToastContainer } from './components/ui/Toast';
import { chaosRunner } from './engine/metrics/chaos-runner';
import styles from './App.module.css';

export function App() {
  const { theme, nodes, isChaosMode, chaosIntervalSec } = useStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (isChaosMode) {
      chaosRunner.start(chaosIntervalSec);
    } else {
      chaosRunner.stop();
    }
    return () => chaosRunner.stop();
  }, [isChaosMode, chaosIntervalSec]);

  return (
    <div className={styles.appContainer}>
      <Header />
      <div className={styles.mainLayout}>
        <Sidebar
          paletteSlot={<ComponentPalette />}
          scenariosSlot={<ScenarioManager />}
          calculatorSlot={<EnvelopeCalculator />}
        />

        <main className={styles.canvasContainer}>
          <div className={styles.canvasWrapper} id="syssim-canvas">
            <ArchitectureCanvas />
            {nodes.length === 0 && (
              <div className={styles.emptyCanvasNotice}>
                <div className={styles.emptyNoticeTitle}>SysSim Architecture Canvas</div>
                <div className={styles.emptyNoticeText}>
                  Drag components from the sidebar palette onto the canvas to construct your system architecture.
                </div>
              </div>
            )}
            <SimulationControls />
          </div>
          <MetricsDashboard />
        </main>

        <PropertiesPanel />
      </div>
      <ToastContainer />
    </div>
  );
}

export default App;
