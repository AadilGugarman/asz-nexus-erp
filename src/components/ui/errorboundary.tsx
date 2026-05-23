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
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 animate-in fade-in duration-500">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Oops! Something went wrong
          </h2>

          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto mb-8">
            The application encountered an unexpected error while rendering this page.
            This might be due to a temporary glitch or corrupted data.
          </p>

          {this.state.error && (
            <div className="mb-8 p-4 bg-slate-100 dark:bg-slate-800 rounded-xl text-left overflow-auto max-w-lg mx-auto border dark:border-slate-700">
              <code className="text-xs text-rose-600 dark:text-rose-400 font-mono break-all">
                {this.state.error.message}
              </code>
            </div>
          )}

          <button
            onClick={this.handleReset}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/25"
          >
            <RefreshCcw className="w-4 h-4" />
            <span>Reload Application</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
