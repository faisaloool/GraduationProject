import React from "react";
import "../style/ScrollToBottomIndicator.css";

export const ScrollToBottomIndicator = ({ visible, onActivate }) => {
  const isVisible = !!visible;

  return (
    <div
      className={`scroll-indicator ${isVisible ? "" : "hidden"}`}
      role="button"
      tabIndex={isVisible ? 0 : -1}
      onClick={isVisible ? onActivate : undefined}
      onKeyDown={(e) => {
        if (!isVisible) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivate?.();
        }
      }}
      aria-label="Scroll to bottom"
      title="Scroll to bottom"
    >
      <svg viewBox="0 0 24 24" width="30" height="30" fill="none" aria-hidden>
        <path
          d="M6 9l6 6 6-6"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
