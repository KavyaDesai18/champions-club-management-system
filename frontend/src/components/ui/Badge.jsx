import React from 'react';

const badgeVariants = {
  default: 'bg-slate-800 text-slate-200 border-slate-700',
  success: 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60',
  warning: 'bg-amber-950/80 text-amber-400 border-amber-800/60',
  danger: 'bg-rose-950/80 text-rose-400 border-rose-800/60',
  gold: 'bg-gradient-to-r from-amber-500/20 to-gold-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10 font-bold',
  silver: 'bg-slate-800/90 text-slate-300 border-slate-600 font-semibold',
  junior: 'bg-cyan-950/80 text-cyan-400 border-cyan-800/60 font-semibold',
  outline: 'bg-transparent text-slate-300 border-slate-700',
};

const dotColors = {
  default: 'bg-slate-400',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger: 'bg-rose-400',
  gold: 'bg-amber-400',
  silver: 'bg-slate-400',
  junior: 'bg-cyan-400',
  outline: 'bg-slate-400',
};

export const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className = '',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium border select-none
        ${badgeVariants[variant] || badgeVariants.default}
        ${sizeClasses}
        ${className}
      `}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant] || dotColors.default}`}
          aria-hidden="true"
        />
      )}
      <span>{children}</span>
    </span>
  );
};

export default Badge;
