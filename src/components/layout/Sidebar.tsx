import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Box, BookOpen, Calculator } from 'lucide-react';
import { useStore } from '../../store/use-store';
import styles from './Sidebar.module.css';

interface SidebarProps {
  paletteSlot?: React.ReactNode;
  scenariosSlot?: React.ReactNode;
  calculatorSlot?: React.ReactNode;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  paletteSlot,
  scenariosSlot,
  calculatorSlot,
  isOpen = true,
  onClose,
}) => {
  const { activeSidebarTab, setActiveSidebarTab } = useStore(
    useShallow((state) => ({
      activeSidebarTab: state.activeSidebarTab,
      setActiveSidebarTab: state.setActiveSidebarTab,
    })),
  );

  return (
    <>
      <button
        type="button"
        className={`${styles.backdrop} ${isOpen ? styles.backdropOpen : ''}`}
        aria-label="Close component sidebar"
        tabIndex={isOpen ? 0 : -1}
        onClick={onClose}
      />
      <aside
        className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}
        aria-label="Design tools"
      >
        <div className={styles.tabsHeader} role="tablist" aria-label="Design tool sections">
          <button
            className={`${styles.tabBtn} ${activeSidebarTab === 'palette' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveSidebarTab('palette')}
            title="Component Palette (1)"
            role="tab"
            aria-selected={activeSidebarTab === 'palette'}
            aria-controls="palette-panel"
            id="palette-tab"
          >
            <Box size={15} />
            <span>Palette</span>
          </button>
          <button
            className={`${styles.tabBtn} ${activeSidebarTab === 'scenarios' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveSidebarTab('scenarios')}
            title="101 System Design Scenarios (2)"
            role="tab"
            aria-selected={activeSidebarTab === 'scenarios'}
            aria-controls="scenarios-panel"
            id="scenarios-tab"
          >
            <BookOpen size={15} />
            <span>Scenarios</span>
          </button>
          <button
            className={`${styles.tabBtn} ${activeSidebarTab === 'calculator' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveSidebarTab('calculator')}
            title="Capacity Calculator (3)"
            role="tab"
            aria-selected={activeSidebarTab === 'calculator'}
            aria-controls="calculator-panel"
            id="calculator-tab"
          >
            <Calculator size={15} />
            <span>Calculator</span>
          </button>
        </div>

        <div
          className={styles.tabContent}
          role="tabpanel"
          id={`${activeSidebarTab}-panel`}
          aria-labelledby={`${activeSidebarTab}-tab`}
        >
          {activeSidebarTab === 'palette' && paletteSlot}
          {activeSidebarTab === 'scenarios' && scenariosSlot}
          {activeSidebarTab === 'calculator' && calculatorSlot}
        </div>
      </aside>
    </>
  );
};
