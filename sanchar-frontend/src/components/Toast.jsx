import { createContext, useContext, useState, useCallback } from "react";
import styles from "../styles/Toast.module.css";

const ToastContext = createContext(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className={styles.toast}>
        {toasts.map((t) => (
          <div key={t.id} className={styles.item}>{t.message}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
