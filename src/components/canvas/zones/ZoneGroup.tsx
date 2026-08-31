import React, { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { X, Edit2 } from 'lucide-react';
import { ZoneData } from '../../../model/types';
import { useStore } from '../../../store/use-store';
import styles from './ZoneGroup.module.css';

interface ZoneGroupProps {
  zone: ZoneData;
  viewport: { x: number; y: number; zoom: number };
}

export const ZoneGroup: React.FC<ZoneGroupProps> = ({ zone, viewport }) => {
  const { removeZone, updateZone } = useStore(
    useShallow((state) => ({ removeZone: state.removeZone, updateZone: state.updateZone })),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(zone.label);

  const borderColorMap: Record<ZoneData['category'], string> = {
    public: 'rgba(59, 130, 246, 0.4)',
    private: 'rgba(139, 92, 246, 0.4)',
    data: 'rgba(16, 185, 129, 0.4)',
    edge: 'rgba(245, 158, 11, 0.4)',
  };

  const textColorMap: Record<ZoneData['category'], string> = {
    public: '#60a5fa',
    private: '#a78bfa',
    data: '#34d399',
    edge: '#fbbf24',
  };

  const left = zone.x * viewport.zoom + viewport.x;
  const top = zone.y * viewport.zoom + viewport.y;
  const width = zone.width * viewport.zoom;
  const height = zone.height * viewport.zoom;

  const handleSaveLabel = () => {
    setIsEditing(false);
    if (editLabel.trim()) {
      updateZone(zone.id, { label: editLabel.trim() });
    } else {
      setEditLabel(zone.label);
    }
  };

  return (
    <div
      className={styles.zoneWrapper}
      style={{
        left,
        top,
        width,
        height,
        backgroundColor: zone.color,
        borderColor: borderColorMap[zone.category],
      }}
    >
      <div className={styles.zoneHeader} style={{ color: textColorMap[zone.category] }}>
        {isEditing ? (
          <input
            type="text"
            value={editLabel}
            autoFocus
            onChange={(e) => setEditLabel(e.target.value)}
            onBlur={handleSaveLabel}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveLabel();
              if (e.key === 'Escape') {
                setEditLabel(zone.label);
                setIsEditing(false);
              }
            }}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              borderRadius: 3,
              color: 'var(--text-primary)',
              fontSize: 11,
              padding: '1px 4px',
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            title="Rename zone"
            className={styles.zoneLabelButton}
          >
            {zone.label}
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            className={styles.zoneDeleteBtn}
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            title="Rename zone"
          >
            <Edit2 size={10} />
          </button>
          <button
            className={styles.zoneDeleteBtn}
            onClick={(e) => {
              e.stopPropagation();
              removeZone(zone.id);
            }}
            title="Remove zone"
          >
            <X size={11} />
          </button>
        </div>
      </div>
    </div>
  );
};
