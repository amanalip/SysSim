import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronRight, Plus, X, Layers, Sparkles } from 'lucide-react';
import {
  COMPONENT_METADATA_LIST,
  ComponentMetadata,
} from '../../model/component-defaults';
import { ComponentCategory, ComponentType } from '../../model/types';
import { categoryColors } from '../../theme';
import { ComponentIcon } from '../icons/ComponentIcon';
import { ARCHITECTURE_BLUEPRINTS, ArchitectureBlueprint } from '../../model/blueprints';
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
  const { addNode, nodes, edges, loadCanvasState, addToast } = useStore();

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

  const filteredBlueprints = useMemo(() => {
    if (!search.trim()) return ARCHITECTURE_BLUEPRINTS;
    const query = search.toLowerCase();
    return ARCHITECTURE_BLUEPRINTS.filter(
      (b) =>
        b.name.toLowerCase().includes(query) ||
        b.description.toLowerCase().includes(query) ||
        b.category.toLowerCase().includes(query)
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
    const randomOffset = (Math.random() - 0.5) * 80;
    addNode(type, { x: 350 + randomOffset, y: 250 + randomOffset }, name);
    addToast(`Added ${name} to canvas`, 'success');
  };

  const handleAddBlueprint = (bp: ArchitectureBlueprint) => {
    const baseX = 200 + (Math.random() - 0.5) * 60;
    const baseY = 150 + (Math.random() - 0.5) * 60;
    const created = bp.create(baseX, baseY);
    loadCanvasState([...nodes, ...created.nodes], [...edges, ...created.edges]);
    addToast(`Inserted ${bp.name} blueprint onto canvas`, 'success');
  };

  return (
    <div className={styles.paletteContainer}>
      <div className={styles.searchBox}>
        <Search size={14} color="var(--text-muted)" />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search components or blueprints..."
          aria-label="Search components and blueprints"
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

      {/* Blueprints Section */}
      {filteredBlueprints.length > 0 && (
        <div className={styles.categoryGroup}>
          <button
            type="button"
            className={styles.categoryHeader}
            onClick={() => toggleCategory('blueprints')}
            aria-expanded={!collapsedCategories['blueprints']}
          >
            <div className={styles.categoryTitle}>
              <Sparkles size={13} color="var(--warning)" />
              <span>Blueprints</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                ({filteredBlueprints.length})
              </span>
            </div>
            {collapsedCategories['blueprints'] ? (
              <ChevronRight size={14} color="var(--text-muted)" />
            ) : (
              <ChevronDown size={14} color="var(--text-muted)" />
            )}
          </button>

          {!collapsedCategories['blueprints'] && (
            <div className={styles.componentGrid}>
              {filteredBlueprints.map((bp) => (
                <div
                  key={bp.id}
                  className={styles.componentCard}
                  onClick={() => handleAddBlueprint(bp)}
                  title={`Click to insert ${bp.name} (${bp.description})`}
                >
                  <div className={styles.cardLeft}>
                    <div
                      className={styles.iconWrapper}
                      style={{
                        color: 'var(--warning)',
                        backgroundColor: 'rgba(210, 153, 34, 0.15)',
                      }}
                    >
                      <Layers size={16} />
                    </div>
                    <div className={styles.cardInfo}>
                      <span className={styles.cardName}>{bp.name}</span>
                      <span className={styles.cardDesc}>{bp.description}</span>
                    </div>
                  </div>
                  <button
                    className={styles.addBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddBlueprint(bp);
                    }}
                    title="Insert blueprint onto canvas"
                    aria-label={`Insert ${bp.name} blueprint onto canvas`}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Standard Categorized Components */}
      {CATEGORY_ORDER.map(({ key, label }) => {
        const items = componentsByCategory[key];
        if (!items || items.length === 0) return null;
        const isCollapsed = !!collapsedCategories[key];
        const categoryColor = categoryColors[key]?.main || 'var(--accent-primary)';

        return (
          <div key={key} className={styles.categoryGroup}>
            <button
              type="button"
              className={styles.categoryHeader}
              onClick={() => toggleCategory(key)}
              aria-expanded={!isCollapsed}
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
            </button>

            {!isCollapsed && (
              <div className={styles.componentGrid}>
                {items.map((component) => (
                  <div
                    key={component.type}
                    className={styles.componentCard}
                    draggable
                    onDragStart={(e) => onDragStart(e, component.type)}
                    onClick={() => handleQuickAdd(component.type, component.name)}
                    title={`Click or drag to place ${component.name} (${component.description})`}
                  >
                    <div className={styles.cardLeft}>
                      <div
                        className={styles.iconWrapper}
                        style={{
                          color: categoryColor,
                          backgroundColor: `${categoryColor}18`,
                        }}
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
                      aria-label={`Add ${component.name} to canvas`}
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
