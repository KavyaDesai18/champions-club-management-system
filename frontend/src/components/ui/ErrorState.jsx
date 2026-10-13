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
        w-full p-8 rounded-lg border border-clay-300/80 dark:border-clay-900/50 bg-clay-50/50 dark:bg-clay-950/20
        text-center flex flex-col items-center justify-center gap-3
        ${className}
      `}
    >
      <div className="w-12 h-12 rounded-md bg-clay-100 dark:bg-clay-900/40 border border-clay-200 dark:border-clay-700/50 flex items-center justify-center text-clay-600 dark:text-clay-400 mb-1">
        <Icon className="w-6 h-6 stroke-[1.75]" />
      </div>

      <h4 className="font-heading font-bold uppercase tracking-wider text-court-950 dark:text-court-50 text-base">
        {title}
      </h4>
      <p className="text-xs text-clay-700 dark:text-clay-300/90 max-w-sm leading-relaxed">
        {message}
      </p>

      {traceId && (
        <div className="mt-1 px-2.5 py-1 rounded-xs bg-white dark:bg-court-900 border border-court-200 dark:border-court-800 text-[10px] font-mono text-court-600 dark:text-court-400">
          Trace ID: {traceId}
        </div>
      )}

      {onRetry && (
        <div className="mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            startIcon={<RefreshCw className="w-3.5 h-3.5 stroke-[1.75]" />}
          >
            {retryLabel}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ErrorState;
