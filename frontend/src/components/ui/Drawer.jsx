import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';

const positionVariants = {
  right: {
    hidden: { x: '100%' },
    visible: { x: 0 },
    exit: { x: '100%' },
    classes: 'right-0 top-0 bottom-0 h-full max-w-md w-full border-l border-court-200 dark:border-court-800',
  },
  left: {
    hidden: { x: '-100%' },
    visible: { x: 0 },
    exit: { x: '-100%' },
    classes: 'left-0 top-0 bottom-0 h-full max-w-md w-full border-r border-court-200 dark:border-court-800',
  },
  bottom: {
    hidden: { y: '100%' },
    visible: { y: 0 },
    exit: { y: '100%' },
    classes: 'left-0 right-0 bottom-0 max-h-[85vh] w-full border-t border-court-200 dark:border-court-800 rounded-t-xl',
  },
};

export const Drawer = ({
  isOpen = false,
  onClose,
  title,
  subtitle,
  description,
  children,
  footer,
  position = 'right',
  closeOnBackdropClick = true,
  closeOnEsc = true,
}) => {
  const drawerRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();
  const config = positionVariants[position] || positionVariants.right;
  const desc = description || subtitle;

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (closeOnEsc && e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
        return;
      }

      if (e.key === 'Tab' && drawerRef.current) {
        const focusables = drawerRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    const timeout = setTimeout(() => {
      const focusables = drawerRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables && focusables.length > 0) {
        focusables[0].focus();
      }
    }, 50);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      clearTimeout(timeout);
    };
  }, [isOpen, closeOnEsc, onClose]);

  const motionTransition = shouldReduceMotion
    ? { duration: 0 }
    : { type: 'spring', damping: 30, stiffness: 300 };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeOnBackdropClick ? onClose : undefined}
            className="fixed inset-0 bg-court-950/75 dark:bg-black/80 backdrop-blur-xs"
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <motion.div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'drawer-title' : undefined}
            tabIndex={-1}
            variants={config}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={motionTransition}
            className={`
              fixed ${config.classes} bg-white dark:bg-court-900
              p-6 text-court-900 dark:text-court-100 shadow-court-lg flex flex-col justify-between z-10 outline-none
            `}
          >
            <div>
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  {title && (
                    <h3 id="drawer-title" className="text-xl font-extrabold font-heading tracking-tight uppercase text-court-900 dark:text-court-100">
                      {title}
                    </h3>
                  )}
                  {desc && <p className="text-xs text-court-600 dark:text-court-400 mt-1">{desc}</p>}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md p-1.5 text-court-500 hover:text-court-900 dark:hover:text-white hover:bg-court-100 dark:hover:bg-court-800 transition"
                  aria-label="Close drawer"
                >
                  <X className="w-5 h-5 stroke-[2]" />
                </button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto max-h-[calc(100vh-180px)] pr-1 text-court-800 dark:text-court-200">
                {children}
              </div>
            </div>

            {/* Footer */}
            {footer && (
              <div className="pt-4 border-t border-court-200 dark:border-court-800/80 flex items-center justify-end gap-3 mt-4">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Drawer;
