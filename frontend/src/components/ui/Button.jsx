import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const isTest = typeof process !== 'undefined' && (process.env?.NODE_ENV === 'test' || Boolean(process.env?.VITEST));

const variantClasses = {
  primary: 'bg-optic-500 hover:bg-optic-400 text-court-950 font-bold shadow-court-sm border-optic-400 focus-visible:ring-optic-500',
  optic: 'bg-optic-500 hover:bg-optic-400 text-court-950 font-bold shadow-court-sm border-optic-400 focus-visible:ring-optic-500',
  secondary: 'bg-court-800 hover:bg-court-700 text-court-100 border-court-700',
  outline: 'bg-transparent hover:bg-court-800/60 text-court-200 border-court-700 hover:border-court-500',
  ghost: 'bg-transparent hover:bg-court-800/40 text-court-300 hover:text-white border-transparent',
  danger: 'bg-clay-600 hover:bg-clay-500 text-white font-semibold shadow-court-sm border-clay-500',
  clay: 'bg-clay-600 hover:bg-clay-500 text-white font-semibold shadow-court-sm border-clay-500',
  grass: 'bg-grass-600 hover:bg-grass-500 text-white font-semibold shadow-court-sm border-grass-500',
  gold: 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-court-sm border-amber-400',
  indigo: 'bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-court-sm border-indigo-400/30',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs rounded-sm gap-1.5 min-h-[34px]',
  md: 'px-4 py-2 text-sm rounded-md gap-2 min-h-[42px]',
  lg: 'px-6 py-2.5 text-base rounded-md gap-2.5 min-h-[48px]',
  touch: 'px-6 py-3.5 text-base rounded-lg gap-3 min-h-[52px]', // Tablet & Bar POS large touch target
};

export const Button = React.forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loading = false,
  disabled = false,
  fullWidth = false,
  startIcon,
  endIcon,
  className = '',
  onClick,
  type = 'button',
  ...props
}, ref) => {
  const shouldReduceMotion = useReducedMotion();
  const effectiveLoading = Boolean(isLoading || loading);
  const isDisabled = disabled || effectiveLoading;

  const handleClick = (e) => {
    if (isDisabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (onClick) onClick(e);
  };

  const tapAnimation = shouldReduceMotion || isDisabled || isTest ? undefined : { scale: 0.98 };

  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={effectiveLoading}
      aria-disabled={isDisabled}
      whileTap={tapAnimation}
      onClick={handleClick}
      className={`
        inline-flex items-center justify-center font-medium border transition-colors select-none
        focus:outline-none focus-visible:ring-2 focus-visible:ring-optic-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-court-950
        disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
        ${variantClasses[variant] || variantClasses.primary}
        ${sizeClasses[size] || sizeClasses.md}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {effectiveLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
          <span>{children}</span>
        </>
      ) : (
        <>
          {startIcon && <span className="shrink-0">{startIcon}</span>}
          <span>{children}</span>
          {endIcon && <span className="shrink-0">{endIcon}</span>}
        </>
      )}
    </motion.button>
  );
});

Button.displayName = 'Button';

export default Button;
