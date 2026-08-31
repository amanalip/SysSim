import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PropertiesPanel } from '../components/panels/PropertiesPanel';
import { PubSubConfig } from '../model/types';
import { useStore } from '../store/use-store';

describe('messaging properties', () => {
  beforeEach(() => {
    useStore.getState().clearCanvas();
    const id = useStore.getState().addNode('pubsub', { x: 0, y: 0 });
    useStore.getState().selectNode(id);
  });

  afterEach(() => cleanup());

  it('exposes fanout, delivery, ordering, retry, timing, and DLQ controls', () => {
    render(<PropertiesPanel />);
    expect(screen.getByText('Subscribers per Topic')).toBeInTheDocument();
    expect(screen.getByText('Delivery Guarantee')).toBeInTheDocument();
    expect(screen.getByText('Ordering Guarantee')).toBeInTheDocument();
    expect(screen.getByText('Producer Ack Latency (ms)')).toBeInTheDocument();
    expect(screen.getByText('Consumer Processing Latency (ms)')).toBeInTheDocument();
    expect(screen.getByText('Retry Limit')).toBeInTheDocument();
    expect(screen.getByText('Initial Retry Delay (ms)')).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue('At least once'), {
      target: { value: 'exactly_once' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Dead-letter queue ON' }));

    const selected = useStore
      .getState()
      .nodes.find((node) => node.id === useStore.getState().selectedNodeId);
    const config = selected?.data.config as PubSubConfig;
    expect(config.deliveryGuarantee).toBe('exactly_once');
    expect(config.deadLetterQueue).toBe(false);
  });
});
