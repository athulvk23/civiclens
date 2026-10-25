import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { installStaticHostApiFallback } from './utils/browserApiFallback';
import './index.css';

installStaticHostApiFallback();

class RootErrorBoundary extends React.Component<
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

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-lg w-full rounded-2xl border border-rose-500/40 bg-slate-900 p-6 space-y-4">
            <h1 className="text-lg font-bold text-rose-300">
              UI Render Error Caught
            </h1>
            <pre className="overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs font-mono text-rose-200">
              {this.state.error.message}
            </pre>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-sky-500 px-4 py-2 text-xs font-bold text-slate-950"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
);
