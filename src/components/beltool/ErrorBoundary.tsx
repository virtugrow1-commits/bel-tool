import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[BelTool] Uncaught error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex h-screen items-center justify-center bg-background text-foreground">
          <div className="max-w-md text-center p-8">
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-xl font-bold mb-2">Er ging iets mis</h1>
            <p className="text-sm text-muted-foreground mb-4">
              De Bel-Tool heeft een onverwachte fout ondervonden. Probeer de pagina te herladen.
            </p>
            <pre className="text-xs text-left bg-muted/50 rounded-lg p-3 mb-4 overflow-auto max-h-32 border border-border">
              {this.state.error?.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.97] transition-all"
            >
              Pagina herladen
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
