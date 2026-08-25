import { create } from 'zustand';
import {
  AnyComponentConfig,
  BottleneckIssue,
  CalculatorInputs,
  EdgeProtocol,
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
import { computeAutoLayout } from '../layout/auto-layout';
import { ThemeMode } from '../theme';

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

interface CanvasHistoryEntry {
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
  activeBottomTab: 'metrics' | 'bottlenecks';
  setActiveBottomTab: (tab: 'metrics' | 'bottlenecks') => void;
  isBottomDrawerOpen: boolean;
  setIsBottomDrawerOpen: (open: boolean) => void;
  isPropertiesPanelOpen: boolean;
  setIsPropertiesPanelOpen: (open: boolean) => void;
  snapToGrid: boolean;
  setSnapToGrid: (snap: boolean) => void;
  showMinimap: boolean;
  setShowMinimap: (show: boolean) => void;

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

  // Canvas Actions
  setNodes: (nodes: CanvasNode[] | ((prev: CanvasNode[]) => CanvasNode[])) => void;
  setEdges: (edges: CanvasEdge[] | ((prev: CanvasEdge[]) => CanvasEdge[])) => void;
  setZones: (zones: ZoneData[] | ((prev: ZoneData[]) => ZoneData[])) => void;
  addNode: (type: AnyComponentConfig['type'], position: { x: number; y: number }, customName?: string) => string;
  duplicateNode: (nodeId: string) => string | null;
  updateNodePosition: (id: string, position: { x: number; y: number }) => void;
  updateNodeConfig: (id: string, partialConfig: Partial<AnyComponentConfig>) => void;
  removeNode: (id: string) => void;
  addEdge: (source: string, target: string, protocol?: EdgeProtocol) => boolean;
  updateEdgeProtocol: (edgeId: string, protocol: EdgeProtocol) => void;
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
  undo: () => void;
  redo: () => void;

  // Simulation State
  simState: SimulationState;
  speedMultiplier: number;
  trafficConfig: TrafficConfig;
  activeRequests: SimRequest[];
  metrics: OverallMetrics;
  bottlenecks: BottleneckIssue[];
  isChaosMode: boolean;
  chaosIntervalSec: number;
  nodeHealthOverrides: Record<string, NodeHealthStatus>;

  // Simulation Actions
  setSimState: (state: SimulationState) => void;
  setSpeedMultiplier: (speed: number) => void;
  setTrafficConfig: (config: Partial<TrafficConfig>) => void;
  setActiveRequests: (requests: SimRequest[]) => void;
  updateMetrics: (metrics: Partial<OverallMetrics>) => void;
  setBottlenecks: (bottlenecks: BottleneckIssue[]) => void;
  setChaosMode: (enabled: boolean, intervalSec?: number) => void;
  setNodeHealthOverride: (nodeId: string, health: NodeHealthStatus) => void;
  resetSimulation: () => void;

  // Scenario State
  currentScenario: Scenario | null;
  activeScenario: Scenario | null;
  activeScenarioId: number | null;
  completedScenarioIds: number[];
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
};

export const useStore = create<SysSimState>((set, get) => ({
  // Theme & UI state
  theme: (localStorage.getItem('syssim_theme') as ThemeMode) || 'dark',
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

  setNodes: (nodesOrUpdater) => {
    set((state) => ({
      nodes: typeof nodesOrUpdater === 'function' ? nodesOrUpdater(state.nodes) : nodesOrUpdater,
    }));
  },
  setEdges: (edgesOrUpdater) => {
    set((state) => ({
      edges: typeof edgesOrUpdater === 'function' ? edgesOrUpdater(state.edges) : edgesOrUpdater,
    }));
  },
  setZones: (zonesOrUpdater) => {
    set((state) => ({
      zones: typeof zonesOrUpdater === 'function' ? zonesOrUpdater(state.zones) : zonesOrUpdater,
    }));
  },

  addNode: (type, position, customName) => {
    const id = `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const config = createDefaultConfig(type, id, customName);
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
    }));
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
    }));
    return id;
  },

  updateNodePosition: (id, position) => {
    set((state) => ({
      nodes: state.nodes.map((node) => (node.id === id ? { ...node, position } : node)),
    }));
  },

  updateNodeConfig: (id, partialConfig) => {
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
    }));
  },

  removeNode: (id) => {
    get().pushHistory();
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== id),
      edges: state.edges.filter((edge) => edge.source !== id && edge.target !== id),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
      isPropertiesPanelOpen: state.selectedNodeId === id ? false : state.isPropertiesPanelOpen,
    }));
  },

  addEdge: (source, target, preferredProtocol) => {
    if (source === target) return false;
    const existing = get().edges.find((e) => e.source === source && e.target === target);
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
    const newEdge: CanvasEdge = {
      id,
      source,
      target,
      type: 'protocolEdge',
      data: { protocol },
    };

    get().pushHistory();
    set((state) => ({
      edges: [...state.edges, newEdge],
      selectedEdgeId: id,
      selectedNodeId: null,
    }));
    return true;
  },

  updateEdgeProtocol: (edgeId, protocol) => {
    get().pushHistory();
    set((state) => ({
      edges: state.edges.map((e) =>
        e.id === edgeId ? { ...e, data: { ...e.data, protocol } } : e
      ),
    }));
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
    }));
  },

  removeEdge: (edgeId) => {
    get().pushHistory();
    set((state) => ({
      edges: state.edges.filter((e) => e.id !== edgeId),
      selectedEdgeId: state.selectedEdgeId === edgeId ? null : state.selectedEdgeId,
    }));
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
    set((state) => ({
      zones: state.zones.map((z) => (z.id === zoneId ? { ...z, ...partial } : z)),
    }));
  },

  autoLayout: () => {
    const { nodes, edges } = get();
    if (nodes.length === 0) return;
    get().pushHistory();
    const arranged = computeAutoLayout(nodes, edges);
    set({ nodes: arranged });
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
    });
  },

  loadCanvasState: (nodes, edges, zones = []) => {
    get().pushHistory();
    set({
      nodes,
      edges,
      zones,
      selectedNodeId: null,
      selectedEdgeId: null,
      isPropertiesPanelOpen: false,
    });
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
    });
  },

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
    });
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
      historyPast: [...historyPast, current],
      historyFuture: historyFuture.slice(1),
      selectedNodeId: null,
      selectedEdgeId: null,
    });
  },

  // Simulation State
  simState: 'idle',
  speedMultiplier: 1,
  trafficConfig: initialTrafficConfig,
  activeRequests: [],
  metrics: initialMetrics,
  bottlenecks: [],
  isChaosMode: false,
  chaosIntervalSec: 15,
  nodeHealthOverrides: {},

  setSimState: (simState) => set({ simState }),
  setSpeedMultiplier: (speedMultiplier) => set({ speedMultiplier }),
  setTrafficConfig: (config) =>
    set((state) => ({ trafficConfig: { ...state.trafficConfig, ...config } })),
  setActiveRequests: (activeRequests) => set({ activeRequests }),
  updateMetrics: (partial) =>
    set((state) => ({ metrics: { ...state.metrics, ...partial } })),
  setBottlenecks: (bottlenecks) => set({ bottlenecks }),
  setChaosMode: (isChaosMode, chaosIntervalSec = 15) =>
    set({ isChaosMode, chaosIntervalSec }),
  setNodeHealthOverride: (nodeId, health) =>
    set((state) => ({
      nodeHealthOverrides: { ...state.nodeHealthOverrides, [nodeId]: health },
      nodes: state.nodes.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, config: { ...n.data.config, health } } }
          : n
      ),
    })),
  resetSimulation: () =>
    set({
      simState: 'idle',
      activeRequests: [],
      metrics: initialMetrics,
      bottlenecks: [],
      nodeHealthOverrides: {},
    }),

  // Scenario State
  currentScenario: null,
  activeScenario: null,
  activeScenarioId: null,
  completedScenarioIds: JSON.parse(localStorage.getItem('syssim_completed_scenarios') || '[]'),
  revealedHintsCount: 0,
  showReferenceOverlay: false,
  setShowReferenceOverlay: (showReferenceOverlay) => set({ showReferenceOverlay }),
  sideBySideMode: false,
  scenarioSearchQuery: '',
  scenarioDifficultyFilter: 'All',
  scenarioCategoryFilter: 'All',

  setCurrentScenario: (currentScenario) => set({ currentScenario, activeScenario: currentScenario }),

  loadScenario: (scenario) => {
    set({
      currentScenario: scenario,
      activeScenario: scenario,
      activeScenarioId: scenario.id,
      revealedHintsCount: 0,
      showReferenceOverlay: false,
      trafficConfig: scenario.trafficPreset,
    });
    get().clearCanvas();
  },

  loadReferenceDesign: (refDesign) => {
    get().pushHistory();
    set({
      nodes: refDesign.nodes as unknown as CanvasNode[],
      edges: refDesign.edges as unknown as CanvasEdge[],
      zones: (refDesign.zones || []) as ZoneData[],
      selectedNodeId: null,
      selectedEdgeId: null,
      isPropertiesPanelOpen: false,
    });
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
      set({ revealedHintsCount: revealedHintsCount + 1 });
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
    localStorage.setItem('syssim_completed_scenarios', JSON.stringify(updated));
    set({ completedScenarioIds: updated });
  },

  setScenarioSearchQuery: (scenarioSearchQuery) => set({ scenarioSearchQuery }),
  setScenarioDifficultyFilter: (scenarioDifficultyFilter) => set({ scenarioDifficultyFilter }),
  setScenarioCategoryFilter: (scenarioCategoryFilter) => set({ scenarioCategoryFilter }),

  // Capacity Calculator State
  calculatorInputs: initialCalculatorInputs,
  setCalculatorInputs: (inputs) =>
    set((state) => ({ calculatorInputs: { ...state.calculatorInputs, ...inputs } })),
}));
