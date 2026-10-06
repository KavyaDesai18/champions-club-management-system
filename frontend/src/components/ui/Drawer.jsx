import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';

const positionVariants = {
  right: {
    hidden: { x: '100%' },
    visible: { x: 0 },
    exit: { x: '100%' },
    classes: 'right-0 top-0 bottom-0 h-full max-w-md w-full border-l',
  },
  left: {
    hidden: { x: '-100%' },
    visible: { x: 0 },
    exit: { x: '-100%' },
    classes: 'left-0 top-0 bottom-0 h-full max-w-md w-full border-r',
  },
  bottom: {
    hidden: { y: '100%' },
    visible: { y: 0 },
    exit: { y: '100%' },
    classes: 'left-0 right-0 bottom-0 max-h-[85vh] w-full border-t rounded-t-3xl',
  },
};

export const Drawer = ({
  isOpen = false,
  onClose,
  title,
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
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
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
              fixed ${config.classes} bg-surface-900/95 dark:bg-slate-900/95 border-slate-800
              p-6 text-slate-100 shadow-2xl flex flex-col justify-between z-10 backdrop-blur-xl outline-none
            `}
          >
            <div>
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  {title && <h3 id="drawer-title" className="text-xl font-bold text-white">{title}</h3>}
                  {description && <p className="text-xs text-slate-400 mt-1">{description}</p>}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
                  aria-label="Close drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto max-h-[calc(100vh-180px)] pr-1">
                {children}
              </div>
            </div>

            {/* Footer */}
            {footer && (
              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-end gap-3 mt-4">
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
