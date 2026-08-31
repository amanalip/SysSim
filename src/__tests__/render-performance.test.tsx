import { Profiler } from 'react';
import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Header } from '../components/layout/Header';
import { useStore } from '../store/use-store';

describe('focused Zustand render subscriptions', () => {
  beforeEach(() => {
    useStore.setState({ metrics: { ...useStore.getState().metrics, currentQps: 0 } });
  });

  it('does not re-render the header for unrelated high-frequency metric updates', () => {
    const onRender = vi.fn();
    render(
      <Profiler id="header" onRender={onRender}>
        <Header />
      </Profiler>,
    );
    const mountCount = onRender.mock.calls.length;
    act(() => {
      useStore.getState().updateMetrics({ currentQps: 100 });
      useStore.getState().updateMetrics({ currentQps: 200 });
    });
    expect(onRender).toHaveBeenCalledTimes(mountCount);
  });
});
