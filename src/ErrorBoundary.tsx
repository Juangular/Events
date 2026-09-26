import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px', fontFamily: 'system-ui, sans-serif', background: '#f5f0e8', color: '#18251f' }}>
          <div style={{ textAlign: 'center', maxWidth: '420px' }}>
            <h1 style={{ fontSize: '22px', margin: '0 0 12px' }}>Algo salió mal</h1>
            <p style={{ margin: '0 0 20px', lineHeight: 1.55, color: '#68736c' }}>
              No pudimos cargar la aplicación. Intenta recargar la página o vuelve más tarde.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: '12px 18px', border: 0, background: '#e65f31', color: 'white', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
            >
              Recargar página
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
