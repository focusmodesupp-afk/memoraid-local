import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-2xl border border-[hsl(var(--destructive))]/20 bg-[hsl(var(--destructive))]/5 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--destructive))]/10">
            <AlertTriangle className="h-6 w-6 text-[hsl(var(--destructive))]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">
              משהו השתבש
            </h3>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))] max-w-xs mx-auto">
              {this.state.error?.message ?? 'אירעה שגיאה בלתי צפויה. נסה לרענן את הדף.'}
            </p>
          </div>
          <button
            type="button"
            onClick={this.handleReset}
            className="btn-outline text-sm px-4 py-2"
          >
            נסה שוב
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
