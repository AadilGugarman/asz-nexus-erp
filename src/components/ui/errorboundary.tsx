import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        // Full-screen overlay that respects the current theme via CSS variables
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ backgroundColor: 'var(--page-bg, #f8fafc)', color: 'var(--text-primary, #0f172a)' }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-8 text-center shadow-xl border"
            style={{
              backgroundColor: 'var(--card-bg, #ffffff)',
              borderColor: 'var(--card-border, rgba(15,23,42,0.08))',
            }}
          >
            {/* Icon */}
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10">
              <AlertTriangle className="h-8 w-8 text-rose-500" />
            </div>

            {/* Heading */}
            <h2
              className="mb-2 text-xl font-bold"
              style={{ color: 'var(--text-primary, #0f172a)' }}
            >
              Oops! Something went wrong
            </h2>

            {/* Body */}
            <p
              className="mb-6 text-sm leading-relaxed"
              style={{ color: 'var(--text-secondary, #64748b)' }}
            >
              The application encountered an unexpected error while rendering
              this page. This might be due to a temporary glitch or corrupted
              data.
            </p>

            {/* Error message */}
            {this.state.error && (
              <div
                className="mb-6 rounded-xl p-4 text-left overflow-auto border"
                style={{
                  backgroundColor: 'var(--surface-bg, #f1f5f9)',
                  borderColor: 'var(--card-border, rgba(15,23,42,0.08))',
                }}
              >
                <code className="text-xs font-mono text-rose-600 dark:text-rose-400 break-all">
                  {this.state.error.message}
                </code>
              </div>
            )}

            {/* Reload button */}
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-500 hover:scale-[1.02] active:scale-[0.98]"
            >
              <RefreshCcw className="h-4 w-4" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
