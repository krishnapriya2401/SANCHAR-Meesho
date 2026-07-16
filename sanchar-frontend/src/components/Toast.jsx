import { createContext, useCallback, useContext, useState } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div style={{
        position: "fixed", bottom: "24px", right: "24px", zIndex: 1000,
        display: "flex", flexDirection: "column", gap: "8px",
      }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              padding: "12px 18px", borderRadius: "8px", color: "#fff", fontSize: "0.9rem",
              background: t.type === "error" ? "#d9534f" : "#333",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              animation: "toastIn 0.3s ease-out",
              minWidth: "220px",
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}