import React from 'react';

export const Card = ({
  children,
  className = '',
  hover = false,
  glass = false,
  onClick,
  ...props
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        court-card rounded-lg p-6 text-court-900 dark:text-court-100 transition-all
        ${hover ? 'hover:border-optic-500/60 hover:shadow-court-md hover:-translate-y-0.5 cursor-pointer' : ''}
        ${glass ? 'court-header-overlay' : ''}
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
  <h3 className={`text-lg font-extrabold tracking-tight font-heading uppercase text-court-900 dark:text-court-100 ${className}`}>
    {children}
  </h3>
);

export const CardDescription = ({ children, className = '' }) => (
  <p className={`text-xs text-court-600 dark:text-court-400 leading-relaxed ${className}`}>{children}</p>
);

export const CardContent = ({ children, className = '' }) => (
  <div className={`text-sm text-court-700 dark:text-court-300 leading-normal ${className}`}>{children}</div>
);

export const CardFooter = ({ children, className = '' }) => (
  <div className={`mt-6 pt-4 border-t border-court-200 dark:border-court-800/80 flex items-center justify-between gap-4 text-xs text-court-600 dark:text-court-400 ${className}`}>
    {children}
  </div>
);

export default Card;
