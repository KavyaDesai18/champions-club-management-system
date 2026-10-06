import React from 'react';
import { AlertOctagon, Home, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface-950 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-lg w-full glass-card rounded-3xl p-8 border-rose-900/50 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-rose-950/80 border border-rose-700/60 flex items-center justify-center mx-auto text-rose-400">
              <AlertOctagon className="w-8 h-8 stroke-1.5" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white tracking-tight">Application Exception</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                An unexpected interface error interrupted execution. Our system captured the trace for debugging.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3.5 rounded-2xl bg-surface-950/80 border border-slate-800 text-left font-mono text-[11px] text-rose-300 max-h-32 overflow-y-auto break-all">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950 transition text-xs shadow-lg"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reload Application
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold glass-card border-slate-700 hover:bg-slate-800 text-white transition text-xs"
              >
                <Home className="w-3.5 h-3.5" /> Back to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
