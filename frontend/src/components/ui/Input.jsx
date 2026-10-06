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
          className="text-xs font-semibold tracking-wide text-slate-300 dark:text-slate-300 flex items-center justify-between"
        >
          <span>
            {label} {required && <span className="text-rose-400">*</span>}
          </span>
        </label>
      )}

      <div className="relative flex items-center w-full">
        {startIcon && (
          <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400">
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
            w-full rounded-2xl text-sm transition-all outline-none border
            bg-slate-900/60 dark:bg-slate-900/80 text-slate-100 placeholder:text-slate-500
            ${startIcon ? 'pl-10' : 'pl-4'}
            ${endIcon ? 'pr-10' : 'pr-4'}
            py-2.5 min-h-[42px]
            ${
              error
                ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                : 'border-slate-800 dark:border-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          {...props}
        />

        {endIcon && (
          <div className="absolute right-3.5 flex items-center pointer-events-none text-slate-400">
            {endIcon}
          </div>
        )}
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

Input.displayName = 'Input';

export default Input;
