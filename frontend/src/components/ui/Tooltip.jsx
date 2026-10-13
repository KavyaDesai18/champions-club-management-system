import React, { useId, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

const positions = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

export const Tooltip = ({
  content,
  children,
  position = 'top',
  delay = 150,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timer, setTimer] = useState(null);
  const tooltipId = useId();
  const shouldReduceMotion = useReducedMotion();

  const show = () => {
    const t = setTimeout(() => setIsVisible(true), delay);
    setTimer(t);
  };

  const hide = () => {
    if (timer) clearTimeout(timer);
    setIsVisible(false);
  };

  if (!content) return children;

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {React.cloneElement(React.Children.only(children), {
        'aria-describedby': isVisible ? tooltipId : undefined,
      })}

      <AnimatePresence>
        {isVisible && (
          <motion.div
            id={tooltipId}
            role="tooltip"
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className={`
              absolute ${positions[position] || positions.top} z-50 pointer-events-none whitespace-nowrap
              rounded-xs bg-court-900 dark:bg-court-100 text-court-100 dark:text-court-950
              border border-court-700/80 dark:border-court-200/80 px-2 py-0.5 text-[11px] font-medium
              shadow-court-md backdrop-blur-md tracking-tight
            `}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Tooltip;
