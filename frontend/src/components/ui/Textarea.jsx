import React, { useId, useState } from 'react';

export const Textarea = React.forwardRef(({
  label,
  error,
  helperText,
  disabled = false,
  required = false,
  showCount = false,
  maxLength,
  rows = 4,
  className = '',
  id: customId,
  onChange,
  value,
  defaultValue,
  ...props
}, ref) => {
  const generatedId = useId();
  const id = customId || generatedId;
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;

  const [charCount, setCharCount] = useState(() => {
    return (value || defaultValue || '').toString().length;
  });

  const handleChange = (e) => {
    setCharCount(e.target.value.length);
    if (onChange) onChange(e);
  };

  return (
    <div className={`w-full flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        {label && (
          <label htmlFor={id} className="text-xs font-semibold tracking-wide text-slate-300">
            {label} {required && <span className="text-rose-400">*</span>}
          </label>
        )}
        {showCount && maxLength && (
          <span className="text-[11px] text-slate-400">
            {charCount}/{maxLength}
          </span>
        )}
      </div>

      <textarea
        ref={ref}
        id={id}
        rows={rows}
        maxLength={maxLength}
        disabled={disabled}
        required={required}
        value={value}
        defaultValue={defaultValue}
        onChange={handleChange}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        className={`
          w-full rounded-2xl text-sm transition-all outline-none border p-3.5
          bg-slate-900/60 dark:bg-slate-900/80 text-slate-100 placeholder:text-slate-500
          ${
            error
              ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
              : 'border-slate-800 dark:border-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        {...props}
      />

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

Textarea.displayName = 'Textarea';

export default Textarea;
