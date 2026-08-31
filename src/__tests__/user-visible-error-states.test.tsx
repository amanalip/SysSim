import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppErrorBoundary } from '../components/errors/AppErrorBoundary';
import { AppError, safeErrorMessage } from '../errors/app-error';

function BrokenView(): never {
  throw new Error('render exploded');
}

describe('user-visible error states', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it.each([
    ['user', 'User error'],
    ['validation', 'Validation error'],
    ['engine', 'Engine error'],
    ['worker', 'Worker error'],
    ['persistence', 'Persistence error'],
    ['export', 'Export error'],
    ['render', 'Render error'],
  ] as const)(
    'labels the %s category without collapsing it into a generic failure',
    (category, label) => {
      expect(safeErrorMessage(new AppError(category, 'example'), 'user')).toBe(`${label}: example`);
    },
  );

  it('offers render recovery and reports a denied clipboard operation', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    render(
      <AppErrorBoundary>
        <BrokenView />
      </AppErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('SysSim could not render this view');
    expect(screen.getByRole('button', { name: 'Reload application' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Reset UI preferences' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Copy diagnostic report' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Copy failed — try again' })).toBeEnabled(),
    );
  });
});
