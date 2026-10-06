import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';

export const Stepper = ({
  steps = [],
  activeStep = 0,
  onStepClick,
  className = '',
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className={`w-full flex items-center justify-between select-none ${className}`}>
      {steps.map((step, index) => {
        const isCompleted = index < activeStep;
        const isActive = index === activeStep;
        const isClickable = Boolean(onStepClick && index <= activeStep);

        return (
          <React.Fragment key={index}>
            {/* Step node */}
            <div
              onClick={isClickable ? () => onStepClick(index) : undefined}
              className={`
                flex flex-col items-center text-center gap-2 group
                ${isClickable ? 'cursor-pointer' : 'cursor-default'}
              `}
            >
              <div
                className={`
                  w-10 h-10 rounded-2xl border flex items-center justify-center font-bold text-xs transition-all
                  ${
                    isCompleted
                      ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                      : isActive
                      ? 'bg-surface-900 border-emerald-500 text-emerald-400 ring-4 ring-emerald-500/20 font-extrabold'
                      : 'bg-slate-900/60 border-slate-800 text-slate-500'
                  }
                `}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5 stroke-[2.5]" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>

              <div className="flex flex-col items-center">
                <span
                  className={`text-xs font-semibold tracking-wide ${
                    isActive ? 'text-white' : isCompleted ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {step.title}
                </span>
                {step.description && (
                  <span className="text-[10px] text-slate-400 hidden sm:block max-w-[100px] truncate">
                    {step.description}
                  </span>
                )}
              </div>
            </div>

            {/* Connecting line */}
            {index < steps.length - 1 && (
              <div className="flex-1 h-0.5 mx-3 mb-6 bg-slate-800 relative overflow-hidden rounded-full">
                <motion.div
                  initial={false}
                  animate={{
                    width: index < activeStep ? '100%' : '0%',
                  }}
                  transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.3 }}
                  className="h-full bg-emerald-500"
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default Stepper;
