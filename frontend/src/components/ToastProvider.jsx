import { useCallback, useMemo, useRef, useState } from 'react';
import { ToastContext } from '../hooks/useToast.js';
import styles from './ToastProvider.module.css';

const DEFAULT_DURATION = 5000;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  // onExpire runs when the toast times out without its action being used; that is how
  // "Undo" works: the real work waits until the toast is gone.
  const showToast = useCallback(
    ({ message, actionLabel, onAction, onExpire, duration = DEFAULT_DURATION }) => {
      const id = nextId.current++;
      const timer = setTimeout(() => {
        dismiss(id);
        onExpire?.();
      }, duration);
      const act = () => {
        clearTimeout(timer);
        dismiss(id);
        onAction?.();
      };
      setToasts((current) => [...current, { id, message, actionLabel, act, duration }]);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.region} role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={styles.toast}>
            <span className={styles.message}>{toast.message}</span>
            {toast.actionLabel && (
              <button type="button" className={styles.action} onClick={toast.act}>
                {toast.actionLabel}
              </button>
            )}
            <span
              className={styles.timer}
              style={{ animationDuration: `${toast.duration}ms` }}
              aria-hidden="true"
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
