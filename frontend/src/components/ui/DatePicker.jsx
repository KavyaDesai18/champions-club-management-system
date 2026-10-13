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
        <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-court-700 dark:text-court-300">
          {label} {required && <span className="text-clay-600 dark:text-clay-400">*</span>}
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
            w-full rounded-md text-sm transition-all outline-none border px-4 py-2.5 min-h-[44px]
            bg-white dark:bg-court-900 text-court-900 dark:text-court-100
            ${
              error
                ? 'border-clay-500 focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20'
                : 'border-court-300 dark:border-court-700 focus:border-optic-500 focus:ring-2 focus:ring-optic-500/25'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          {...props}
        />
      </div>

      {error ? (
        <p id={errorId} role="alert" className="text-xs text-clay-600 dark:text-clay-400 font-medium">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-xs text-court-500 dark:text-court-400">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

DatePicker.displayName = 'DatePicker';
export default DatePicker;
