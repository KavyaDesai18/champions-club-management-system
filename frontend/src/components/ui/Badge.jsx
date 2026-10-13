import React from 'react';

const badgeVariants = {
  default: 'bg-court-800 text-court-200 border-court-700',
  optic: 'bg-optic-500/15 text-optic-400 border-optic-500/40 font-bold',
  success: 'bg-grass-900/40 text-grass-400 border-grass-700/60',
  grass: 'bg-grass-900/40 text-grass-400 border-grass-700/60',
  warning: 'bg-amber-950/80 text-amber-400 border-amber-800/60',
  danger: 'bg-clay-900/50 text-clay-400 border-clay-700/60',
  clay: 'bg-clay-900/50 text-clay-400 border-clay-700/60',
  hardcourt: 'bg-hardcourt-900/50 text-hardcourt-400 border-hardcourt-700/60',
  gold: 'bg-gradient-to-r from-amber-500/20 to-gold-500/20 text-amber-300 border-amber-500/40 font-bold',
  silver: 'bg-court-800/90 text-court-300 border-court-600 font-semibold',
  junior: 'bg-cyan-950/80 text-cyan-400 border-cyan-800/60 font-semibold',
  outline: 'bg-transparent text-court-300 border-court-700',
};

const dotColors = {
  default: 'bg-court-400',
  optic: 'bg-optic-400',
  success: 'bg-grass-400',
  grass: 'bg-grass-400',
  warning: 'bg-amber-400',
  danger: 'bg-clay-400',
  clay: 'bg-clay-400',
  hardcourt: 'bg-hardcourt-400',
  gold: 'bg-amber-400',
  silver: 'bg-court-400',
  junior: 'bg-cyan-400',
  outline: 'bg-court-400',
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
