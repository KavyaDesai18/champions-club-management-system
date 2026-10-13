import React, { useId } from 'react';

export const Input = React.forwardRef(({
  label,
  error,
  helperText,
  startIcon,
  endIcon,
  disabled = false,
  required = false,
  className = '',
  id: customId,
  type = 'text',
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
        {startIcon && (
          <div className="absolute left-3.5 flex items-center pointer-events-none text-court-500 dark:text-court-400">
            {startIcon}
          </div>
        )}

        <input
          ref={ref}
          id={id}
          type={type}
          disabled={disabled}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={`
            w-full rounded-md text-sm transition-all outline-none border
            bg-white dark:bg-court-900 text-court-900 dark:text-court-100 placeholder:text-court-400 dark:placeholder:text-court-500
            ${startIcon ? 'pl-10' : 'pl-4'}
            ${endIcon ? 'pr-10' : 'pr-4'}
            py-2.5 min-h-[44px]
            ${
              error
                ? 'border-clay-500 focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20'
                : 'border-court-300 dark:border-court-700 focus:border-optic-500 focus:ring-2 focus:ring-optic-500/25'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          {...props}
        />

        {endIcon && (
          <div className="absolute right-3.5 flex items-center pointer-events-none text-court-500 dark:text-court-400">
            {endIcon}
          </div>
        )}
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

Input.displayName = 'Input';
export default Input;
