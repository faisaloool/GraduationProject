import React from "react";
import { useLocation } from "react-router-dom";
import "../style/Error_page_style.css";

export const Error_page = ({ error, message }) => {
  const location = useLocation();
  const state = location?.state;

  const safeStringify = (value) => {
    try {
      return JSON.stringify(
        value,
        (_k, v) => {
          if (v instanceof Error) {
            return { name: v.name, message: v.message, stack: v.stack };
          }
          return v;
        },
        2
      );
    } catch {
      return String(value);
    }
  };

  const extractMessage = (value) => {
    if (value == null) return null;
    if (typeof value === "string") return value;
    if (value instanceof Error) return value.message || String(value);
    if (Array.isArray(value)) {
      const parts = value
        .map((v) => extractMessage(v))
        .filter(Boolean)
        .map((s) => String(s).trim())
        .filter(Boolean);
      return parts.length ? parts.join("\n") : safeStringify(value);
    }
    if (typeof value === "object") {
      // Common API / fetch error shapes
      const maybe =
        value.message ||
        value.error ||
        value.details ||
        value.statusText ||
        value.title;
      if (typeof maybe === "string" && maybe.trim()) return maybe;
      // Nested error
      if (value.error) {
        const nested = extractMessage(value.error);
        if (nested) return nested;
      }
      return safeStringify(value);
    }
    return String(value);
  };

  const stateMessage = extractMessage(state);
  const propMessage = extractMessage(message);
  const propErrorMessage = extractMessage(error);
  const displayMessage =
    propMessage || propErrorMessage || stateMessage || "Unknown error.";

  return (
    <div className="error-page">
      <div className="error-page__card" role="alert" aria-live="polite">
        <h1 className="error-page__title">Something went wrong</h1>
        <p className="error-page__subtitle">
          We couldn’t load this page. Please try again.
        </p>
        <pre className="error-page__message">{String(displayMessage)}</pre>
      </div>
    </div>
  );
};
