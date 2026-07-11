import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './i18n/config'; // Initialize i18n
import 'prosemirror-view/style/prosemirror.css';
import { SpacetimeDBProvider } from 'spacetimedb/react';
import { DbConnection } from './module_bindings';

// SpacetimeDB connection configuration
const STDB_HOST = import.meta.env.VITE_STDB_HOST || 'localhost:3001';
const STDB_DB = import.meta.env.VITE_STDB_DB || import.meta.env.VITE_STDB_DB || 'spacetime-wiki';
const STDB_TOKEN = import.meta.env.VITE_STDB_TOKEN || undefined;

const connectionBuilder = DbConnection.builder()
  .withUri(`ws://${STDB_HOST}`)
  .withDatabaseName(STDB_DB)
  .withToken(STDB_TOKEN)
  .withLightMode(true)
  .onConnectError((_ctx, error) => {
    console.error('[STDB] Connection error:', error);
  })
  .onDisconnect((_ctx, error) => {
    if (error) console.warn('[STDB] Disconnected:', error);
    else console.log('[STDB] Disconnected');
  });

// Error boundary to catch React render errors (useful for debugging blank pages)
// Auto-retries on dynamic import failures by reloading the page
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('React ErrorBoundary caught:', error.message, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return React.createElement(
        'div',
        { style: { padding: '40px', color: 'red', fontFamily: 'monospace' } },
        React.createElement('h2', {}, 'React Error:'),
        React.createElement('pre', {}, this.state.error.message),
        React.createElement(
          'pre',
          { style: { fontSize: '11px', marginTop: '10px' } },
          this.state.error.stack?.slice(0, 1000) || '',
        ),
        React.createElement(
          'div',
          { style: { marginTop: '20px', display: 'flex', gap: '8px', alignItems: 'center' } },
          React.createElement(
            'button',
            {
              onClick: () => {
                this.setState({ error: null });
              },
            },
            'Dismiss',
          ),
          React.createElement(
            'button',
            {
              style: { marginLeft: '8px' },
              onClick: () => window.location.reload(),
            },
            'Reload page',
          ),
        ),
      );
    }
    return this.props.children;
  }
}

const App = React.lazy(() => import('./App'));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <SpacetimeDBProvider connectionBuilder={connectionBuilder}>
        <React.Suspense fallback={<div style={{ padding: 40, color: '#888' }}>Loading...</div>}>
          <App />
        </React.Suspense>
      </SpacetimeDBProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
