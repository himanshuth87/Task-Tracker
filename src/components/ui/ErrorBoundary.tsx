import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          height: '100vh', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: '#0f172a',
          color: 'white',
          textAlign: 'center',
          padding: '20px'
        }}>
          <h1 className="gradient-text" style={{ fontSize: '3rem', marginBottom: '1rem' }}>Oops!</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Something went wrong. Please refresh the page.</p>
          <button 
            onClick={() => window.location.reload()}
            className="primary-gradient"
            style={{ padding: '12px 24px', borderRadius: '12px', color: 'white', fontWeight: 600 }}
          >
            Refresh Dashboard
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
