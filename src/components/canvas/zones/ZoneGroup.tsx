import React from 'react';
import { X } from 'lucide-react';
import { ZoneData } from '../../../model/types';
import { useStore } from '../../../store/use-store';
import styles from './ZoneGroup.module.css';

interface ZoneGroupProps {
  zone: ZoneData;
  viewport: { x: number; y: number; zoom: number };
}

export const ZoneGroup: React.FC<ZoneGroupProps> = ({ zone, viewport }) => {
  const { removeZone } = useStore();

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
      <div
        className={styles.zoneHeader}
        style={{ color: textColorMap[zone.category] }}
      >
        <span>{zone.label}</span>
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
  );
};
