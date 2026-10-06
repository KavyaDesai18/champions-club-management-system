import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { TrendingDown, TrendingUp } from 'lucide-react';
import Tooltip from './Tooltip';

export const StatCard = ({
  title,
  value,
  prefix = '',
  suffix = '',
  trend,
  trendLabel = 'vs last week',
  icon: Icon,
  accentColor = 'emerald', // 'emerald' | 'indigo' | 'gold' | 'rose'
  tooltip,
  className = '',
}) => {
  const shouldReduceMotion = useReducedMotion();
  const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;
  const isFloat = value.toString().includes('.');
  const [displayValue, setDisplayValue] = useState(shouldReduceMotion ? numericValue : 0);

  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplayValue(numericValue);
      return;
    }

    let start = 0;
    const duration = 800; // ms
    const startTime = performance.now();

    const updateCounter = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
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
    emerald: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40',
    indigo: 'text-indigo-400 bg-indigo-950/40 border-indigo-800/40',
    gold: 'text-amber-400 bg-amber-950/40 border-amber-800/40',
    rose: 'text-rose-400 bg-rose-950/40 border-rose-800/40',
  }[accentColor] || 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40';

  const formattedDisplay = isFloat
    ? displayValue.toFixed(2)
    : Math.round(displayValue).toLocaleString();

  return (
    <div
      className={`
        glass-card glass-card-hover rounded-3xl p-6 border-slate-800/80
        flex flex-col justify-between select-none ${className}
      `}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-400 tracking-wide">{title}</span>
            {tooltip && (
              <Tooltip content={tooltip}>
                <span className="text-slate-500 hover:text-slate-300 cursor-help text-[11px] font-bold">ⓘ</span>
              </Tooltip>
            )}
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight pt-1">
            {prefix}
            <span>{formattedDisplay}</span>
            {suffix && <span className="text-lg text-slate-400 ml-1 font-normal">{suffix}</span>}
          </div>
        </div>

        {Icon && (
          <div className={`p-3 rounded-2xl border ${colorStyles} shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {trend !== undefined && (
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2 text-xs">
          <div
            className={`inline-flex items-center gap-0.5 font-bold ${
              trend >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {trend >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            <span>{trend >= 0 ? `+${trend}%` : `${trend}%`}</span>
          </div>
          <span className="text-slate-400 text-[11px]">{trendLabel}</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;
