import React from 'react';
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
  const { activeSidebarTab, setActiveSidebarTab } = useStore();

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;
      if (e.key === '1') setActiveSidebarTab('palette');
      if (e.key === '2') setActiveSidebarTab('scenarios');
      if (e.key === '3') setActiveSidebarTab('calculator');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveSidebarTab]);

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
        <div className={styles.tabsHeader}>
          <button
            className={`${styles.tabBtn} ${activeSidebarTab === 'palette' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveSidebarTab('palette')}
            title="Component Palette (1)"
          >
            <Box size={15} />
            <span>Palette</span>
          </button>
          <button
            className={`${styles.tabBtn} ${activeSidebarTab === 'scenarios' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveSidebarTab('scenarios')}
            title="101 System Design Scenarios (2)"
          >
            <BookOpen size={15} />
            <span>Scenarios</span>
          </button>
          <button
            className={`${styles.tabBtn} ${activeSidebarTab === 'calculator' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveSidebarTab('calculator')}
            title="Capacity Calculator (3)"
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
    </>
  );
};
