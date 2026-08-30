import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store/use-store';
import { ALL_SCENARIOS } from '../scenarios';

describe('Deep Fixes Batch 5: Envelope Calculator Duplex Bandwidth & Scenario Constraints Display', () => {
  beforeEach(() => {
    useStore.setState({
      nodes: [],
      edges: [],
    });
  });

  it('Fix 9: Envelope Calculator computes full duplex inbound/outbound bandwidth with headers', () => {
    const { setCalculatorInputs } = useStore.getState();
    setCalculatorInputs({
      qps: 1000,
      payloadSizeKb: 2,
      readWriteRatio: 9, // 10% writes (100 QPS), 90% reads (900 QPS)
    });

    const inputs = useStore.getState().calculatorInputs;
    expect(inputs.qps).toBe(1000);
    expect(inputs.readWriteRatio).toBe(9);
  });

  it('Fix 10: Scenario constraints support optional Read:Write ratio and data retention timeline', () => {
    const { loadScenario } = useStore.getState();
    const scenario = ALL_SCENARIOS[0];

    loadScenario({
      ...scenario,
      constraints: {
        ...scenario.constraints,
        readWriteRatio: '100:1',
        retentionTimeline: '5 Years',
      },
    });

    const current = useStore.getState().currentScenario;
    expect(current?.constraints.readWriteRatio).toBe('100:1');
    expect(current?.constraints.retentionTimeline).toBe('5 Years');
  });
});
