import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const variantClasses = {
  primary: 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold shadow-lg shadow-emerald-500/20 border-emerald-400/30',
  secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700',
  outline: 'bg-transparent hover:bg-slate-800/60 text-slate-200 border-slate-700 hover:border-slate-500',
  ghost: 'bg-transparent hover:bg-slate-800/40 text-slate-300 hover:text-white border-transparent',
  danger: 'bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-lg shadow-rose-600/20 border-rose-500',
  gold: 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-500/25 border-amber-400',
  indigo: 'bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/25 border-indigo-400/30',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs rounded-xl gap-1.5 min-h-[34px]',
  md: 'px-4 py-2.5 text-sm rounded-2xl gap-2 min-h-[42px]',
  lg: 'px-6 py-3.5 text-base rounded-2xl gap-2.5 min-h-[50px]',
};

export const Button = React.forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
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
  const isDisabled = disabled || isLoading;

  const handleClick = (e) => {
    if (isDisabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (onClick) onClick(e);
  };

  const tapAnimation = shouldReduceMotion || isDisabled ? {} : { scale: 0.98 };

  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={isLoading}
      aria-disabled={isDisabled}
      whileTap={tapAnimation}
      onClick={handleClick}
      className={`
        inline-flex items-center justify-center font-medium border transition-colors select-none
        focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950
        disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
        ${variantClasses[variant] || variantClasses.primary}
        ${sizeClasses[size] || sizeClasses.md}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {isLoading ? (
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
