import React, { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { hasError: boolean; error: Error | null };

export class AdminErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Admin error boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div
          dir="rtl"
          className="min-h-[200px] flex flex-col items-center justify-center gap-4 p-8 bg-slate-900 text-slate-200 rounded-xl border border-slate-600"
        >
          <p className="text-lg font-medium text-amber-400">שגיאה בטעינת הדף</p>
          <p className="text-sm text-slate-400 max-w-md text-center">
            {this.state.error.message}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-medium"
          >
            נסה שוב
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
