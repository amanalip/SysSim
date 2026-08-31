import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
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
  EdgeTypes,
  MarkerType,
  useViewport,
} from '@xyflow/react';
import { useStore } from '../../store/use-store';
import { CustomComponentNode } from './nodes/CustomComponentNode';
import { ProtocolEdge } from './edges/ProtocolEdge';
import { ContextMenu, ContextMenuState } from './ContextMenu';
import { ZoneGroup } from './zones/ZoneGroup';
import { RequestParticleLayer } from './animation/RequestParticleLayer';
import { CanvasHud } from './CanvasHud';
import { ComponentType } from '../../model/types';
import styles from './ArchitectureCanvas.module.css';
import type { CanvasEdge, CanvasNode } from '../../model/canvas-types';

interface ArchitectureCanvasProps {
  customEdgeTypes?: EdgeTypes;
}

const InnerCanvas: React.FC<ArchitectureCanvasProps> = ({ customEdgeTypes }) => {
  const {
    nodes,
    edges,
    zones,
    setNodes,
    setEdges,
    removeGraphItems,
    addNode,
    duplicateNode,
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
    beginNodeDragHistory,
    updateNodePosition,
    autoLayout,
    theme,
  } = useStore(
    useShallow((state) => ({
      nodes: state.nodes,
      edges: state.edges,
      zones: state.zones,
      setNodes: state.setNodes,
      setEdges: state.setEdges,
      removeGraphItems: state.removeGraphItems,
      addNode: state.addNode,
      duplicateNode: state.duplicateNode,
      addEdge: state.addEdge,
      selectNode: state.selectNode,
      selectEdge: state.selectEdge,
      removeNode: state.removeNode,
      removeEdge: state.removeEdge,
      selectedNodeId: state.selectedNodeId,
      selectedEdgeId: state.selectedEdgeId,
      snapToGrid: state.snapToGrid,
      showMinimap: state.showMinimap,
      showReferenceOverlay: state.showReferenceOverlay,
      undo: state.undo,
      redo: state.redo,
      beginNodeDragHistory: state.beginNodeDragHistory,
      updateNodePosition: state.updateNodePosition,
      autoLayout: state.autoLayout,
      theme: state.theme,
    })),
  );

  const reactFlowInstance = useReactFlow();
  const viewport = useViewport();
  const nodeDragActive = useRef(false);

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    flowX: 0,
    flowY: 0,
    nodeId: null,
  });
  const selectedDescription = selectedNodeId
    ? `Selected component ${nodes.find((node) => node.id === selectedNodeId)?.data.config.name || selectedNodeId}`
    : selectedEdgeId
      ? `Selected connection ${selectedEdgeId}`
      : 'No graph item selected';

  const nodeTypes = useMemo(
    () => ({
      customComponent: CustomComponentNode,
    }),
    [],
  );

  const edgeTypes = useMemo(
    () => ({
      protocolEdge: ProtocolEdge,
      ...customEdgeTypes,
    }),
    [customEdgeTypes],
  );

  const defaultEdgeOptions = useMemo(
    () => ({
      type: 'protocolEdge',
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 14,
        height: 14,
        color: theme === 'dark' ? '#58a6ff' : '#0969da',
      },
    }),
    [theme],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange<CanvasNode>[]) => {
      const hasDraggingPosition = changes.some(
        (change) => change.type === 'position' && change.dragging === true,
      );
      if (hasDraggingPosition && !nodeDragActive.current) {
        beginNodeDragHistory();
        nodeDragActive.current = true;
      }
      if (
        nodeDragActive.current &&
        changes.some((change) => change.type === 'position' && change.dragging === false)
      ) {
        nodeDragActive.current = false;
      }
      const removedNodeIds = changes
        .filter((change) => change.type === 'remove')
        .map((change) => change.id);
      if (removedNodeIds.length > 0) removeGraphItems(removedNodeIds, []);
      const visualChanges = changes.filter((change) => change.type !== 'remove');
      if (visualChanges.length > 0) {
        setNodes((nds) => applyNodeChanges<CanvasNode>(visualChanges, nds));
      }
    },
    [beginNodeDragHistory, removeGraphItems, setNodes],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<CanvasEdge>[]) => {
      const removedEdgeIds = changes
        .filter((change) => change.type === 'remove')
        .map((change) => change.id);
      if (removedEdgeIds.length > 0) removeGraphItems([], removedEdgeIds);
      const remainingChanges = changes.filter((change) => change.type !== 'remove');
      if (remainingChanges.length > 0) {
        setEdges((eds) => applyEdgeChanges<CanvasEdge>(remainingChanges, eds));
      }
    },
    [removeGraphItems, setEdges],
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        addEdge(params.source, params.target);
      }
    },
    [addEdge],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/syssim-component-type') as ComponentType;

      if (!type) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(type, position);
    },
    [addNode, reactFlowInstance],
  );

  const handleAutoLayout = useCallback(() => {
    autoLayout();
    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2, duration: 400 });
    }, 50);
  }, [autoLayout, reactFlowInstance]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      const focusedNode = target.closest<HTMLElement>('.react-flow__node[data-id]');
      const focusedNodeId = focusedNode?.dataset.id;
      if (focusedNodeId && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        selectNode(focusedNodeId);
        return;
      }
      const nodeMovement: Record<string, { x: number; y: number }> = {
        ArrowLeft: { x: -16, y: 0 },
        ArrowRight: { x: 16, y: 0 },
        ArrowUp: { x: 0, y: -16 },
        ArrowDown: { x: 0, y: 16 },
      };
      const movement = focusedNodeId ? nodeMovement[e.key] : undefined;
      if (focusedNodeId && movement) {
        const node = nodes.find((candidate) => candidate.id === focusedNodeId);
        if (!node) return;
        e.preventDefault();
        beginNodeDragHistory();
        updateNodePosition(focusedNodeId, {
          x: node.position.x + movement.x,
          y: node.position.y + movement.y,
        });
        selectNode(focusedNodeId);
        useStore
          .getState()
          .addToast(
            `${node.data.config.name} moved ${e.key.replace('Arrow', '').toLowerCase()}`,
            'info',
          );
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        e.preventDefault();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        if (selectedNodeId) {
          duplicateNode(selectedNodeId);
        }
        e.preventDefault();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        setNodes((nds) => nds.map((n) => ({ ...n, selected: true })));
        setEdges((currentEdges) => currentEdges.map((edge) => ({ ...edge, selected: true })));
        selectNode(null);
        selectEdge(null);
        e.preventDefault();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
        const selectedNodeIds = nodes.filter((node) => node.selected).map((node) => node.id);
        const selectedEdgeIds = edges.filter((edge) => edge.selected).map((edge) => edge.id);
        if (selectedNodeIds.length || selectedEdgeIds.length) {
          removeGraphItems(selectedNodeIds, selectedEdgeIds);
        } else if (selectedNodeId) {
          removeNode(selectedNodeId);
        } else if (selectedEdgeId) {
          removeEdge(selectedEdgeId);
        }
      }
    },
    [
      beginNodeDragHistory,
      duplicateNode,
      edges,
      nodes,
      redo,
      removeEdge,
      removeNode,
      removeGraphItems,
      selectNode,
      selectEdge,
      selectedEdgeId,
      selectedNodeId,
      setNodes,
      setEdges,
      undo,
      updateNodePosition,
    ],
  );

  const handleContextMenu = useCallback(
    (event: React.MouseEvent, nodeId: string | null = null) => {
      event.preventDefault();
      const flowPos = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      setContextMenu({
        isOpen: true,
        x: event.clientX,
        y: event.clientY,
        flowX: flowPos.x,
        flowY: flowPos.y,
        nodeId,
      });
    },
    [reactFlowInstance],
  );

  return (
    <div
      className={styles.canvasContainer}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onKeyDown={handleKeyDown}
      onContextMenu={(e) => handleContextMenu(e, null)}
      tabIndex={0}
      role="region"
      aria-label={`Architecture canvas with ${nodes.length} components, ${edges.length} connections, and ${zones.length} zones`}
      aria-describedby="canvas-keyboard-help"
    >
      <p id="canvas-keyboard-help" className={styles.srOnly}>
        Tab to components and connection controls. Press Enter to select a component and use arrow
        keys to move it by one grid step. Delete removes the selected graph item.
      </p>
      <div className={styles.srOnly} aria-live="polite" aria-atomic="true">
        {selectedDescription}. Graph contains {nodes.length} components and {edges.length}{' '}
        connections.
      </div>
      {showReferenceOverlay && (
        <div className={styles.referenceOverlayBadge}>
          <span>Reference Architecture Overlay Active</span>
        </div>
      )}

      {zones.map((zone) => (
        <ZoneGroup key={zone.id} zone={zone} viewport={viewport} />
      ))}

      <ReactFlow<CanvasNode, CanvasEdge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => selectNode(node.id)}
        onNodeContextMenu={(e, node) => handleContextMenu(e, node.id)}
        onEdgeClick={(_, edge) => selectEdge(edge.id)}
        onPaneClick={() => {
          selectNode(null);
          selectEdge(null);
          setContextMenu((prev) => ({ ...prev, isOpen: false }));
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
            nodeColor={(n: CanvasNode) => {
              if (n.data.config.category === 'compute') return '#3b82f6';
              if (n.data.config.category === 'networking') return '#8b5cf6';
              if (n.data.config.category === 'storage') return '#10b981';
              if (n.data.config.category === 'caching') return '#f59e0b';
              if (n.data.config.category === 'messaging') return '#ec4899';
              return '#ef4444';
            }}
          />
        )}
      </ReactFlow>

      <RequestParticleLayer />
      <CanvasHud />

      <ContextMenu
        menuState={contextMenu}
        onClose={() => setContextMenu((prev) => ({ ...prev, isOpen: false }))}
        onAutoLayout={handleAutoLayout}
      />
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
