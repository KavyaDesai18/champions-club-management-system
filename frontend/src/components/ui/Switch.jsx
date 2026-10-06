import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export const Switch = ({
  checked = false,
  onChange,
  disabled = false,
  label,
  description,
  id,
  className = '',
  name,
}) => {
  const shouldReduceMotion = useReducedMotion();

  const handleToggle = () => {
    if (disabled) return;
    if (onChange) onChange(!checked);
  };

  const handleKeyDown = (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleToggle();
    }
  };

  return (
    <div className={`flex items-center justify-between gap-4 select-none ${className}`}>
      {(label || description) && (
        <div className="flex flex-col cursor-pointer" onClick={handleToggle}>
          {label && <span className="text-sm font-semibold text-slate-200">{label}</span>}
          {description && <span className="text-xs text-slate-400 mt-0.5">{description}</span>}
        </div>
      )}

      <button
        type="button"
        role="switch"
        id={id}
        name={name}
        aria-checked={checked}
        disabled={disabled}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={`
          relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors
          focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950
          disabled:cursor-not-allowed disabled:opacity-50
          ${checked ? 'bg-emerald-500' : 'bg-slate-800'}
        `}
      >
        <motion.span
          layout
          transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 30 }}
          className={`
            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  );
};

export default Switch;
