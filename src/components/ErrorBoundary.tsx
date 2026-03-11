import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('CRASH DETECTADO:', error, errorInfo);
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
                    padding: '2rem',
                    textAlign: 'center',
                    backgroundColor: '#f8fafc',
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                }}>
                    <div style={{
                        fontSize: '4rem',
                        marginBottom: '1rem'
                    }}>💫</div>
                    <h1 style={{ color: '#1a202c', marginBottom: '0.5rem' }}>Ops! Algo deu errado.</h1>
                    <p style={{ color: '#718096', maxWidth: '400px', marginBottom: '2rem' }}>
                        O sistema encontrou um erro inesperado ao recarregar as informações.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            padding: '0.75rem 1.5rem',
                            backgroundColor: '#3182ce',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(49, 130, 206, 0.3)'
                        }}
                    >
                        Recarregar Sistema
                    </button>
                    {import.meta.env.DEV && (
                        <pre style={{
                            marginTop: '2rem',
                            padding: '1rem',
                            backgroundColor: '#edf2f7',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            textAlign: 'left',
                            maxWidth: '90%',
                            overflow: 'auto'
                        }}>
                            {this.state.error?.toString()}
                        </pre>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}
