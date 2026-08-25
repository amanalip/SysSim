import { useEffect } from 'react';
import { useStore } from './store/use-store';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { ComponentPalette } from './components/palette/ComponentPalette';
import { ArchitectureCanvas } from './components/canvas/ArchitectureCanvas';
import styles from './App.module.css';

export function App() {
  const { theme, nodes } = useStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <div className={styles.appContainer}>
      <Header />
      <div className={styles.mainLayout}>
        <Sidebar
          paletteSlot={<ComponentPalette />}
          scenariosSlot={<div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Scenarios module</div>}
          calculatorSlot={<div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Calculator module</div>}
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
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
