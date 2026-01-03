import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import "../style/FeedbackPopup.css";

export function FeedbackPopup({ feedback, onClose, autoHideMs = 3500 }) {
  const open = Boolean(feedback?.message);
  const type = feedback?.type === "success" ? "success" : "error";
  const message = feedback?.message;

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => onClose?.(), autoHideMs);
    return () => window.clearTimeout(t);
  }, [open, autoHideMs, onClose, feedback?.ts]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className={`feedback-popup feedback-popup--${type}`}
      role={type === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      <div className="feedback-popup__message">{String(message)}</div>
      <button
        className="feedback-popup__close"
        type="button"
        aria-label="Close"
        onClick={() => onClose?.()}
      >
        ×
      </button>
    </div>,
    document.body
  );
}
