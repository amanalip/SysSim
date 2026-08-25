import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronRight, Plus, X } from 'lucide-react';
import {
  COMPONENT_METADATA_LIST,
  ComponentMetadata,
} from '../../model/component-defaults';
import { ComponentCategory, ComponentType } from '../../model/types';
import { categoryColors } from '../../theme';
import { ComponentIcon } from '../icons/ComponentIcon';
import { useStore } from '../../store/use-store';
import styles from './ComponentPalette.module.css';

const CATEGORY_ORDER: Array<{ key: ComponentCategory; label: string }> = [
  { key: 'compute', label: 'Compute' },
  { key: 'networking', label: 'Networking' },
  { key: 'storage', label: 'Storage' },
  { key: 'caching', label: 'Caching' },
  { key: 'messaging', label: 'Messaging' },
  { key: 'security', label: 'Security' },
];

export const ComponentPalette: React.FC = () => {
  const [search, setSearch] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const addNode = useStore((state) => state.addNode);

  const toggleCategory = (category: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const filteredComponents = useMemo(() => {
    if (!search.trim()) return COMPONENT_METADATA_LIST;
    const query = search.toLowerCase();
    return COMPONENT_METADATA_LIST.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query) ||
        c.category.toLowerCase().includes(query)
    );
  }, [search]);

  const componentsByCategory = useMemo(() => {
    const grouped: Record<ComponentCategory, ComponentMetadata[]> = {
      compute: [],
      networking: [],
      storage: [],
      caching: [],
      messaging: [],
      security: [],
    };
    filteredComponents.forEach((c) => {
      grouped[c.category]?.push(c);
    });
    return grouped;
  }, [filteredComponents]);

  const onDragStart = (event: React.DragEvent, type: ComponentType) => {
    event.dataTransfer.setData('application/syssim-component-type', type);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleQuickAdd = (type: ComponentType, name: string) => {
    // Add in center with random slight offset
    const randomOffset = (Math.random() - 0.5) * 80;
    addNode(type, { x: 350 + randomOffset, y: 250 + randomOffset }, name);
  };

  return (
    <div className={styles.paletteContainer}>
      <div className={styles.searchBox}>
        <Search size={14} color="var(--text-muted)" />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search components..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setSearch('');
          }}
        />
        {search && (
          <button
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
            }}
            onClick={() => setSearch('')}
            title="Clear search filter"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {CATEGORY_ORDER.map(({ key, label }) => {
        const items = componentsByCategory[key];
        if (!items || items.length === 0) return null;
        const isCollapsed = !!collapsedCategories[key];
        const categoryColor = categoryColors[key]?.main || 'var(--accent-primary)';

        return (
          <div key={key} className={styles.categoryGroup}>
            <div
              className={styles.categoryHeader}
              onClick={() => toggleCategory(key)}
            >
              <div className={styles.categoryTitle}>
                <span
                  className={styles.categoryDot}
                  style={{ backgroundColor: categoryColor }}
                />
                <span>{label}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  ({items.length})
                </span>
              </div>
              {isCollapsed ? (
                <ChevronRight size={14} color="var(--text-muted)" />
              ) : (
                <ChevronDown size={14} color="var(--text-muted)" />
              )}
            </div>

            {!isCollapsed && (
              <div className={styles.componentGrid}>
                {items.map((component) => (
                  <div
                    key={component.type}
                    className={styles.componentCard}
                    draggable
                    onDragStart={(e) => onDragStart(e, component.type)}
                    onClick={() => handleQuickAdd(component.type, component.name)}
                    title={`Drag or click to add ${component.name} to canvas`}
                  >
                    <div className={styles.cardLeft}>
                      <div
                        className={styles.iconWrapper}
                        style={{ color: categoryColor }}
                      >
                        <ComponentIcon type={component.type} size={16} />
                      </div>
                      <div className={styles.cardInfo}>
                        <span className={styles.cardName}>{component.name}</span>
                        <span className={styles.cardDesc}>{component.description}</span>
                      </div>
                    </div>
                    <button
                      className={styles.addBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickAdd(component.type, component.name);
                      }}
                      title="Add to canvas"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
