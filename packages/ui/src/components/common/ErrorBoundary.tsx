import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/** Catches render errors so one broken panel never blanks the whole editor. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('photoditor-buddy panel error', error, info.componentStack);
  }

  private reset = (): void => this.setState({ error: null });

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error, this.reset);
    return (
      <div className="p-4 text-sm">
        <div className="font-semibold mb-1">这个面板出了点问题。</div>
        <div className="text-muted text-xs mb-3 break-words">{error.message}</div>
        <button type="button" className="h-9 px-3 rounded-lg bg-surface-3" onClick={this.reset}>
          重试
        </button>
      </div>
    );
  }
}
