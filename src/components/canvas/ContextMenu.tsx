import React, { useEffect, useRef } from 'react';
import {
  Settings,
  Copy,
  Power,
  Trash2,
  Plus,
  Layers,
  LayoutGrid,
} from 'lucide-react';
import { useStore } from '../../store/use-store';
import { ComponentType, ZoneData } from '../../model/types';
import styles from './ContextMenu.module.css';

export interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  flowX: number;
  flowY: number;
  nodeId: string | null;
}

interface ContextMenuProps {
  menuState: ContextMenuState;
  onClose: () => void;
  onAutoLayout: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  menuState,
  onClose,
  onAutoLayout,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const {
    nodes,
    addNode,
    duplicateNode,
    selectNode,
    removeNode,
    setNodeHealthOverride,
    addZone,
  } = useStore();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  if (!menuState.isOpen) return null;

  const targetNode = menuState.nodeId
    ? nodes.find((n) => n.id === menuState.nodeId)
    : null;

  const handleAddQuickComponent = (type: ComponentType) => {
    addNode(type, { x: menuState.flowX, y: menuState.flowY });
    onClose();
  };

  const handleAddZone = (category: ZoneData['category'], label: string) => {
    addZone(label, category, {
      x: menuState.flowX - 50,
      y: menuState.flowY - 50,
      width: 400,
      height: 300,
    });
    onClose();
  };

  const handleDuplicate = () => {
    if (targetNode) {
      duplicateNode(targetNode.id);
    }
    onClose();
  };

  const handleToggleHealth = () => {
    if (targetNode) {
      const nextHealth =
        targetNode.data.config.health === 'down' ? 'healthy' : 'down';
      setNodeHealthOverride(targetNode.id, nextHealth);
    }
    onClose();
  };

  const handleDelete = () => {
    if (targetNode) {
      removeNode(targetNode.id);
    }
    onClose();
  };

  const handleConfigure = () => {
    if (targetNode) {
      selectNode(targetNode.id);
    }
    onClose();
  };

  // Clamping coordinates inside viewport
  const safeX = typeof window !== 'undefined' ? Math.max(10, Math.min(menuState.x, window.innerWidth - 220)) : menuState.x;
  const safeY = typeof window !== 'undefined' ? Math.max(10, Math.min(menuState.y, window.innerHeight - 340)) : menuState.y;

  return (
    <div
      ref={menuRef}
      className={styles.contextMenu}
      style={{ top: safeY, left: safeX }}
    >
      {targetNode ? (
        <>
          <div className={styles.menuHeader}>{targetNode.data.config.name}</div>
          <button className={styles.menuItem} onClick={handleConfigure}>
            <Settings size={13} />
            <span>Configure</span>
          </button>
          <button className={styles.menuItem} onClick={handleDuplicate}>
            <Copy size={13} />
            <span>Duplicate (Ctrl+D)</span>
          </button>
          <button className={styles.menuItem} onClick={handleToggleHealth}>
            <Power size={13} />
            <span>
              {targetNode.data.config.health === 'down'
                ? 'Mark Healthy'
                : 'Inject Failure (Down)'}
            </span>
          </button>
          <div className={styles.menuDivider} />
          <button
            className={`${styles.menuItem} ${styles.menuItemDanger}`}
            onClick={handleDelete}
          >
            <Trash2 size={13} />
            <span>Delete</span>
          </button>
        </>
      ) : (
        <>
          <div className={styles.menuHeader}>Add Component</div>
          <button
            className={styles.menuItem}
            onClick={() => handleAddQuickComponent('client')}
          >
            <Plus size={13} />
            <span>Client</span>
          </button>
          <button
            className={styles.menuItem}
            onClick={() => handleAddQuickComponent('load_balancer')}
          >
            <Plus size={13} />
            <span>Load Balancer</span>
          </button>
          <button
            className={styles.menuItem}
            onClick={() => handleAddQuickComponent('app_server')}
          >
            <Plus size={13} />
            <span>App Server</span>
          </button>
          <button
            className={styles.menuItem}
            onClick={() => handleAddQuickComponent('sql_db')}
          >
            <Plus size={13} />
            <span>SQL Database</span>
          </button>
          <button
            className={styles.menuItem}
            onClick={() => handleAddQuickComponent('redis_cache')}
          >
            <Plus size={13} />
            <span>Redis Cache</span>
          </button>

          <div className={styles.menuDivider} />
          <div className={styles.menuHeader}>Create Zone</div>
          <button
            className={styles.menuItem}
            onClick={() => handleAddZone('public', 'Public Zone')}
          >
            <Layers size={13} />
            <span>Public Zone</span>
          </button>
          <button
            className={styles.menuItem}
            onClick={() => handleAddZone('private', 'Private Zone')}
          >
            <Layers size={13} />
            <span>Private Zone</span>
          </button>
          <button
            className={styles.menuItem}
            onClick={() => handleAddZone('data', 'Data Tier')}
          >
            <Layers size={13} />
            <span>Data Tier</span>
          </button>

          <div className={styles.menuDivider} />
          <button
            className={styles.menuItem}
            onClick={() => {
              onAutoLayout();
              onClose();
            }}
          >
            <LayoutGrid size={13} />
            <span>Auto Layout</span>
          </button>
        </>
      )}
    </div>
  );
};
