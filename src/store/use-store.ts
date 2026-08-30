import { create } from 'zustand';
import {
  AnyComponentConfig,
  BottleneckIssue,
  CalculatorInputs,
  EdgeProtocol,
  EdgePurpose,
  NodeHealthStatus,
  OverallMetrics,
  ProtocolEdgeData,
  Scenario,
  SerializedCanvasState,
  SimRequest,
  SimulationState,
  TrafficConfig,
  ZoneData,
} from '../model/types';
import { createDefaultConfig } from '../model/component-defaults';
import { validateConnection } from '../model/validation';
import { inferEdgePurpose, validateEdgePurpose } from '../model/edge-semantics';
import { migrateCanvasState } from '../model/canvas-migrations';
import { computeAutoLayout } from '../layout/auto-layout';
import { notifyGraphMutation, notifySimulationReset, notifyTrafficConfigChange } from '../engine/simulation-command-bus';
import { ThemeMode } from '../theme';
import { HealthStateSource } from '../engine/health-state';
import { validateArchitectureState } from '../model/architecture-schema';
import { createScenarioProgress, readScenarioProgress, ScenarioProgress, writeScenarioProgress } from '../scenarios/progress';
export type { ZoneData };

export interface CanvasNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    config: AnyComponentConfig;
  };
  selected?: boolean;
}

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  data: ProtocolEdgeData;
  selected?: boolean;
}

export interface CanvasHistoryEntry {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  zones: ZoneData[];
}

export interface ToastItem {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

export interface SysSimState {
  // Theme & UI state
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  activeSidebarTab: 'palette' | 'scenarios' | 'calculator';
  setActiveSidebarTab: (tab: 'palette' | 'scenarios' | 'calculator') => void;
  activeBottomTab: 'metrics' | 'bottlenecks' | 'health' | 'trace' | 'cost';
  setActiveBottomTab: (tab: 'metrics' | 'bottlenecks' | 'health' | 'trace' | 'cost') => void;
  isBottomDrawerOpen: boolean;
  setIsBottomDrawerOpen: (open: boolean) => void;
  isPropertiesPanelOpen: boolean;
  setIsPropertiesPanelOpen: (open: boolean) => void;
  snapToGrid: boolean;
  setSnapToGrid: (snap: boolean) => void;
  showMinimap: boolean;
  setShowMinimap: (show: boolean) => void;
  edgeRouting: 'bezier' | 'orthogonal' | 'straight';
  setEdgeRouting: (routing: 'bezier' | 'orthogonal' | 'straight') => void;

  // Toasts
  toasts: ToastItem[];
  addToast: (message: string, type?: ToastItem['type']) => void;
  removeToast: (id: string) => void;

