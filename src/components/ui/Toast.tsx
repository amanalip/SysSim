import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { AlertTriangle, CheckCircle, Info, XCircle, X } from 'lucide-react';
import { useStore, ToastItem } from '../../store/use-store';
import styles from './Toast.module.css';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useStore(
    useShallow((state) => ({ toasts: state.toasts, removeToast: state.removeToast })),
  );

  if (toasts.length === 0) return null;

  const getToastIcon = (type: ToastItem['type']) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle size={15} color="var(--warning)" />;
      case 'error':
        return <XCircle size={15} color="var(--error)" />;
      case 'success':
        return <CheckCircle size={15} color="var(--success)" />;
      default:
        return <Info size={15} color="var(--accent-primary)" />;
    }
  };

  const getToastClass = (type: ToastItem['type']) => {
    switch (type) {
      case 'warning':
        return styles.toastWarning;
      case 'error':
        return styles.toastError;
      case 'success':
        return styles.toastSuccess;
      default:
        return styles.toastInfo;
    }
  };

  return (
    <div className={styles.toastContainer} aria-live="polite" aria-relevant="additions removals">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${styles.toastItem} ${getToastClass(toast.type)}`}
          role={toast.type === 'error' ? 'alert' : 'status'}
        >
          <div className={styles.toastLeft}>
            {getToastIcon(toast.type)}
            <span>{toast.message}</span>
          </div>
          <button
            className={styles.dismissBtn}
            onClick={() => removeToast(toast.id)}
            title="Dismiss notification"
            aria-label={`Dismiss notification: ${toast.message}`}
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
};
