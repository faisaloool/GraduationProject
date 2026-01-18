import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../style/Error_page_style.css";

export const Error_page = ({ error, message }) => {
  const location = useLocation();
  const navigate = useNavigate();
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

  const pathLabel = location?.pathname ? String(location.pathname) : null;
  const isTechnical =
    typeof displayMessage === "string" &&
    /\b(stack|trace|exception|error:|status\s*\d{3})\b/i.test(displayMessage);

  return (
    <div className="error-page">
      <div className="error-page__card" role="alert" aria-live="polite">
        <div className="error-page__header">
          <h1 className="error-page__title">Something went wrong</h1>
          <p className="error-page__subtitle">
            We couldn’t load this page. You can try again or return home.
          </p>
          {pathLabel ? (
            <p className="error-page__meta">
              Path: <span className="error-page__metaValue">{pathLabel}</span>
            </p>
          ) : null}
        </div>

        <div className="error-page__actions">
          <button
            type="button"
            className="error-page__btn error-page__btn--secondary"
            onClick={() => navigate(-1)}
          >
            Go back
          </button>
          <button
            type="button"
            className="error-page__btn error-page__btn--primary"
            onClick={() => navigate("/")}
          >
            Go home
          </button>
          <button
            type="button"
            className="error-page__btn error-page__btn--ghost"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>

        <details className="error-page__details" open={!isTechnical}>
          <summary className="error-page__summary">Technical details</summary>
          <pre className="error-page__message">{String(displayMessage)}</pre>
        </details>
      </div>
    </div>
  );
};
