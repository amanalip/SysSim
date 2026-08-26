import React, { useState, useRef, useEffect } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  EdgeProps,
} from '@xyflow/react';
import { ChevronDown, X, Scissors } from 'lucide-react';
import { EdgeProtocol, ProtocolEdgeData } from '../../../model/types';
import { useStore } from '../../../store/use-store';
import styles from './ProtocolEdge.module.css';

const PROTOCOL_OPTIONS: EdgeProtocol[] = [
  'HTTP',
  'gRPC',
  'WebSocket',
  'TCP',
  'pub/sub',
  'MQTT',
];

export const ProtocolEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
  data,
}) => {
  const { edgeRouting, updateEdgeProtocol, removeEdge, selectEdge, toggleCutEdge, addToast } = useStore();

  let edgePath = '';
  let labelX = 0;
  let labelY = 0;

  const pathParams = {
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  };

  if (edgeRouting === 'orthogonal') {
    [edgePath, labelX, labelY] = getSmoothStepPath(pathParams);
  } else if (edgeRouting === 'straight') {
    [edgePath, labelX, labelY] = getStraightPath(pathParams);
  } else {
    [edgePath, labelX, labelY] = getBezierPath(pathParams);
  }

  const edgeData = (data as unknown as ProtocolEdgeData) || { protocol: 'HTTP' };
  const currentProtocol = edgeData.protocol || 'HTTP';
  const isCut = edgeData.isCut;

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleProtocolSelect = (protocol: EdgeProtocol, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateEdgeProtocol(id, protocol);
    setIsOpen(false);
  };

  const handleToggleCut = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleCutEdge(id);
    addToast(isCut ? 'Restored network connection' : 'Cut network connection', isCut ? 'success' : 'warning');
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    removeEdge(id);
  };

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
        }}
        className={`${styles.edgePath} ${selected ? styles.edgePathSelected : ''} ${
          isCut ? styles.edgePathCut : ''
        }`}
      />

      <EdgeLabelRenderer>
        <div
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
          className={styles.edgeLabelContainer}
          onClick={() => selectEdge(id)}
          ref={dropdownRef}
        >
          <div
            className={`${styles.protocolBadge} ${isCut ? styles.protocolBadgeCut : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            title={isCut ? 'Connection is CUT (Click to change protocol)' : 'Click to change transport protocol'}
          >
            <span>{isCut ? `[CUT] ${currentProtocol}` : currentProtocol}</span>
            <ChevronDown size={10} />
          </div>

          <button
            className={styles.edgeCutBtn}
            onClick={handleToggleCut}
            title={isCut ? 'Restore connection' : 'Cut connection (simulate network partition)'}
            style={{ color: isCut ? 'var(--warning)' : 'var(--text-muted)' }}
          >
            <Scissors size={10} />
          </button>

          <button
            className={styles.edgeDeleteBtn}
            onClick={handleDelete}
            title="Delete connection"
          >
            <X size={10} />
          </button>

          {isOpen && (
            <div className={styles.protocolSelect}>
              {PROTOCOL_OPTIONS.map((proto) => (
                <button
                  key={proto}
                  className={`${styles.protocolOption} ${
                    proto === currentProtocol ? styles.protocolOptionActive : ''
                  }`}
                  onClick={(e) => handleProtocolSelect(proto, e)}
                >
                  {proto}
                </button>
              ))}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
