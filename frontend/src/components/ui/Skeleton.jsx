import React from 'react';

export const Skeleton = ({
  variant = 'rectangular', // 'text' | 'circular' | 'rectangular'
  width,
  height,
  className = '',
  ...props
}) => {
  const variantStyles = {
    text: 'h-4 w-full rounded-md',
    circular: 'rounded-full shrink-0',
    rectangular: 'rounded-2xl',
  };

  const inlineStyles = {};
  if (width) inlineStyles.width = typeof width === 'number' ? `${width}px` : width;
  if (height) inlineStyles.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      aria-hidden="true"
      style={inlineStyles}
      className={`
        animate-pulse bg-slate-800/80 dark:bg-slate-800/80
        ${variantStyles[variant] || variantStyles.rectangular}
        ${className}
      `}
      {...props}
    />
  );
};

export default Skeleton;
