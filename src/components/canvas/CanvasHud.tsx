import React from 'react';
import { useReactFlow } from '@xyflow/react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  Map,
  Spline,
  GitCommit,
  MoveRight,
  Undo2,
  Redo2,
} from 'lucide-react';
import { useStore } from '../../store/use-store';
import styles from './CanvasHud.module.css';

export const CanvasHud: React.FC = () => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const {
    snapToGrid,
    setSnapToGrid,
    showMinimap,
    setShowMinimap,
    edgeRouting,
    setEdgeRouting,
    addToast,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useStore();

  return (
    <div className={styles.hudContainer}>
      {/* Edge Routing Style Switcher */}
      <div className={styles.routingGroup}>
        <button
          className={`${styles.hudBtn} ${edgeRouting === 'bezier' ? styles.hudBtnActive : ''}`}
          onClick={() => {
            setEdgeRouting('bezier');
            addToast('Edge routing set to Smooth Bezier curves', 'info');
          }}
          title="Smooth Bezier edge curves"
          aria-pressed={edgeRouting === 'bezier'}
        >
          <Spline size={13} />
          <span>Bezier</span>
        </button>

        <button
          className={`${styles.hudBtn} ${edgeRouting === 'orthogonal' ? styles.hudBtnActive : ''}`}
          onClick={() => {
            setEdgeRouting('orthogonal');
            addToast('Edge routing set to Orthogonal Manhattan lines', 'info');
          }}
          title="Orthogonal Manhattan edges"
          aria-pressed={edgeRouting === 'orthogonal'}
        >
          <GitCommit size={13} />
          <span>Orthogonal</span>
        </button>

        <button
          className={`${styles.hudBtn} ${edgeRouting === 'straight' ? styles.hudBtnActive : ''}`}
          onClick={() => {
            setEdgeRouting('straight');
            addToast('Edge routing set to Straight vectors', 'info');
          }}
          title="Straight linear connections"
          aria-pressed={edgeRouting === 'straight'}
        >
          <MoveRight size={13} />
          <span>Straight</span>
        </button>
      </div>

      <div className={styles.divider} />

      <div className={styles.toolsGroup}>
        <button
          className={styles.iconBtn}
          onClick={undo}
          disabled={!canUndo}
          title="Undo graph change"
        >
          <Undo2 size={14} />
        </button>
        <button
          className={styles.iconBtn}
          onClick={redo}
          disabled={!canRedo}
          title="Redo graph change"
        >
          <Redo2 size={14} />
        </button>
      </div>

      <div className={styles.divider} />

      {/* Grid & Map Toggles */}
      <div className={styles.toolsGroup}>
        <button
          className={`${styles.iconBtn} ${snapToGrid ? styles.iconBtnActive : ''}`}
          onClick={() => {
            setSnapToGrid(!snapToGrid);
            addToast(`Snap to grid ${!snapToGrid ? 'Enabled' : 'Disabled'}`, 'info');
          }}
          title={`Snap to Grid: ${snapToGrid ? 'ON' : 'OFF'}`}
          aria-pressed={snapToGrid}
          aria-label="Snap nodes to grid"
        >
          <Grid size={14} />
        </button>

        <button
          className={`${styles.iconBtn} ${showMinimap ? styles.iconBtnActive : ''}`}
          onClick={() => {
            setShowMinimap(!showMinimap);
            addToast(`Canvas minimap ${!showMinimap ? 'Shown' : 'Hidden'}`, 'info');
          }}
          title={`Minimap: ${showMinimap ? 'ON' : 'OFF'}`}
          aria-pressed={showMinimap}
          aria-label="Show canvas minimap"
        >
          <Map size={14} />
        </button>
      </div>

      <div className={styles.divider} />

      {/* Zoom and Fit View Controls */}
      <div className={styles.zoomGroup}>
        <button
          className={styles.iconBtn}
          onClick={() => zoomIn({ duration: 200 })}
          title="Zoom In"
        >
          <ZoomIn size={14} />
        </button>
        <button
          className={styles.iconBtn}
          onClick={() => zoomOut({ duration: 200 })}
          title="Zoom Out"
        >
          <ZoomOut size={14} />
        </button>
        <button
          className={styles.iconBtn}
          onClick={() => fitView({ padding: 0.2, duration: 300 })}
          title="Fit Architecture into View"
        >
          <Maximize2 size={14} />
        </button>
      </div>
    </div>
  );
};
