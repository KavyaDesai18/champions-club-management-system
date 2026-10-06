import React, { useId } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

export const Checkbox = React.forwardRef(({
  label,
  description,
  checked,
  defaultChecked,
  onChange,
  disabled = false,
  error,
  className = '',
  id: customId,
  ...props
}, ref) => {
  const generatedId = useId();
  const id = customId || generatedId;

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={id} className={`flex items-start gap-3 select-none ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
        <div className="relative flex items-center justify-center mt-0.5">
          <input
            ref={ref}
            id={id}
            type="checkbox"
            checked={checked}
            defaultChecked={defaultChecked}
            onChange={onChange}
            disabled={disabled}
            className="peer sr-only"
            {...props}
          />
          <div
            className={`
              w-5 h-5 rounded-lg border flex items-center justify-center transition-all
              bg-slate-900 border-slate-700 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-400
              peer-checked:bg-emerald-500 peer-checked:border-emerald-500 text-slate-950
              ${error ? 'border-rose-500' : ''}
            `}
          >
            <Check className="w-3.5 h-3.5 stroke-[3] opacity-0 peer-checked:opacity-100 transition-opacity" />
          </div>
        </div>

        {(label || description) && (
          <div className="flex flex-col text-sm">
            {label && <span className="font-medium text-slate-200">{label}</span>}
            {description && <span className="text-xs text-slate-400 mt-0.5">{description}</span>}
          </div>
        )}
      </label>

      {error && <p className="text-xs text-rose-400 ml-8 font-medium">{error}</p>}
    </div>
  );
});

Checkbox.displayName = 'Checkbox';

export default Checkbox;
