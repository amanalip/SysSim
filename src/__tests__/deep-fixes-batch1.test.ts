import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store/use-store';
import { ALL_SCENARIOS } from '../scenarios';

describe('Deep Fixes Batch 1: Scenario Detail Unconstrained Flow & Properties Controls for Auth/Encryption/Serverless', () => {
  beforeEach(() => {
    useStore.setState({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      isPropertiesPanelOpen: false,
    });
  });

  it('Fix 1: Scenario detail component loads correctly in store without height constraints', () => {
    const { loadScenario } = useStore.getState();
    const scenario = ALL_SCENARIOS[0];

    loadScenario(scenario);
    expect(useStore.getState().currentScenario?.id).toBe(scenario.id);
    expect(useStore.getState().currentScenario?.constraints.targetQps).toBe(10000);
  });

  it('Fix 2: Properties panel supports updating auth_service, encryption_service, and serverless config', () => {
    const { addNode, updateNodeConfig } = useStore.getState();

    // 1. Auth Service
    const authId = addNode('auth_service', { x: 100, y: 100 }, 'JWT Auth');
    updateNodeConfig(authId, { tokenType: 'Paseto', ttlMinutes: 120 } as any);
    const updatedAuth = useStore.getState().nodes.find((n) => n.id === authId);
    expect((updatedAuth?.data.config as any).tokenType).toBe('Paseto');
    expect((updatedAuth?.data.config as any).ttlMinutes).toBe(120);

    // 2. Encryption Service
    const encId = addNode('encryption_service', { x: 200, y: 100 }, 'AES Encryption');
    updateNodeConfig(encId, { algorithm: 'ChaCha20-Poly1305', keyRotationDays: 30 } as any);
    const updatedEnc = useStore.getState().nodes.find((n) => n.id === encId);
    expect((updatedEnc?.data.config as any).algorithm).toBe('ChaCha20-Poly1305');
    expect((updatedEnc?.data.config as any).keyRotationDays).toBe(30);

    // 3. Serverless Function
    const funcId = addNode('serverless', { x: 300, y: 100 }, 'Lambda Worker');
    updateNodeConfig(funcId, { memoryMb: 1024, coldStartLatencyMs: 50 } as any);
    const updatedFunc = useStore.getState().nodes.find((n) => n.id === funcId);
    expect((updatedFunc?.data.config as any).memoryMb).toBe(1024);
    expect((updatedFunc?.data.config as any).coldStartLatencyMs).toBe(50);
  });
});
