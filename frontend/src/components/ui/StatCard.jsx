import React, { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { TrendingDown, TrendingUp, HelpCircle } from 'lucide-react';
import Tooltip from './Tooltip';

export const StatCard = ({
  title,
  value,
  prefix = '',
  suffix = '',
  trend,
  trendLabel = 'vs last period',
  icon: Icon,
  accentColor = 'optic', // 'optic' | 'grass' | 'clay' | 'hardcourt' | 'gold' | 'emerald' | 'indigo' | 'rose'
  tooltip,
  className = '',
}) => {
  const shouldReduceMotion = useReducedMotion();
  const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;
  const isFloat = value ? value.toString().includes('.') : false;
  const [displayValue, setDisplayValue] = useState(shouldReduceMotion ? numericValue : 0);

  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplayValue(numericValue);
      return;
    }

    let start = 0;
    const duration = 700; // ms
    const startTime = performance.now();

    const updateCounter = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Athletic easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = start + (numericValue - start) * ease;

      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      } else {
        setDisplayValue(numericValue);
      }
    };

    requestAnimationFrame(updateCounter);
  }, [numericValue, shouldReduceMotion]);

  const colorStyles = {
    optic: 'text-optic-600 dark:text-optic-400 bg-optic-500/10 border-optic-500/30',
    grass: 'text-grass-600 dark:text-grass-400 bg-grass-500/10 border-grass-500/30',
    emerald: 'text-grass-600 dark:text-grass-400 bg-grass-500/10 border-grass-500/30',
    clay: 'text-clay-600 dark:text-clay-400 bg-clay-500/10 border-clay-500/30',
    rose: 'text-clay-600 dark:text-clay-400 bg-clay-500/10 border-clay-500/30',
    hardcourt: 'text-hardcourt-600 dark:text-hardcourt-400 bg-hardcourt-500/10 border-hardcourt-500/30',
    indigo: 'text-hardcourt-600 dark:text-hardcourt-400 bg-hardcourt-500/10 border-hardcourt-500/30',
    gold: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30',
  }[accentColor] || 'text-optic-600 dark:text-optic-400 bg-optic-500/10 border-optic-500/30';

  const formattedDisplay = isFloat
    ? displayValue.toFixed(2)
    : Math.round(displayValue).toLocaleString();

  return (
    <div
      className={`
        court-card rounded-lg p-5 sm:p-6 flex flex-col justify-between select-none
        hover:border-court-300 dark:hover:border-court-700 transition-all ${className}
      `}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-court-600 dark:text-court-400">
              {title}
            </span>
            {tooltip && (
              <Tooltip content={tooltip}>
                <span className="text-court-400 hover:text-court-600 dark:hover:text-court-200 cursor-help" aria-label="More information">
                  <HelpCircle className="w-3.5 h-3.5" />
                </span>
              </Tooltip>
            )}
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold font-heading text-court-900 dark:text-court-100 tracking-tight pt-1 tabular-nums">
            {prefix && <span className="font-mono text-court-600 dark:text-court-400 text-2xl sm:text-3xl mr-0.5">{prefix}</span>}
            <span>{formattedDisplay}</span>
            {suffix && <span className="text-base sm:text-lg text-court-500 dark:text-court-400 ml-1 font-normal font-sans">{suffix}</span>}
          </div>
        </div>

        {Icon && (
          <div className={`p-3 rounded-md border ${colorStyles} shrink-0 shadow-xs`}>
            <Icon className="w-5 h-5 stroke-[1.75]" />
          </div>
        )}
      </div>

      {trend !== undefined && (
        <div className="mt-4 pt-3 border-t border-court-200 dark:border-court-800/80 flex items-center justify-between text-xs">
          <div
            className={`inline-flex items-center gap-1 font-mono font-bold tabular-nums ${
              trend >= 0
                ? 'text-grass-600 dark:text-grass-400'
                : 'text-clay-600 dark:text-clay-400'
            }`}
          >
            {trend >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5 stroke-[2]" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 stroke-[2]" />
            )}
            <span>{trend > 0 ? `+${trend}%` : `${trend}%`}</span>
          </div>
          <span className="text-[11px] text-court-500 dark:text-court-400">{trendLabel}</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;
