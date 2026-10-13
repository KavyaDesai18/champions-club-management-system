import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import { subscribeToToasts } from '../../api/client';

export const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const unsubscribe = subscribeToToasts((newToast) => {
      setToasts((prev) => [...prev, newToast]);

      setTimeout(() => {
        setToasts((current) => current.filter((t) => t.id !== newToast.id));
      }, 5000);
    });

    return unsubscribe;
  }, []);

  const removeToast = (id) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  };

  return (
    <div
      id="global-toast-container"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none px-4"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className={`pointer-events-auto p-4 rounded-lg border shadow-court-lg flex items-start gap-3 backdrop-blur-md ${
              toast.type === 'error'
                ? 'bg-clay-950/95 border-clay-800 text-clay-100'
                : toast.type === 'success'
                ? 'bg-grass-950/95 border-grass-800 text-grass-100'
                : 'bg-court-900/95 border-court-700 text-court-100'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'error' ? (
                <AlertCircle className="w-5 h-5 text-clay-400 stroke-[1.75]" />
              ) : toast.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-grass-400 stroke-[1.75]" />
              ) : (
                <Info className="w-5 h-5 text-optic-400 stroke-[1.75]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold tracking-tight">{toast.title}</h4>
              <p className="text-xs text-court-300 mt-0.5 leading-relaxed break-words font-sans">
                {toast.message}
              </p>
              {toast.fieldErrors && toast.fieldErrors.length > 0 && (
                <ul className="mt-2 text-xs text-clay-300/90 list-disc list-inside space-y-0.5 font-mono">
                  {toast.fieldErrors.map((fe, idx) => (
                    <li key={idx}>
                      <span className="font-semibold">{fe.field}</span>: {fe.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-court-400 hover:text-white transition p-1 rounded-sm hover:bg-white/10 shrink-0"
              aria-label="Close notification"
            >
              <X className="w-4 h-4 stroke-[1.75]" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ToastContainer;
