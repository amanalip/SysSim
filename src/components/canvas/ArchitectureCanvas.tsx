import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  Connection,
  Edge,
  Node,
  MarkerType,
} from '@xyflow/react';
import { useStore } from '../../store/use-store';
import { CustomComponentNode } from './nodes/CustomComponentNode';
import { ProtocolEdge } from './edges/ProtocolEdge';
import { ComponentType } from '../../model/types';
import styles from './ArchitectureCanvas.module.css';

interface ArchitectureCanvasProps {
  customEdgeTypes?: Record<string, React.ComponentType<any>>;
}

const InnerCanvas: React.FC<ArchitectureCanvasProps> = ({ customEdgeTypes }) => {
  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    addNode,
    addEdge,
    selectNode,
    selectEdge,
    removeNode,
    removeEdge,
    selectedNodeId,
    selectedEdgeId,
    snapToGrid,
    showMinimap,
    showReferenceOverlay,
    undo,
    redo,
    theme,
  } = useStore();

  const reactFlowInstance = useReactFlow();

  const nodeTypes = useMemo(
    () => ({
      customComponent: CustomComponentNode,
    }),
    []
  );

  const edgeTypes = useMemo(
    () => ({
      protocolEdge: ProtocolEdge,
      ...customEdgeTypes,
    }),
    [customEdgeTypes]
  );

  const defaultEdgeOptions = useMemo(
    () => ({
      type: 'protocolEdge',
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 14,
        height: 14,
        color: '#58a6ff',
      },
    }),
    []
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds as unknown as Node[]) as any);
    },
    [setNodes]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds as unknown as Edge[]) as any);
    },
    [setEdges]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        addEdge(params.source, params.target);
      }
    },
    [addEdge]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData(
        'application/syssim-component-type'
      ) as ComponentType;

      if (!type) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(type, position);
    },
    [addNode, reactFlowInstance]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        e.preventDefault();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId) {
          removeNode(selectedNodeId);
        } else if (selectedEdgeId) {
          removeEdge(selectedEdgeId);
        }
      }
    },
    [selectedNodeId, selectedEdgeId, removeNode, removeEdge, undo, redo]
  );

  return (
    <div
      className={styles.canvasContainer}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {showReferenceOverlay && (
        <div className={styles.referenceOverlayBadge}>
          <span>Reference Architecture Overlay Active</span>
        </div>
      )}

      <ReactFlow
        nodes={nodes as unknown as Node[]}
        edges={edges as unknown as Edge[]}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => selectNode(node.id)}
        onEdgeClick={(_, edge) => selectEdge(edge.id)}
        onPaneClick={() => {
          selectNode(null);
          selectEdge(null);
        }}
        snapToGrid={snapToGrid}
        snapGrid={[16, 16]}
        fitView
        className={styles.canvasInner}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1.5}
          color={theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}
        />
        <Controls showInteractive={false} />
        {showMinimap && (
          <MiniMap
            zoomable
            pannable
            nodeColor={(n) => {
              const nodeData = n.data as any;
              if (nodeData?.config?.category === 'compute') return '#3b82f6';
              if (nodeData?.config?.category === 'networking') return '#8b5cf6';
              if (nodeData?.config?.category === 'storage') return '#10b981';
              if (nodeData?.config?.category === 'caching') return '#f59e0b';
              if (nodeData?.config?.category === 'messaging') return '#ec4899';
              return '#ef4444';
            }}
          />
        )}
      </ReactFlow>
    </div>
  );
};

export const ArchitectureCanvas: React.FC<ArchitectureCanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <InnerCanvas {...props} />
    </ReactFlowProvider>
  );
};
