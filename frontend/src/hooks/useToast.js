import { createContext, useContext } from 'react';

// Filled in by <ToastProvider>: showToast({ message, actionLabel, onAction, duration }).
export const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}
