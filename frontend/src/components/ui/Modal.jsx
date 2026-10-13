import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';

export const Modal = ({
  isOpen = false,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'max-w-lg',
  closeOnBackdropClick = true,
  closeOnEsc = true,
  showCloseButton = true,
}) => {
  const modalRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();

  // Focus trap & ESC key handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (closeOnEsc && e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Initial focus on first element or modal container
    const timeout = setTimeout(() => {
      const focusable = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable && focusable.length > 0) {
        focusable[0].focus();
      } else {
        modalRef.current?.focus();
      }
    }, 50);

    // Prevent background scrolling
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      clearTimeout(timeout);
    };
  }, [isOpen, closeOnEsc, onClose]);

  const modalVariants = shouldReduceMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        hidden: { opacity: 0, scale: 0.96, y: 12 },
        visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 26, stiffness: 320 } },
        exit: { opacity: 0, scale: 0.96, y: 12, transition: { duration: 0.15 } },
      };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
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

          {/* Modal Container */}
          <motion.div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
            aria-describedby={description ? 'modal-description' : undefined}
            tabIndex={-1}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`
              relative w-full ${maxWidth} rounded-xl border border-court-200 dark:border-court-800
              bg-white dark:bg-court-900 p-6 text-court-900 dark:text-court-100 shadow-court-lg z-10 my-8 outline-none
            `}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  {title && (
                    <h3 id="modal-title" className="text-xl font-extrabold font-heading tracking-tight uppercase text-court-900 dark:text-court-100">
                      {title}
                    </h3>
                  )}
                  {description && (
                    <p id="modal-description" className="text-xs text-court-600 dark:text-court-400 mt-1">
                      {description}
                    </p>
                  )}
                </div>

                {showCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-md p-1.5 text-court-500 hover:text-court-900 dark:hover:text-white hover:bg-court-100 dark:hover:bg-court-800 transition"
                    aria-label="Close modal"
                  >
                    <X className="w-5 h-5 stroke-[2]" />
                  </button>
                )}
              </div>
            )}

            {/* Body */}
            <div className="text-sm text-court-800 dark:text-court-200">{children}</div>

            {/* Footer */}
            {footer && (
              <div className="mt-6 pt-4 border-t border-court-200 dark:border-court-800/80 flex items-center justify-end gap-3">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export const ModalHeader = ({ title, description, children, className = '' }) => (
  <div className={`mb-4 ${className}`}>
    {title && <h3 className="text-xl font-extrabold font-heading tracking-tight uppercase text-court-900 dark:text-court-100">{title}</h3>}
    {description && <p className="text-xs text-court-600 dark:text-court-400 mt-1">{description}</p>}
    {children}
  </div>
);

export const ModalBody = ({ children, className = '' }) => (
  <div className={`text-sm text-court-800 dark:text-court-200 ${className}`}>{children}</div>
);

export const ModalFooter = ({ children, className = '' }) => (
  <div className={`mt-6 pt-4 border-t border-court-200 dark:border-court-800/80 flex items-center justify-end gap-3 ${className}`}>
    {children}
  </div>
);

export default Modal;
