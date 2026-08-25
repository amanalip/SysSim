import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Play,
  Pause,
  RotateCcw,
  Flame,
  Layout,
  Trash2,
  Sun,
  Moon,
  Plus,
  BookOpen,
} from 'lucide-react';
import { useStore } from '../../store/use-store';
import { simBridge } from '../../engine/sim-bridge';
import { ALL_SCENARIOS } from '../../scenarios';
import { COMPONENT_METADATA_LIST } from '../../model/component-defaults';
import { ComponentType } from '../../model/types';
import styles from './CommandPalette.module.css';

interface CommandItem {
  id: string;
  category: 'Actions' | 'Components' | 'Scenarios';
  title: string;
  subtitle?: string;
  shortcut?: string;
  icon: React.ReactNode;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const {
    simState,
    isChaosMode,
    setChaosMode,
    theme,
    setTheme,
    autoLayout,
    clearCanvas,
    addNode,
    loadScenario,
    loadReferenceDesign,
    addToast,
    nodes,
  } = useStore();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const allCommands = useMemo<CommandItem[]>(() => {
    const isRunning = simState === 'running';

    const actionCommands: CommandItem[] = [
      {
        id: 'sim_toggle',
        category: 'Actions',
        title: isRunning ? 'Pause Simulation' : 'Start Simulation',
        shortcut: 'Space',
        icon: isRunning ? <Pause size={14} color="var(--warning)" /> : <Play size={14} color="var(--success)" />,
        action: () => {
          if (isRunning) simBridge.pause();
          else if (simState === 'paused') simBridge.resume();
          else if (nodes.length > 0) simBridge.start();
        },
      },
      {
        id: 'sim_reset',
        category: 'Actions',
        title: 'Reset Simulation Metrics',
        icon: <RotateCcw size={14} />,
        action: () => simBridge.reset(),
      },
      {
        id: 'auto_layout',
        category: 'Actions',
        title: 'Auto Layout Diagram',
        shortcut: 'L',
        icon: <Layout size={14} color="var(--accent-primary)" />,
        action: () => {
          autoLayout();
          addToast('Auto layout arranged components', 'info');
        },
      },
      {
        id: 'toggle_chaos',
        category: 'Actions',
        title: `Turn Chaos Monkey ${isChaosMode ? 'OFF' : 'ON'}`,
        shortcut: 'C',
        icon: <Flame size={14} color="var(--error)" />,
        action: () => {
          setChaosMode(!isChaosMode);
          addToast(`Chaos mode ${!isChaosMode ? 'Enabled' : 'Disabled'}`, 'info');
        },
      },
      {
        id: 'toggle_theme',
        category: 'Actions',
        title: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
        icon: theme === 'dark' ? <Sun size={14} color="var(--warning)" /> : <Moon size={14} />,
        action: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
      },
      {
        id: 'clear_canvas',
        category: 'Actions',
        title: 'Clear Canvas Architecture',
        icon: <Trash2 size={14} color="var(--error)" />,
        action: () => {
          clearCanvas();
          addToast('Canvas cleared', 'info');
        },
      },
    ];

    const componentCommands: CommandItem[] = COMPONENT_METADATA_LIST.map((comp) => ({
      id: `add_${comp.type}`,
      category: 'Components',
      title: `Add ${comp.name}`,
      subtitle: comp.description,
      icon: <Plus size={14} color="var(--accent-primary)" />,
      action: () => {
        const offset = (Math.random() - 0.5) * 80;
        addNode(comp.type as ComponentType, { x: 350 + offset, y: 250 + offset }, comp.name);
        addToast(`Added ${comp.name} to canvas`, 'success');
      },
    }));

    const scenarioCommands: CommandItem[] = ALL_SCENARIOS.map((sc) => ({
      id: `scenario_${sc.id}`,
      category: 'Scenarios',
      title: `#${sc.id} ${sc.title}`,
      subtitle: `${sc.category} • ${sc.difficulty}`,
      icon: <BookOpen size={14} color="var(--accent-primary)" />,
      action: () => {
        loadScenario(sc);
        loadReferenceDesign(sc.referenceDesign);
        simBridge.reset();
        addToast(`Loaded scenario #${sc.id}: ${sc.title}`, 'info');
      },
    }));

    return [...actionCommands, ...componentCommands, ...scenarioCommands];
  }, [simState, isChaosMode, setChaosMode, theme, setTheme, autoLayout, clearCanvas, addNode, loadScenario, loadReferenceDesign, addToast, nodes.length]);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return allCommands.slice(0, 30);
    const q = query.toLowerCase();
    return allCommands
      .filter((cmd) => cmd.title.toLowerCase().includes(q) || (cmd.subtitle && cmd.subtitle.toLowerCase().includes(q)))
      .slice(0, 30);
  }, [allCommands, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = filteredCommands[selectedIndex];
      if (cmd) {
        cmd.action();
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.searchBar}>
          <Search size={16} color="var(--text-muted)" />
          <input
            ref={inputRef}
            type="text"
            className={styles.searchInput}
            placeholder="Type a command, add component, or search scenario..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <span className={styles.escBadge}>ESC</span>
        </div>

        <div className={styles.commandList} ref={listRef}>
          {filteredCommands.length === 0 ? (
            <div className={styles.emptyState}>No matching commands or components found</div>
          ) : (
            filteredCommands.map((cmd, idx) => (
              <div
                key={cmd.id}
                className={`${styles.commandItem} ${idx === selectedIndex ? styles.commandItemActive : ''}`}
                onClick={() => {
                  cmd.action();
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div className={styles.itemLeft}>
                  <div className={styles.iconBox}>{cmd.icon}</div>
                  <div className={styles.itemText}>
                    <span className={styles.itemTitle}>{cmd.title}</span>
                    {cmd.subtitle && <span className={styles.itemSubtitle}>{cmd.subtitle}</span>}
                  </div>
                </div>
                {cmd.shortcut && <span className={styles.shortcutBadge}>{cmd.shortcut}</span>}
              </div>
            ))
          )}
        </div>

        <div className={styles.footerHints}>
          <span>Use <b>↑↓</b> to navigate</span>
          <span><b>Enter</b> to select</span>
          <span><b>ESC</b> to close</span>
        </div>
      </div>
    </div>
  );
};
