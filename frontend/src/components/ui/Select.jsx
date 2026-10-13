import React, { useId } from 'react';
import { ChevronDown } from 'lucide-react';

export const Select = React.forwardRef(({
  label,
  options = [],
  children,
  error,
  helperText,
  disabled = false,
  required = false,
  placeholder,
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
        <label
          htmlFor={id}
          className="text-xs font-semibold uppercase tracking-wider text-court-700 dark:text-court-300 flex items-center justify-between"
        >
          <span>
            {label} {required && <span className="text-clay-600 dark:text-clay-400">*</span>}
          </span>
        </label>
      )}

      <div className="relative flex items-center w-full">
        <select
          ref={ref}
          id={id}
          disabled={disabled}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={`
            w-full rounded-md text-sm transition-all appearance-none outline-none border pr-10 pl-4 py-2.5 min-h-[44px]
            bg-white dark:bg-court-900 text-court-900 dark:text-court-100
            ${
              error
                ? 'border-clay-500 focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20'
                : 'border-court-300 dark:border-court-700 focus:border-optic-500 focus:ring-2 focus:ring-optic-500/25'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.length > 0
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-white dark:bg-court-900 text-court-900 dark:text-court-100">
                  {opt.label}
                </option>
              ))
            : children}
        </select>

        <div className="absolute right-3.5 pointer-events-none text-court-500 dark:text-court-400">
          <ChevronDown className="w-4 h-4" />
        </div>
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

Select.displayName = 'Select';
export default Select;
