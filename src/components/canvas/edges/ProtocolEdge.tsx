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
import { EdgeProtocol, EdgePurpose, ProtocolEdgeData } from '../../../model/types';
import { EDGE_PURPOSES, getEdgePurpose, validateEdgePurpose } from '../../../model/edge-semantics';
import { useStore } from '../../../store/use-store';
import styles from './ProtocolEdge.module.css';

const PROTOCOL_OPTIONS: EdgeProtocol[] = [
  'HTTP',
  'gRPC',
  'WebSocket',
  'TCP',
  'UDP',
  'pub/sub',
  'MQTT',
];

export const ProtocolEdge: React.FC<EdgeProps> = ({
  id,
  source,
  target,
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
  const {
    edgeRouting,
    nodes,
    updateEdgeProtocol,
    updateEdgePurpose,
    removeEdge,
    selectEdge,
    toggleCutEdge,
    addToast,
  } = useStore();

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
  const currentPurpose = getEdgePurpose(edgeData);
  const isCut = edgeData.isCut;

  const [openMenu, setOpenMenu] = useState<'protocol' | 'purpose' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpenMenu(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenu(null);
      }
    };
    if (openMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenu]);

  const handleProtocolSelect = (protocol: EdgeProtocol, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateEdgeProtocol(id, protocol);
    setOpenMenu(null);
  };

  const handlePurposeSelect = (purpose: EdgePurpose, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateEdgePurpose(id, purpose);
    setOpenMenu(null);
  };

  const sourceType = nodes.find((node) => node.id === source)?.data.config.type;
  const targetType = nodes.find((node) => node.id === target)?.data.config.type;

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
        className={`${styles.edgePath} ${styles[`purpose_${currentPurpose}`]} ${selected ? styles.edgePathSelected : ''} ${
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
          <button
            type="button"
            className={`${styles.protocolBadge} ${isCut ? styles.protocolBadgeCut : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setOpenMenu(openMenu === 'protocol' ? null : 'protocol');
            }}
            aria-label={`Transport protocol: ${currentProtocol}. Click to change.`}
            aria-expanded={openMenu === 'protocol'}
            title={isCut ? 'Connection is CUT (Click to change protocol)' : 'Click to change transport protocol'}
          >
            <span>{isCut ? `[CUT] ${currentProtocol}` : currentProtocol}</span>
            <ChevronDown size={10} />
          </button>

          <button
            type="button"
            className={`${styles.purposeBadge} ${styles[`badge_${currentPurpose}`]}`}
            onClick={(e) => {
              e.stopPropagation();
              setOpenMenu(openMenu === 'purpose' ? null : 'purpose');
            }}
            aria-label={`Edge purpose: ${currentPurpose}. Click to change.`}
            aria-expanded={openMenu === 'purpose'}
            title={`Execution purpose: ${currentPurpose}`}
          >
            <span>{currentPurpose}</span>
            <ChevronDown size={10} />
          </button>

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

          {openMenu === 'protocol' && (
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

          {openMenu === 'purpose' && (
            <div className={`${styles.protocolSelect} ${styles.purposeSelect}`} role="menu" aria-label="Edge purpose options">
              {EDGE_PURPOSES.map((purpose) => {
                const validation = sourceType && targetType
                  ? validateEdgePurpose(sourceType, targetType, currentProtocol, purpose)
                  : { valid: purpose === 'request', reason: 'Missing endpoint metadata' };
                return (
                  <button
                    key={purpose}
                    className={`${styles.protocolOption} ${purpose === currentPurpose ? styles.protocolOptionActive : ''}`}
                    onClick={(e) => handlePurposeSelect(purpose, e)}
                    disabled={!validation.valid}
                    title={validation.reason}
                    role="menuitem"
                  >
                    {purpose}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
