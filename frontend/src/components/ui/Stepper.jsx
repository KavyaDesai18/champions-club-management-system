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
                  w-9 h-9 rounded-md border flex items-center justify-center font-heading font-bold text-xs tabular-nums transition-all
                  ${
                    isCompleted
                      ? 'bg-grass-600 border-grass-500 text-white shadow-court-sm'
                      : isActive
                      ? 'bg-optic-500 border-optic-400 text-court-950 ring-4 ring-optic-500/25 font-extrabold shadow-court-sm'
                      : 'bg-court-100 dark:bg-court-800/80 border-court-200 dark:border-court-700 text-court-400 dark:text-court-500'
                  }
                `}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 stroke-[2.2]" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>

              <div className="flex flex-col items-center">
                <span
                  className={`text-xs font-heading font-bold uppercase tracking-wider ${
                    isActive
                      ? 'text-court-950 dark:text-white'
                      : isCompleted
                      ? 'text-court-700 dark:text-court-300'
                      : 'text-court-400 dark:text-court-500'
                  }`}
                >
                  {step.title}
                </span>
                {step.description && (
                  <span className="text-[10px] text-court-500 dark:text-court-400 hidden sm:block max-w-[110px] truncate mt-0.5">
                    {step.description}
                  </span>
                )}
              </div>
            </div>

            {/* Connecting line */}
            {index < steps.length - 1 && (
              <div className="flex-1 h-0.5 mx-3 mb-6 bg-court-200 dark:bg-court-800 relative overflow-hidden rounded-full">
                <motion.div
                  initial={false}
                  animate={{
                    width: index < activeStep ? '100%' : '0%',
                  }}
                  transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.25 }}
                  className="h-full bg-grass-600 dark:bg-grass-500"
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
