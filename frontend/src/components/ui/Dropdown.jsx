import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

export const Dropdown = ({
  trigger,
  children,
  align = 'right',
  className = '',
  closeOnClick = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const toggle = () => setIsOpen((prev) => !prev);

  const alignClass = align === 'left' ? 'left-0' : 'right-0';

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      <div onClick={toggle} className="inline-flex cursor-pointer">
        {trigger}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            onClick={closeOnClick ? () => setIsOpen(false) : undefined}
            className={`
              absolute ${alignClass} mt-2 w-56 rounded-md border border-court-200 dark:border-court-800
              bg-white/98 dark:bg-court-900/98 p-1.5 shadow-court-md backdrop-blur-md z-50 focus:outline-none
            `}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const DropdownItem = ({
  children,
  onClick,
  icon,
  danger = false,
  disabled = false,
  className = '',
}) => {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`
        w-full flex items-center gap-2.5 px-3 py-2 rounded-sm text-xs font-medium text-left transition-colors select-none
        ${
          danger
            ? 'text-clay-600 dark:text-clay-400 hover:bg-clay-50 dark:hover:bg-clay-950/60 hover:text-clay-700 dark:hover:text-clay-300'
            : 'text-court-700 dark:text-court-200 hover:bg-court-100 dark:hover:bg-court-800/80 hover:text-court-950 dark:hover:text-white'
        }
        disabled:opacity-40 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {icon && <span className="shrink-0 text-court-400 dark:text-court-500">{icon}</span>}
      <span className="flex-1 truncate">{children}</span>
    </button>
  );
};

export const DropdownDivider = () => (
  <div className="my-1 border-t border-court-200 dark:border-court-800/80" />
);

export default Dropdown;
