import { useEffect } from 'react';
import { useStore } from './store/use-store';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
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
          paletteSlot={<div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Palette ready</div>}
          scenariosSlot={<div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Scenarios ready</div>}
          calculatorSlot={<div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Calculator ready</div>}
        />

        <main className={styles.canvasContainer}>
          <div className={styles.canvasWrapper} id="syssim-canvas">
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
