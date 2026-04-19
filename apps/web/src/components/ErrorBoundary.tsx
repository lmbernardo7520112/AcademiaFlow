import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Global ErrorBoundary — prevents full black-screen crashes.
 * Catches unhandled rendering errors in the component tree
 * and displays a recovery UI instead of a blank page.
 */
export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[AcademiaFlow] Rendering error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          padding: '2rem',
          textAlign: 'center',
          color: '#e2e8f0',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '16px',
            padding: '2rem 3rem',
            maxWidth: '500px',
          }}>
            <h2 style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '1.5rem' }}>
              Erro Inesperado
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              Ocorreu um erro ao renderizar esta página. 
              Tente atualizar ou voltar ao painel principal.
            </p>
            {this.state.error && (
              <details style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                <summary style={{ cursor: 'pointer', color: '#64748b', fontSize: '0.85rem' }}>
                  Detalhes técnicos
                </summary>
                <pre style={{
                  marginTop: '0.5rem',
                  padding: '1rem',
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  color: '#ef4444',
                  overflow: 'auto',
                  maxHeight: '200px',
                }}>
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '0.6rem 1.5rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#e2e8f0',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Tentar Novamente
              </button>
              <button
                onClick={() => { window.location.href = '/'; }}
                style={{
                  padding: '0.6rem 1.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Ir ao Início
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
