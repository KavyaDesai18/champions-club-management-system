import React, { useId } from 'react';
import { Calendar } from 'lucide-react';

export const DatePicker = React.forwardRef(({
  label,
  value,
  onChange,
  min,
  max,
  error,
  helperText,
  disabled = false,
  required = false,
  className = '',
  id: customId,
  ...props
}, ref) => {
  const generatedId = useId();
  const id = customId || generatedId;
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;

  return (
    <div className={`w-full flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-xs font-semibold tracking-wide text-slate-300">
          {label} {required && <span className="text-rose-400">*</span>}
        </label>
      )}

      <div className="relative flex items-center w-full">
        <input
          ref={ref}
          id={id}
          type="date"
          value={value}
          min={min}
          max={max}
          disabled={disabled}
          required={required}
          onChange={onChange}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={`
            w-full rounded-2xl text-sm transition-all outline-none border px-4 py-2.5 min-h-[42px]
            bg-slate-900/60 dark:bg-slate-900/80 text-slate-100 scheme-dark
            ${
              error
                ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                : 'border-slate-800 dark:border-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          {...props}
        />
      </div>

      {error ? (
        <p id={errorId} role="alert" className="text-xs text-rose-400 font-medium">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-xs text-slate-400">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

DatePicker.displayName = 'DatePicker';

export default DatePicker;
