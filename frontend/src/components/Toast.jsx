/**
 * Toast.jsx — Non-blocking notification toasts.
 *
 * Usage:
 *   const { toasts, addToast, removeToast } = useToast();
 *   addToast({ type: "success", title: "Done!", message: "Query completed." });
 *
 *   <ToastContainer toasts={toasts} onDismiss={removeToast} />
 */

import { useState, useCallback, useEffect, useRef } from "react";

// ── Hook ────────────────────────────────────────────────────────────────────
let toastIdCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ type = "info", title, message, duration = 5000 }) => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, type, title, message, duration }]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}

// ── Single toast ────────────────────────────────────────────────────────────
function ToastItem({ toast, onDismiss }) {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (toast.duration > 0) {
      timerRef.current = setTimeout(() => {
        setExiting(true);
        setTimeout(() => onDismiss(toast.id), 250);
      }, toast.duration);
    }
    return () => clearTimeout(timerRef.current);
  }, [toast.id, toast.duration, onDismiss]);

  const handleClose = () => {
    clearTimeout(timerRef.current);
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), 250);
  };

  const icons = { success: "✅", error: "❌", info: "ℹ️" };

  return (
    <div
      className={`toast toast--${toast.type}${exiting ? " toast--exit" : ""}`}
      role="alert"
      aria-live="polite"
    >
      <span className="toast__icon">{icons[toast.type] || "ℹ️"}</span>
      <div className="toast__content">
        {toast.title && <div className="toast__title">{toast.title}</div>}
        {toast.message && <div className="toast__message">{toast.message}</div>}
      </div>
      <button className="toast__close" onClick={handleClose} aria-label="Dismiss notification">×</button>
      {toast.duration > 0 && (
        <div
          className="toast__progress"
          style={{ animationDuration: `${toast.duration}ms` }}
        />
      )}
    </div>
  );
}

// ── Container ───────────────────────────────────────────────────────────────
export default function ToastContainer({ toasts, onDismiss }) {
  if (!toasts?.length) return null;

  return (
    <div className="toast-container" aria-label="Notifications">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
