import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "../style/FeedbackPopup.css";

const EXIT_ANIMATION_MS = 180;
const ENTER_DELAY_MS = 20;

export function FeedbackPopup({ feedback, onClose, autoHideMs = 3500 }) {
  const open = Boolean(feedback?.message);
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [displayFeedback, setDisplayFeedback] = useState(null);

  const enterTimerRef = useRef(null);
  const hideTimerRef = useRef(null);
  const exitTimerRef = useRef(null);

  const type =
    (displayFeedback?.type || feedback?.type) === "success"
      ? "success"
      : "error";
  const message = displayFeedback?.message ?? feedback?.message;

  const clearTimers = () => {
    if (enterTimerRef.current) window.clearTimeout(enterTimerRef.current);
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
    enterTimerRef.current = null;
    hideTimerRef.current = null;
    exitTimerRef.current = null;
  };

  const beginExit = (shouldNotifyParent) => {
    if (!mounted || exiting) return;
    setExiting(true);
    setEntered(false);
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);

    exitTimerRef.current = window.setTimeout(() => {
      if (shouldNotifyParent) onClose?.();
      setMounted(false);
      setDisplayFeedback(null);
      setExiting(false);
    }, EXIT_ANIMATION_MS);
  };

  // Open -> mount + trigger enter transition.
  useEffect(() => {
    if (!open) return;

    clearTimers();
    setDisplayFeedback(feedback);
    setMounted(true);
    setExiting(false);
    setEntered(false);

    // Let the browser paint the initial (hidden) state, then transition to entered.
    enterTimerRef.current = window.setTimeout(
      () => setEntered(true),
      ENTER_DELAY_MS
    );
  }, [open, feedback?.ts]);

  // Auto-hide while open.
  useEffect(() => {
    if (!open) return;
    if (!mounted) return;
    if (exiting) return;

    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => beginExit(true), autoHideMs);
    return () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, [open, mounted, exiting, autoHideMs, feedback?.ts]);

  // If parent clears feedback without going through our close handler, animate out anyway.
  useEffect(() => {
    if (open) return;
    if (!mounted) return;
    beginExit(false);
  }, [open, mounted]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") beginExit(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, mounted, exiting]);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className={`feedback-popup feedback-popup--${type} ${
        entered ? "is-entered" : ""
      } ${exiting ? "is-exiting" : ""}`}
      role={type === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      <div className="feedback-popup__message">{String(message)}</div>
      <button
        className="feedback-popup__close"
        type="button"
        aria-label="Close"
        onClick={() => beginExit(true)}
      >
        ×
      </button>
    </div>,
    document.body
  );
}
