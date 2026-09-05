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
import { PropertiesPanel } from '../components/panels/PropertiesPanel';
import { useStore } from '../store/use-store';
import { themes } from '../theme';

afterEach(cleanup);

async function expectNoAutomatedViolations(container: HTMLElement) {
  // jsdom cannot compute canvas-backed color contrast; browser QA covers visual contrast separately.
  const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
  expect(
    result.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) })),
  ).toEqual([]);
}

describe('dialog keyboard and focus contracts', () => {
  const dialogs: Array<[string, (onClose: () => void) => React.ReactNode]> = [
    ['keyboard shortcuts', (onClose) => <ShortcutsModal isOpen onClose={onClose} />],
    ['chaos drills', (onClose) => <ChaosDrillModal isOpen onClose={onClose} />],
    ['snapshots', (onClose) => <SnapshotManagerModal isOpen onClose={onClose} />],
    ['command palette', (onClose) => <CommandPalette isOpen onClose={onClose} />],
  ];

  it.each(dialogs)(
    '%s enters focus, traps Tab, closes with Escape, and restores focus',
    async (_name, renderDialog) => {
      const close = vi.fn();
      const trigger = document.createElement('button');
      trigger.textContent = 'Open dialog';
      document.body.append(trigger);
      trigger.focus();

      const view = render(<>{renderDialog(close)}</>);
      const dialog = screen.getByRole('dialog');
      await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));

      const focusable = [
        ...dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ];
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
    },
  );

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

describe('visual, form, and shortcut accessibility contracts', () => {
  const luminance = (hex: string) => {
    const channels = hex
      .slice(1)
      .match(/.{2}/g)!
      .map((value) => parseInt(value, 16) / 255)
      .map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const contrast = (foreground: string, background: string) => {
    const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
    return (values[0] + 0.05) / (values[1] + 0.05);
  };

  it.each(['dark', 'light'] as const)('%s theme text and focus tokens meet AA contrast', (mode) => {
    const colors = themes[mode];
    if (mode === 'light') {
      for (const background of [colors.bgPrimary, colors.bgSecondary, colors.bgTertiary]) {
        expect(contrast(colors.textMuted, background)).toBeGreaterThanOrEqual(4.5);
      }
    }
    expect(contrast(colors.textPrimary, colors.bgPrimary)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.textSecondary, colors.bgPrimary)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.accentHover, colors.bgPrimary)).toBeGreaterThanOrEqual(3);
  });

  it('gives every property input a name, description, range state, and shared error message', async () => {
    useStore.getState().addNode('app_server', { x: 0, y: 0 });
    const { container } = render(<PropertiesPanel />);
    await waitFor(() => {
      const controls = [
        ...container.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input, select'),
      ];
      expect(controls.length).toBeGreaterThan(0);
      for (const control of controls) {
        expect(control).toHaveAccessibleName();
        expect(control).toHaveAttribute('aria-describedby');
      }
      for (const control of controls.filter(
        (candidate): candidate is HTMLInputElement =>
          candidate instanceof HTMLInputElement && candidate.type === 'number',
      )) {
        expect(control).toHaveAttribute('aria-invalid', 'false');
        expect(control).toHaveAttribute('aria-errormessage', 'properties-field-error');
      }
    });
  });

  it('allows single-key shortcuts to be disabled while retaining modified commands', async () => {
    useStore.setState({ keyboardShortcutsEnabled: false, isChaosMode: false });
    render(<App />);
    fireEvent.keyDown(window, { key: 'c' });
    expect(useStore.getState().isChaosMode).toBe(false);
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(await screen.findByRole('dialog', { name: /command palette/i })).toBeVisible();
  });
});
