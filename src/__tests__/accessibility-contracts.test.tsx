import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import axe from 'axe-core';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { ChaosDrillModal } from '../components/modals/ChaosDrillModal';
import { CommandPalette } from '../components/modals/CommandPalette';
import { ShortcutsModal } from '../components/modals/ShortcutsModal';
import { SnapshotManagerModal } from '../components/modals/SnapshotManagerModal';
import { SimulationControls } from '../components/playback/SimulationControls';
import { useStore } from '../store/use-store';

afterEach(cleanup);

async function expectNoAutomatedViolations(container: HTMLElement) {
  // jsdom cannot compute canvas-backed color contrast; browser QA covers visual contrast separately.
  const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
  expect(result.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) }))).toEqual([]);
}

describe('dialog keyboard and focus contracts', () => {
  const dialogs: Array<[string, (onClose: () => void) => React.ReactNode]> = [
    ['keyboard shortcuts', (onClose) => <ShortcutsModal isOpen onClose={onClose} />],
    ['chaos drills', (onClose) => <ChaosDrillModal isOpen onClose={onClose} />],
    ['snapshots', (onClose) => <SnapshotManagerModal isOpen onClose={onClose} />],
    ['command palette', (onClose) => <CommandPalette isOpen onClose={onClose} />],
  ];

  it.each(dialogs)('%s enters focus, traps Tab, closes with Escape, and restores focus', async (_name, renderDialog) => {
    const close = vi.fn();
    const trigger = document.createElement('button');
    trigger.textContent = 'Open dialog';
    document.body.append(trigger);
    trigger.focus();

    const view = render(<>{renderDialog(close)}</>);
    const dialog = screen.getByRole('dialog');
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));

    const focusable = [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')];
    const first = focusable[0];
    const last = focusable.at(-1)!;
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(first);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(close).toHaveBeenCalledOnce();
    view.unmount();
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it('gives every dialog and icon-only close control an accessible name', () => {
    render(<ShortcutsModal isOpen onClose={() => undefined} />);
    expect(screen.getByRole('dialog', { name: /keyboard shortcuts/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /close keyboard shortcuts/i })).toBeVisible();
  });
});

describe('automated accessibility checks on core application states', () => {
  it('has no axe violations in the complete idle application', async () => {
    useStore.setState({ simState: 'idle' });
    const { container } = render(<App />);
    await act(async () => expectNoAutomatedViolations(container));
  });

  it.each(['running', 'paused', 'stopped'] as const)(
    'has no axe violations in playback controls for the %s state',
    async (simState) => {
      useStore.setState({ simState });
      const { container } = render(<SimulationControls />);
      await act(async () => expectNoAutomatedViolations(container));
    },
  );
});
