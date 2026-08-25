import React from 'react';
import { Box, BookOpen, Calculator } from 'lucide-react';
import { useStore } from '../../store/use-store';
import styles from './Sidebar.module.css';

interface SidebarProps {
  paletteSlot?: React.ReactNode;
  scenariosSlot?: React.ReactNode;
  calculatorSlot?: React.ReactNode;
}

export const Sidebar: React.FC<SidebarProps> = ({
  paletteSlot,
  scenariosSlot,
  calculatorSlot,
}) => {
  const { activeSidebarTab, setActiveSidebarTab } = useStore();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.tabsHeader}>
        <button
          className={`${styles.tabBtn} ${activeSidebarTab === 'palette' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveSidebarTab('palette')}
          title="Component Palette"
        >
          <Box size={15} />
          <span>Palette</span>
        </button>
        <button
          className={`${styles.tabBtn} ${activeSidebarTab === 'scenarios' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveSidebarTab('scenarios')}
          title="101 System Design Scenarios"
        >
          <BookOpen size={15} />
          <span>Scenarios</span>
        </button>
        <button
          className={`${styles.tabBtn} ${activeSidebarTab === 'calculator' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveSidebarTab('calculator')}
          title="Capacity Calculator"
        >
          <Calculator size={15} />
          <span>Calculator</span>
        </button>
      </div>

      <div className={styles.tabContent}>
        {activeSidebarTab === 'palette' && paletteSlot}
        {activeSidebarTab === 'scenarios' && scenariosSlot}
        {activeSidebarTab === 'calculator' && calculatorSlot}
      </div>
    </aside>
  );
};
