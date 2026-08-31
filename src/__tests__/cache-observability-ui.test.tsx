import { ReactFlowProvider } from '@xyflow/react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RequestParticleLayer } from '../components/canvas/animation/RequestParticleLayer';
import { RequestTracePanel } from '../components/panels/RequestTracePanel';
import { createDefaultConfig } from '../model/component-defaults';
import { SimRequest } from '../model/types';
import { useStore } from '../store/use-store';

const cacheHitRequest: SimRequest = {
  id: 'req_cache_hit',
  timestamp: 1,
  sourceNodeId: 'client',
  requestKey: 'product:42',
  status: 'success',
  color: '#06b6d4',
  totalLatencyMs: 3,
  path: [
    {
      nodeId: 'client',
      nodeName: 'client',
      nodeType: 'client',
      enterTimeMs: 0,
      exitTimeMs: 1,
      latencyMs: 1,
      status: 'processed',
    },
    {
      nodeId: 'cache',
      nodeName: 'cache',
      nodeType: 'redis_cache',
      enterTimeMs: 1,
      exitTimeMs: 3,
      latencyMs: 2,
      status: 'hit',
      info: 'Cache hit — served without origin',
    },
  ],
};

describe('cache observability UI', () => {
  beforeEach(() => {
    useStore.setState({
      activeRequests: [cacheHitRequest],
      recentRequests: [cacheHitRequest],
      simState: 'paused',
      speedMultiplier: 1,
      nodes: [
        {
          id: 'client',
          type: 'componentNode',
          position: { x: 0, y: 0 },
          data: { config: createDefaultConfig('client', 'client') },
        },
        {
          id: 'cache',
          type: 'componentNode',
          position: { x: 250, y: 0 },
          data: { config: createDefaultConfig('redis_cache', 'cache') },
        },
      ],
      edges: [
        {
          id: 'client-cache',
          source: 'client',
          target: 'cache',
          data: { protocol: 'HTTP', purpose: 'request' },
        },
      ],
    });
  });

  afterEach(() => cleanup());

  it('labels cache hits and their request key in the trace waterfall', () => {
    render(<RequestTracePanel />);
    expect(screen.getByText('HIT')).toBeInTheDocument();
    expect(screen.getByText('Cache hit — served without origin')).toBeInTheDocument();
    expect(screen.getByText('product:42')).toBeInTheDocument();
  });

  it('renders a reachable cyan particle for a cache-hit request', async () => {
    render(
      <ReactFlowProvider>
        <RequestParticleLayer />
      </ReactFlowProvider>,
    );
    const particle = await screen.findByTestId('request-particle');
    expect(particle).toHaveAttribute('data-request-color', '#06b6d4');
    expect(particle).toHaveStyle({ backgroundColor: '#06b6d4' });
  });
});
