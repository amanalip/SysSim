import { ReactFlowProvider } from '@xyflow/react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CanvasHud } from '../components/canvas/CanvasHud';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it('keeps instructions available until dismissed and returns focus', () => {
  vi.useFakeTimers();
  render(
    <ReactFlowProvider>
      <CanvasHud />
    </ReactFlowProvider>,
  );
  const trigger = screen.getByRole('button', { name: 'Connection help' });
  fireEvent.click(trigger);
  expect(trigger).toHaveAttribute('aria-expanded', 'true');
  act(() => vi.advanceTimersByTime(10000));
  expect(screen.getByRole('region', { name: 'Connection instructions' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Close connection help' }));
  expect(screen.queryByRole('region', { name: 'Connection instructions' })).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
  fireEvent.click(trigger);
  fireEvent.keyDown(screen.getByRole('button', { name: 'Close connection help' }), {
    key: 'Escape',
  });
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(trigger).toHaveFocus();
});
