import React from 'react';

export const Card = ({
  children,
  className = '',
  hover = false,
  glass = true,
  onClick,
  ...props
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        rounded-3xl border border-slate-800/80 p-6 text-slate-100 transition-all
        ${glass ? 'glass-card' : 'bg-surface-900'}
        ${hover ? 'glass-card-hover cursor-pointer' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className = '', action }) => (
  <div className={`flex items-start justify-between gap-4 mb-4 ${className}`}>
    <div className="space-y-1">{children}</div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

export const CardTitle = ({ children, className = '' }) => (
  <h3 className={`text-lg font-bold tracking-tight text-white ${className}`}>
    {children}
  </h3>
);

export const CardDescription = ({ children, className = '' }) => (
  <p className={`text-xs text-slate-400 ${className}`}>{children}</p>
);

export const CardContent = ({ children, className = '' }) => (
  <div className={`text-sm text-slate-300 ${className}`}>{children}</div>
);

export const CardFooter = ({ children, className = '' }) => (
  <div className={`mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-4 ${className}`}>
    {children}
  </div>
);

export default Card;
