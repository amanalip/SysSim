import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { SimulationControls } from '../components/playback/SimulationControls';
import { useStore } from '../store/use-store';
import { useRunHistory } from '../store/run-history';

describe('experiment controls', () => {
  beforeEach(() => {
    useRunHistory.getState().clear();
    useStore.getState().resetSimulation();
    useStore.getState().setTrafficConfig({ baseQps: 1000 });
  });
  it('explains invalid QPS without changing the active workload and accepts both limits', () => {
    render(<SimulationControls />);
    const input = screen.getByRole('spinbutton', { name: 'QPS' });
    for (const value of ['0', '50001', '1.5', '']) {
      fireEvent.change(input, { target: { value } });
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(useStore.getState().trafficConfig.baseQps).toBe(1000);
      expect(screen.getByText(/last valid QPS remains active/)).toBeVisible();
    }
    for (const value of ['1', '50000']) {
      fireEvent.change(input, { target: { value } });
      expect(input).toHaveAttribute('aria-invalid', 'false');
      expect(useStore.getState().trafficConfig.baseQps).toBe(Number(value));
    }
  });
  it('updates custom keys after restoring a workload without overwriting them on blur', () => {
    useStore.getState().setTrafficConfig({
      requestKeyDistribution: 'custom',
      customRequestKeys: [{ key: 'old', weight: 1 }],
    });
    render(<SimulationControls />);
    const input = screen.getByLabelText('Custom request keys and weights');
    expect(input).toHaveValue('old:1');
    act(() => {
      useStore.getState().setTrafficConfig({
        customRequestKeys: [{ key: 'restored', weight: 7 }],
      });
    });
    expect(input).toHaveValue('restored:7');
    fireEvent.blur(input);
    expect(useStore.getState().trafficConfig.customRequestKeys).toEqual([
      { key: 'restored', weight: 7 },
    ]);
    fireEvent.change(input, { target: { value: 'editing:3' } });
    act(() => useStore.getState().setTrafficConfig({ baseQps: 2000 }));
    expect(input).toHaveValue('editing:3');
    act(() => useStore.getState().setTrafficConfig({ customRequestKeys: [] }));
    expect(input).toHaveValue('');
  });
  it('keeps history accessible and puts specialist settings in a closed disclosure', async () => {
    const { container } = render(<SimulationControls />);
    const details = container.querySelector('details')!;
    expect(details).not.toHaveAttribute('open');
    expect(details).toContainElement(screen.getByLabelText('Simulation seed'));
    expect(screen.getByRole('button', { name: 'Run history (0)' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Run history (0)' }));
    expect(
      await screen.findByRole('dialog', { name: 'Run history & comparison' }),
    ).toHaveTextContent('press Stop');
    fireEvent.click(screen.getByRole('button', { name: 'Close run history' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
