import { Component, ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { hasError: boolean; error?: any };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: any): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    // opcional: console.log ou envio a logs remotos
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 16 }}>
          <h2>Ops — algo quebrou na tela</h2>
          <p className="small muted">
            Veja o console do navegador (F12 → Console) para o detalhe técnico.
          </p>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#111827', color: '#e5e7eb', padding: 12, borderRadius: 8 }}>
            {String(this.state.error || 'Erro desconhecido')}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}