  // Canvas State
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  zones: ZoneData[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  historyPast: CanvasHistoryEntry[];
  historyFuture: CanvasHistoryEntry[];
  graphRevision: number;
  canUndo: boolean;
  canRedo: boolean;

  // Canvas Actions
  setNodes: (nodes: CanvasNode[] | ((prev: CanvasNode[]) => CanvasNode[])) => void;
  setEdges: (edges: CanvasEdge[] | ((prev: CanvasEdge[]) => CanvasEdge[])) => void;
  removeGraphItems: (nodeIds: string[], edgeIds: string[]) => void;
  setZones: (zones: ZoneData[] | ((prev: ZoneData[]) => ZoneData[])) => void;
  addNode: (type: AnyComponentConfig['type'], position: { x: number; y: number }, customName?: string) => string;
  duplicateNode: (nodeId: string) => string | null;
  updateNodePosition: (id: string, position: { x: number; y: number }) => void;
  updateNodeConfig: (id: string, partialConfig: Partial<AnyComponentConfig>) => void;
  updateNodeConfigs: (updates: Record<string, Partial<AnyComponentConfig>>) => void;
  removeNode: (id: string) => void;
  addEdge: (source: string, target: string, protocol?: EdgeProtocol, purpose?: EdgePurpose) => boolean;
  updateEdgeProtocol: (edgeId: string, protocol: EdgeProtocol) => void;
  updateEdgePurpose: (edgeId: string, purpose: EdgePurpose) => void;
  toggleCutEdge: (edgeId: string) => void;
  removeEdge: (edgeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  addZone: (label: string, category: ZoneData['category'], bounds: { x: number; y: number; width: number; height: number }) => void;
  removeZone: (zoneId: string) => void;
  updateZone: (zoneId: string, partial: Partial<ZoneData>) => void;
  autoLayout: () => void;
  clearCanvas: () => void;
  loadCanvasState: (nodes: CanvasNode[], edges: CanvasEdge[], zones?: ZoneData[]) => void;
  pushHistory: () => void;
  beginNodeDragHistory: () => void;
  undo: () => void;
  redo: () => void;

  // Simulation State
  simState: SimulationState;
  simulationRuntimeMode: 'worker' | 'fallback';
  speedMultiplier: number;
  trafficConfig: TrafficConfig;
  activeRequests: SimRequest[];
  recentRequests: SimRequest[];
  metrics: OverallMetrics;
  bottlenecks: BottleneckIssue[];
  isChaosMode: boolean;
  chaosIntervalSec: number;
  nodeHealthOverrides: Record<string, NodeHealthStatus>;
  nodeHealthSources: Record<string, HealthStateSource>;

  // Simulation Actions
  setSimState: (state: SimulationState) => void;
  setSpeedMultiplier: (speed: number) => void;
  setTrafficConfig: (config: Partial<TrafficConfig>) => void;
  setActiveRequests: (requests: SimRequest[]) => void;
  setRecentRequests: (requests: SimRequest[]) => void;
  updateMetrics: (metrics: Partial<OverallMetrics>) => void;
  setBottlenecks: (bottlenecks: BottleneckIssue[]) => void;
  setChaosMode: (enabled: boolean, intervalSec?: number) => void;
  setNodeHealthOverride: (nodeId: string, health: NodeHealthStatus, source?: HealthStateSource) => void;
  resetSimulation: () => void;

  // Scenario State
  currentScenario: Scenario | null;
  activeScenario: Scenario | null;
  activeScenarioId: number | null;
  completedScenarioIds: number[];
  scenarioProgress: Record<number, ScenarioProgress>;
  revealedHintsCount: number;
  showReferenceOverlay: boolean;
  setShowReferenceOverlay: (show: boolean) => void;
  sideBySideMode: boolean;
  scenarioSearchQuery: string;
  scenarioDifficultyFilter: 'All' | 'Easy' | 'Medium' | 'Hard';
  scenarioCategoryFilter: string;

  // Scenario Actions
  setCurrentScenario: (scenario: Scenario | null) => void;
  loadScenario: (scenario: Scenario) => void;
  loadReferenceDesign: (refDesign: SerializedCanvasState) => void;
  closeScenario: () => void;
  revealNextHint: () => void;
  toggleReferenceOverlay: () => void;
  setSideBySideMode: (enabled: boolean) => void;
  markScenarioCompleted: (scenarioId: number) => void;
  updateScenarioProgress: (scenarioId: number, progress: Partial<Omit<ScenarioProgress, 'scenarioId'>>) => void;
  recordScenarioAttempt: (scenarioId: number) => void;
  setScenarioSearchQuery: (query: string) => void;
  setScenarioDifficultyFilter: (diff: 'All' | 'Easy' | 'Medium' | 'Hard') => void;
  setScenarioCategoryFilter: (category: string) => void;

  // Capacity Calculator State
  calculatorInputs: CalculatorInputs;
  setCalculatorInputs: (inputs: Partial<CalculatorInputs>) => void;
}

const initialTrafficConfig: TrafficConfig = {
  pattern: 'steady',
  baseQps: 500,
  burstMultiplier: 3,
  rampDurationSec: 30,
  spikeFrequencySec: 10,
  seed: 1,
  requestKeyDistribution: 'uniform',
  requestKeySpaceSize: 100,
};

const initialMetrics: OverallMetrics = {
  totalRequestsSent: 0,
  totalRequestsSuccess: 0,
  totalRequestsFailed: 0,
  currentQps: 0,
  avgEndToEndLatencyMs: 0,
  p50LatencyMs: 0,
  p95LatencyMs: 0,
  p99LatencyMs: 0,
  overallErrorRatePercent: 0,
  overallCacheHitRatioPercent: 0,
  totalCacheHits: 0,
  totalCacheMisses: 0,
  totalCacheBypasses: 0,
  totalCacheCoalescedRequests: 0,
  totalProducerAccepted: 0,
  totalProducerRejected: 0,
  totalConsumerSucceeded: 0,
  totalConsumerFailed: 0,
  totalMessageRetries: 0,
  totalMessagesDropped: 0,
  totalMessagesExpired: 0,
  totalDeadLettered: 0,
  timeSeries: [],
  componentMetrics: {},
};

const initialCalculatorInputs: CalculatorInputs = {
  qps: 10000,
  payloadSizeKb: 2,
  retentionDays: 365,
  readWriteRatio: 10,
  replicationFactor: 3,
  slaAvailabilityPercent: 99.99,
  serverCapacityQps: 2000,
  readRequestPayloadKb: 0.5,
  readResponsePayloadKb: 2,
  writeResponsePayloadKb: 0.2,
  dbAverageServiceTimeMs: 20,
  dbTargetUtilizationPercent: 70,
  cacheWorkingSetDays: 1,
  cacheHotSetPercent: 20,
  cacheCompressionRatio: 0.7,
  serverTargetUtilizationPercent: 70,
  serverHeadroomPercent: 20,
  failoverCapacityPercent: 20,
  indexingOverheadPercent: 20,
  metadataOverheadPercent: 5,
  storageCompressionRatio: 0.7,
  annualGrowthPercent: 30,
};

let lastConfigHistoryNodeId: string | null = null;
let lastConfigHistoryAt = 0;

function readStoredTheme(): ThemeMode {
  try {
    const value = localStorage.getItem('syssim_theme');
    return value === 'light' || value === 'dark' ? value : 'dark';
  } catch {
    return 'dark';
  }
}

export const useStore = create<SysSimState>((set, get) => ({
  // Theme & UI state
  theme: readStoredTheme(),
  setTheme: (theme) => {
    localStorage.setItem('syssim_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },
  activeSidebarTab: 'palette',
  setActiveSidebarTab: (activeSidebarTab) => set({ activeSidebarTab }),
  activeBottomTab: 'metrics',
  setActiveBottomTab: (activeBottomTab) => set({ activeBottomTab }),
  isBottomDrawerOpen: false,
  setIsBottomDrawerOpen: (isBottomDrawerOpen) => set({ isBottomDrawerOpen }),
  isPropertiesPanelOpen: false,
  setIsPropertiesPanelOpen: (isPropertiesPanelOpen) => set({ isPropertiesPanelOpen }),
  snapToGrid: true,
  setSnapToGrid: (snapToGrid) => set({ snapToGrid }),
  showMinimap: true,
  setShowMinimap: (showMinimap) => set({ showMinimap }),
  edgeRouting: 'bezier',
  setEdgeRouting: (edgeRouting) => set({ edgeRouting }),

  // Toasts
  toasts: [],
  addToast: (message, type = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
    setTimeout(() => {
      get().removeToast(id);
    }, 4000);
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  // Canvas State
  nodes: [],
  edges: [],
  zones: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  historyPast: [],
  historyFuture: [],
  graphRevision: 0,
  canUndo: false,
  canRedo: false,

  setNodes: (nodesOrUpdater) => {
    set((state) => ({
      nodes: typeof nodesOrUpdater === 'function' ? nodesOrUpdater(state.nodes) : nodesOrUpdater,
    }));
  },
  setEdges: (edgesOrUpdater) => {
    set((state) => ({
      edges: typeof edgesOrUpdater === 'function' ? edgesOrUpdater(state.edges) : edgesOrUpdater,
      graphRevision: state.graphRevision + 1,
    }));
    notifyGraphMutation();
  },
  removeGraphItems: (nodeIds, edgeIds) => {
    const nodesToRemove = new Set(nodeIds);
    const edgesToRemove = new Set(edgeIds);
    if (nodesToRemove.size === 0 && edgesToRemove.size === 0) return;
    const current = get();
    const hasTarget = current.nodes.some((node) => nodesToRemove.has(node.id)) ||
      current.edges.some((edge) => edgesToRemove.has(edge.id));
    if (!hasTarget) return;
    get().pushHistory();
    set((state) => ({
      nodes: state.nodes.filter((node) => !nodesToRemove.has(node.id)),
      edges: state.edges.filter((edge) =>
        !edgesToRemove.has(edge.id) && !nodesToRemove.has(edge.source) && !nodesToRemove.has(edge.target)),
      selectedNodeId: state.selectedNodeId && nodesToRemove.has(state.selectedNodeId) ? null : state.selectedNodeId,
      selectedEdgeId: state.selectedEdgeId && edgesToRemove.has(state.selectedEdgeId) ? null : state.selectedEdgeId,
      isPropertiesPanelOpen: state.selectedNodeId && nodesToRemove.has(state.selectedNodeId) ? false : state.isPropertiesPanelOpen,
      graphRevision: state.graphRevision + 1,
    }));
    notifyGraphMutation();
  },
  setZones: (zonesOrUpdater) => {
    set((state) => ({
      zones: typeof zonesOrUpdater === 'function' ? zonesOrUpdater(state.zones) : zonesOrUpdater,
    }));
  },

  addNode: (type, position, customName) => {
    const id = `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const normalizedName = customName?.trim();
    const config = createDefaultConfig(type, id, normalizedName || undefined);
    const newNode: CanvasNode = {
      id,
      type: 'customComponent',
      position,
      data: { config },
    };

    get().pushHistory();
    set((state) => ({
      nodes: [...state.nodes, newNode],
      selectedNodeId: id,
      selectedEdgeId: null,
      isPropertiesPanelOpen: true,
      graphRevision: state.graphRevision + 1,
    }));
    notifyGraphMutation();
    return id;
  },

  duplicateNode: (nodeId) => {
    const target = get().nodes.find((n) => n.id === nodeId);
    if (!target) return null;

    const id = `${target.data.config.type}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const clonedConfig = JSON.parse(JSON.stringify(target.data.config));
    clonedConfig.id = id;
    clonedConfig.name = `${clonedConfig.name} (Copy)`;

    const newNode: CanvasNode = {
      id,
      type: 'customComponent',
      position: { x: target.position.x + 40, y: target.position.y + 40 },
      data: { config: clonedConfig },
    };

    get().pushHistory();
    set((state) => ({
      nodes: [...state.nodes, newNode],
      selectedNodeId: id,
      selectedEdgeId: null,
      isPropertiesPanelOpen: true,
      graphRevision: state.graphRevision + 1,
    }));
    notifyGraphMutation();
    return id;
  },

  updateNodePosition: (id, position) => {
    set((state) => ({
      nodes: state.nodes.map((node) => (node.id === id ? { ...node, position } : node)),
    }));
  },

  updateNodeConfig: (id, partialConfig) => {
    const now = Date.now();
    if (lastConfigHistoryNodeId !== id || now - lastConfigHistoryAt > 750) get().pushHistory();
    lastConfigHistoryNodeId = id;
    lastConfigHistoryAt = now;
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              config: { ...node.data.config, ...partialConfig } as AnyComponentConfig,
            },
          };
        }
          return node;
      }),
      graphRevision: state.graphRevision + 1,
    }));
    notifyGraphMutation();
  },

