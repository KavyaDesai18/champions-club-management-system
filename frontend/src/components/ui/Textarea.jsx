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
          <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-court-700 dark:text-court-300">
            {label} {required && <span className="text-clay-600 dark:text-clay-400">*</span>}
          </label>
        )}
        {showCount && maxLength && (
          <span className="text-[11px] font-mono text-court-500 dark:text-court-400 tabular-nums">
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
          w-full rounded-md text-sm transition-all outline-none border p-3.5
          bg-white dark:bg-court-900 text-court-900 dark:text-court-100 placeholder:text-court-400 dark:placeholder:text-court-500
          ${
            error
              ? 'border-clay-500 focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20'
              : 'border-court-300 dark:border-court-700 focus:border-optic-500 focus:ring-2 focus:ring-optic-500/25'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        {...props}
      />

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

Textarea.displayName = 'Textarea';
export default Textarea;
