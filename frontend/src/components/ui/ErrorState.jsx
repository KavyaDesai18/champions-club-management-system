import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Button from './Button';

export const ErrorState = ({
  icon: Icon = AlertCircle,
  title = 'Something went wrong',
  message = 'An unexpected error occurred while loading this content.',
  traceId,
  onRetry,
  retryLabel = 'Try Again',
  className = '',
}) => {
  return (
    <div
      role="alert"
      className={`
        w-full p-8 rounded-3xl border border-rose-900/40 bg-rose-950/20
        text-center flex flex-col items-center justify-center gap-3
        ${className}
      `}
    >
      <div className="w-12 h-12 rounded-2xl bg-rose-900/40 border border-rose-700/50 flex items-center justify-center text-rose-400 mb-1">
        <Icon className="w-6 h-6 stroke-1.5" />
      </div>

      <h4 className="text-base font-bold text-white tracking-tight">{title}</h4>
      <p className="text-xs text-rose-200/80 max-w-sm leading-relaxed">{message}</p>

      {traceId && (
        <div className="mt-1 px-2.5 py-1 rounded-lg bg-surface-950/80 border border-slate-800 text-[10px] font-mono text-slate-400">
          Trace ID: {traceId}
        </div>
      )}

      {onRetry && (
        <div className="mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            startIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            {retryLabel}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ErrorState;