  updateNodeConfigs: (updates) => {
    if (Object.keys(updates).length === 0) return;
    set((state) => ({
      nodes: state.nodes.map((node) => updates[node.id]
        ? { ...node, data: { ...node.data, config: { ...node.data.config, ...updates[node.id] } as AnyComponentConfig } }
        : node),
      graphRevision: state.graphRevision + 1,
    }));
    notifyGraphMutation();
  },

  removeNode: (id) => {
    get().pushHistory();
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== id),
      edges: state.edges.filter((edge) => edge.source !== id && edge.target !== id),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
      isPropertiesPanelOpen: state.selectedNodeId === id ? false : state.isPropertiesPanelOpen,
      graphRevision: state.graphRevision + 1,
    }));
    notifyGraphMutation();
  },

  addEdge: (source, target, preferredProtocol, preferredPurpose) => {
    if (source === target) return false;
    const existing = get().edges.find(
      (e) =>
        (e.source === source && e.target === target) ||
        (e.source === target && e.target === source)
    );
    if (existing) return false;

    const sourceNode = get().nodes.find((n) => n.id === source);
    const targetNode = get().nodes.find((n) => n.id === target);

    let protocol = preferredProtocol || 'HTTP';

    if (sourceNode && targetNode) {
      const validation = validateConnection(
        sourceNode.data.config.type,
        targetNode.data.config.type
      );
      if (!validation.valid && validation.message) {
        get().addToast(validation.message, 'warning');
      }
      if (!preferredProtocol) {
        protocol = validation.recommendedProtocol;
      }
    }

    const id = `edge_${source}_${target}_${Date.now()}`;
    const purpose =
      preferredPurpose ||
      (sourceNode && targetNode
        ? inferEdgePurpose(sourceNode.data.config.type, targetNode.data.config.type, protocol)
        : 'request');
    if (sourceNode && targetNode) {
      const purposeValidation = validateEdgePurpose(
        sourceNode.data.config.type,
        targetNode.data.config.type,
        protocol,
        purpose,
      );
      if (!purposeValidation.valid) {
        get().addToast(purposeValidation.reason || 'Invalid edge purpose', 'error');
        return false;
      }
    }
    const newEdge: CanvasEdge = {
      id,
      source,
      target,
      type: 'protocolEdge',
      data: { protocol, purpose },
    };

    get().pushHistory();
    set((state) => ({
      edges: [...state.edges, newEdge],
      selectedEdgeId: id,
      selectedNodeId: null,
      graphRevision: state.graphRevision + 1,
    }));
    notifyGraphMutation();
    return true;
  },

  updateEdgeProtocol: (edgeId, protocol) => {
    const edge = get().edges.find((candidate) => candidate.id === edgeId);
    const source = get().nodes.find((node) => node.id === edge?.source);
    const target = get().nodes.find((node) => node.id === edge?.target);
    if (edge && source && target) {
      const validation = validateEdgePurpose(
        source.data.config.type,
        target.data.config.type,
        protocol,
        edge.data.purpose || 'request',
      );
      if (!validation.valid) {
        get().addToast(validation.reason || 'Protocol is incompatible with this edge purpose', 'error');
        return;
      }
    }
    get().pushHistory();
    set((state) => ({
      edges: state.edges.map((e) =>
        e.id === edgeId ? { ...e, data: { ...e.data, protocol } } : e
      ),
      graphRevision: state.graphRevision + 1,
    }));
    notifyGraphMutation();
  },

  updateEdgePurpose: (edgeId, purpose) => {
    const edge = get().edges.find((candidate) => candidate.id === edgeId);
    const source = get().nodes.find((node) => node.id === edge?.source);
    const target = get().nodes.find((node) => node.id === edge?.target);
    if (edge && source && target) {
      const validation = validateEdgePurpose(
        source.data.config.type,
        target.data.config.type,
        edge.data.protocol || 'HTTP',
        purpose,
      );
      if (!validation.valid) {
        get().addToast(validation.reason || 'Invalid edge purpose', 'error');
        return;
      }
    }
    get().pushHistory();
    set((state) => ({
      edges: state.edges.map((e) =>
        e.id === edgeId ? { ...e, data: { ...e.data, purpose } } : e
      ),
      graphRevision: state.graphRevision + 1,
    }));
    notifyGraphMutation();
  },

  toggleCutEdge: (edgeId) => {
    get().pushHistory();
    set((state) => ({
      edges: state.edges.map((e) =>
        e.id === edgeId
          ? {
              ...e,
              data: {
                ...e.data,
                isCut: !e.data?.isCut,
                protocol: e.data?.protocol || 'HTTP',
              },
            }
          : e
      ),
      graphRevision: state.graphRevision + 1,
    }));
    notifyGraphMutation();
  },

  removeEdge: (edgeId) => {
    get().pushHistory();
    set((state) => ({
      edges: state.edges.filter((e) => e.id !== edgeId),
      selectedEdgeId: state.selectedEdgeId === edgeId ? null : state.selectedEdgeId,
      graphRevision: state.graphRevision + 1,
    }));
    notifyGraphMutation();
  },

  selectNode: (nodeId) => {
    set((state) => ({
      selectedNodeId: nodeId,
      selectedEdgeId: nodeId ? null : state.selectedEdgeId,
      isPropertiesPanelOpen: !!nodeId,
      nodes: state.nodes.map((n) => ({ ...n, selected: n.id === nodeId })),
    }));
  },

  selectEdge: (edgeId) => {
    set((state) => ({
      selectedEdgeId: edgeId,
      selectedNodeId: edgeId ? null : state.selectedNodeId,
      edges: state.edges.map((e) => ({ ...e, selected: e.id === edgeId })),
    }));
  },

  addZone: (label, category, bounds) => {
    get().pushHistory();
    const id = `zone_${Date.now()}`;
    const colors: Record<ZoneData['category'], string> = {
      public: 'rgba(59, 130, 246, 0.08)',
      private: 'rgba(139, 92, 246, 0.08)',
      data: 'rgba(16, 185, 129, 0.08)',
      edge: 'rgba(245, 158, 11, 0.08)',
    };
    const newZone: ZoneData = {
      id,
      label,
      category,
      color: colors[category],
      ...bounds,
    };
    set((state) => ({ zones: [...state.zones, newZone] }));
  },

  removeZone: (zoneId) => {
    get().pushHistory();
    set((state) => ({ zones: state.zones.filter((z) => z.id !== zoneId) }));
  },

  updateZone: (zoneId, partial) => {
    get().pushHistory();
    set((state) => ({
      zones: state.zones.map((z) => (z.id === zoneId ? { ...z, ...partial } : z)),
    }));
  },

  autoLayout: () => {
    const { nodes, edges, zones } = get();
    if (nodes.length === 0) return;
    get().pushHistory();
    const arranged = computeAutoLayout(nodes, edges, zones);
    set({ nodes: arranged, canUndo: true, canRedo: false });
  },

  clearCanvas: () => {
    get().pushHistory();
    set({
      nodes: [],
      edges: [],
      zones: [],
      selectedNodeId: null,
      selectedEdgeId: null,
      isPropertiesPanelOpen: false,
      graphRevision: get().graphRevision + 1,
    });
    notifySimulationReset();
    notifyGraphMutation();
  },

  loadCanvasState: (nodes, edges, zones = []) => {
    const migrated = migrateCanvasState({
      nodes,
      edges,
      zones,
    } as SerializedCanvasState);
    const validated = validateArchitectureState(migrated, { repairDanglingEdges: true });
    const migratedEdges = validated.edges.map((edge, index) => ({
      ...edge,
      type: edges.find((candidate) => candidate.id === edge.id)?.type || 'protocolEdge',
      data: validated.edges[index].data,
    }));
    get().pushHistory();
    set({
      nodes: validated.nodes as CanvasNode[],
      edges: migratedEdges,
      zones: validated.zones || [],
      selectedNodeId: null,
      selectedEdgeId: null,
      isPropertiesPanelOpen: false,
      graphRevision: get().graphRevision + 1,
    });
    notifyGraphMutation();
  },

  pushHistory: () => {
    const { nodes, edges, zones, historyPast } = get();
    const snapshot: CanvasHistoryEntry = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      zones: JSON.parse(JSON.stringify(zones)),
    };
    set({
      historyPast: [...historyPast.slice(-20), snapshot],
      historyFuture: [],
      canUndo: true,
      canRedo: false,
    });
  },

  beginNodeDragHistory: () => get().pushHistory(),

  undo: () => {
    const { historyPast, historyFuture, nodes, edges, zones } = get();
    if (historyPast.length === 0) return;
    const previous = historyPast[historyPast.length - 1];
    const current: CanvasHistoryEntry = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      zones: JSON.parse(JSON.stringify(zones)),
    };

    set({
      nodes: previous.nodes,
      edges: previous.edges,
      zones: previous.zones,
      historyPast: historyPast.slice(0, -1),
      historyFuture: [current, ...historyFuture],
      selectedNodeId: null,
      selectedEdgeId: null,
      graphRevision: get().graphRevision + 1,
      canUndo: historyPast.length > 1,
      canRedo: true,
    });
    notifyGraphMutation();
  },

  redo: () => {
    const { historyPast, historyFuture, nodes, edges, zones } = get();
    if (historyFuture.length === 0) return;
    const next = historyFuture[0];
    const current: CanvasHistoryEntry = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      zones: JSON.parse(JSON.stringify(zones)),
    };

    set({
      nodes: next.nodes,
      edges: next.edges,
      zones: next.zones,
      historyPast: [...historyPast.slice(-20), current],
      historyFuture: historyFuture.slice(1),
      selectedNodeId: null,
      selectedEdgeId: null,
      graphRevision: get().graphRevision + 1,
      canUndo: true,
      canRedo: historyFuture.length > 1,
    });
    notifyGraphMutation();
  },

  // Simulation State
  simState: 'idle',
  simulationRuntimeMode: 'fallback',
  speedMultiplier: 1,
  trafficConfig: initialTrafficConfig,
  activeRequests: [],
  recentRequests: [],
  metrics: initialMetrics,
  bottlenecks: [],
  isChaosMode: false,
  chaosIntervalSec: 15,
  nodeHealthOverrides: {},
  nodeHealthSources: {},

  setSimState: (simState) => set({ simState }),
  setSpeedMultiplier: (speedMultiplier) => set({ speedMultiplier }),
  setTrafficConfig: (config) => {
    set((state) => ({ trafficConfig: { ...state.trafficConfig, ...config } }));
    notifyTrafficConfigChange(config);
  },
  setActiveRequests: (activeRequests) => set({ activeRequests }),
  setRecentRequests: (recentRequests) => set({ recentRequests }),
  updateMetrics: (partial) =>
    set((state) => ({ metrics: { ...state.metrics, ...partial } })),
  setBottlenecks: (bottlenecks) => set({ bottlenecks }),
  setChaosMode: (isChaosMode, chaosIntervalSec = 15) =>
    set({ isChaosMode, chaosIntervalSec }),
  setNodeHealthOverride: (nodeId, health, source = 'manual') => {
    set((state) => ({
      nodeHealthOverrides: { ...state.nodeHealthOverrides, [nodeId]: health },
      nodeHealthSources: { ...state.nodeHealthSources, [nodeId]: source },
      nodes: state.nodes.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, config: { ...n.data.config, health } } }
          : n
      ),
      graphRevision: state.graphRevision + 1,
    }));
    notifyGraphMutation();
  },
  resetSimulation: () =>
    set({
      simState: 'idle',
      activeRequests: [],
      recentRequests: [],
      metrics: initialMetrics,
      bottlenecks: [],
      nodeHealthOverrides: {},
      nodeHealthSources: {},
    }),

  // Scenario State
  currentScenario: null,
  activeScenario: null,
  activeScenarioId: null,
  completedScenarioIds: (() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('syssim_completed_scenarios');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return [...new Set(parsed.filter((id) => Number.isInteger(id) && id > 0 && id <= 10_000))];
        }
      }
    } catch {
      // safe fallback
    }
    return [];
  })(),
  scenarioProgress: readScenarioProgress(),
  revealedHintsCount: 0,
  showReferenceOverlay: false,
  setShowReferenceOverlay: (showReferenceOverlay) => set({ showReferenceOverlay }),
  sideBySideMode: false,
  scenarioSearchQuery: '',
  scenarioDifficultyFilter: 'All',
  scenarioCategoryFilter: 'All',

  setCurrentScenario: (currentScenario) => {
    set({ currentScenario, activeScenario: currentScenario, activeScenarioId: currentScenario?.id ?? null });
    if (currentScenario) get().updateScenarioProgress(currentScenario.id, { completionIntent: 'in-progress' });
  },

  loadScenario: (scenario) => {
    set({
      currentScenario: scenario,
      activeScenario: scenario,
      activeScenarioId: scenario.id,
      revealedHintsCount: 0,
      showReferenceOverlay: false,
      trafficConfig: scenario.trafficPreset,
    });
    notifyTrafficConfigChange(scenario.trafficPreset);
    get().recordScenarioAttempt(scenario.id);
    get().updateScenarioProgress(scenario.id, { mode: 'challenge', completionIntent: 'in-progress' });
  },

  loadReferenceDesign: (refDesign) => {
    const migrated = migrateCanvasState(refDesign);
    get().pushHistory();
    set({
      nodes: migrated.nodes as unknown as CanvasNode[],
      edges: migrated.edges.map((edge) => ({ ...edge, type: 'protocolEdge' })) as CanvasEdge[],
      zones: (migrated.zones || []) as ZoneData[],
      selectedNodeId: null,
      selectedEdgeId: null,
      isPropertiesPanelOpen: false,
      graphRevision: get().graphRevision + 1,
    });
    notifyGraphMutation();
  },

  closeScenario: () => {
    set({
      currentScenario: null,
      activeScenario: null,
      activeScenarioId: null,
      revealedHintsCount: 0,
      showReferenceOverlay: false,
      sideBySideMode: false,
    });
  },

  revealNextHint: () => {
    const { activeScenario, revealedHintsCount } = get();
    if (!activeScenario) return;
    if (revealedHintsCount < activeScenario.hints.length) {
      const next = revealedHintsCount + 1;
      set({ revealedHintsCount: next });
      get().updateScenarioProgress(activeScenario.id, { revealedHintCount: next });
    }
  },

  toggleReferenceOverlay: () => {
    set((state) => ({ showReferenceOverlay: !state.showReferenceOverlay }));
  },

  setSideBySideMode: (sideBySideMode) => set({ sideBySideMode }),

  markScenarioCompleted: (scenarioId) => {
    const { completedScenarioIds } = get();
    let updated: number[];
    if (completedScenarioIds.includes(scenarioId)) {
      updated = completedScenarioIds.filter((id) => id !== scenarioId);
    } else {
      updated = [...completedScenarioIds, scenarioId];
    }
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('syssim_completed_scenarios', JSON.stringify(updated));
      }
    } catch {
      // safe fallback
    }
    set({ completedScenarioIds: updated });
    get().updateScenarioProgress(scenarioId, {
      completionIntent: updated.includes(scenarioId) ? 'complete' : 'self-reviewed',
    });
  },

  updateScenarioProgress: (scenarioId, partial) => {
    const existing = get().scenarioProgress[scenarioId] || createScenarioProgress(scenarioId);
    const next = { ...existing, ...partial, scenarioId, updatedAt: Date.now() };
    const scenarioProgress = { ...get().scenarioProgress, [scenarioId]: next };
    try { writeScenarioProgress(scenarioProgress); } catch { /* storage is optional */ }
    set({ scenarioProgress });
  },

  recordScenarioAttempt: (scenarioId) => {
    const existing = get().scenarioProgress[scenarioId] || createScenarioProgress(scenarioId);
    get().updateScenarioProgress(scenarioId, { attempts: existing.attempts + 1, completionIntent: 'in-progress' });
  },

  setScenarioSearchQuery: (scenarioSearchQuery) => set({ scenarioSearchQuery }),
  setScenarioDifficultyFilter: (scenarioDifficultyFilter) => set({ scenarioDifficultyFilter }),
  setScenarioCategoryFilter: (scenarioCategoryFilter) => set({ scenarioCategoryFilter }),

  // Capacity Calculator State
  calculatorInputs: initialCalculatorInputs,
  setCalculatorInputs: (inputs) =>
    set((state) => ({ calculatorInputs: { ...state.calculatorInputs, ...inputs } })),
}));
