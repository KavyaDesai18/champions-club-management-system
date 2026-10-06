import React, { createContext, useContext } from 'react';
import { emitToast } from '../api/client';

const ToastContext = createContext({
  addToast: (toast) => {
    emitToast({ id: Math.random().toString(36).substring(2, 9), ...toast });
  },
});

export const ToastProvider = ({ children }) => {
  const addToast = (toast) => {
    emitToast({ id: Math.random().toString(36).substring(2, 9), ...toast });
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);

export default ToastContext;
