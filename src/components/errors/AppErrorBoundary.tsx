import React from 'react';
import { buildDiagnosticReport } from '../../diagnostics/diagnostic-report';
import { classifyError } from '../../errors/app-error';
import styles from './AppErrorBoundary.module.css';

interface AppErrorBoundaryState {
  error: Error | null;
  copied: boolean;
  copyFailed: boolean;
}

export class AppErrorBoundary extends React.Component<
  React.PropsWithChildren,
  AppErrorBoundaryState
> {
  public state: AppErrorBoundaryState = { error: null, copied: false, copyFailed: false };

  public static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error, copied: false, copyFailed: false };
  }

  public componentDidCatch(error: Error, info: React.ErrorInfo): void {
    const classified = classifyError(error, 'render');
    console.error('[SysSim render failure]', {
      category: classified.category,
      message: classified.message,
      componentStack: info.componentStack?.slice(0, 2_000),
    });
  }

  private copyDiagnostics = async () => {
    const report = buildDiagnosticReport({
      simulationSeed: 0,
      simulationState: 'unknown',
      runtimeMode: 'unknown',
      nodeCount: 0,
      edgeCount: 0,
      lastErrorCategory: 'render',
    });
    try {
      await navigator.clipboard.writeText(report);
      this.setState({ copied: true, copyFailed: false });
    } catch {
      this.setState({ copied: false, copyFailed: true });
    }
  };

  private resetUiPreferences = () => {
    localStorage.removeItem('syssim_theme');
    localStorage.removeItem('syssim_keyboard_shortcuts');
    window.location.reload();
  };

  public render(): React.ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <main className={styles.boundary}>
        <section className={styles.card} role="alert" aria-labelledby="render-error-title">
          <h1 id="render-error-title">SysSim could not render this view</h1>
          <p>
            Your saved snapshots were not changed. Reload the application first, or reset only UI
            preferences if the problem persists.
          </p>
          <p className={styles.details}>{this.state.error.message}</p>
          <div className={styles.actions}>
            <button type="button" onClick={() => window.location.reload()}>
              Reload application
            </button>
            <button type="button" onClick={this.resetUiPreferences}>
              Reset UI preferences
            </button>
            <button type="button" onClick={this.copyDiagnostics}>
              {this.state.copied
                ? 'Diagnostics copied'
                : this.state.copyFailed
                  ? 'Copy failed — try again'
                  : 'Copy diagnostic report'}
            </button>
          </div>
        </section>
      </main>
    );
  }
}
