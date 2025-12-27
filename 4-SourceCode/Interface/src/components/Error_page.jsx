import React from "react";
import { useLocation } from "react-router-dom";
import "../style/Error_page_style.css";

export const Error_page = ({ error, message }) => {
  const location = useLocation();
  const state = location?.state;

  const stateMessage =
    (typeof state === "string" && state) ||
    state?.message ||
    state?.error?.message ||
    state?.error;

  const displayMessage =
    message || error?.message || stateMessage || "Unknown error.";

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
