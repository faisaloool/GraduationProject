import React, { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { verifyCode } from "../util/service.js";
import {
  clearPendingVerificationUser,
  loadPendingVerificationUser,
} from "../util/pendingVerification.js";
import { Error_page } from "./Error_page.jsx";
import "../style/Verifyaccount_style.css";

const CODE_LENGTH = 6;

export const VerifyAccount = () => {
  const [digits, setDigits] = useState(() => Array(CODE_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasCheckedPendingUser, setHasCheckedPendingUser] = useState(false);
  const inputsRef = useRef([]);
  const navigate = useNavigate();
  /*   const { signup, loading } = useAuth(); */
  const { user, setUser, logout, loading } = useAuth();

  useEffect(() => {
    // The context user may be null on first render.
    // Hydrate from the "pending verification" session storage once.
    if (user?.id) {
      setHasCheckedPendingUser(true);
      return;
    }

    const pendingUser = loadPendingVerificationUser();
    if (pendingUser?.id) {
      setUser(pendingUser);
    }

    setHasCheckedPendingUser(true);
  }, [user?.id, setUser]);

  const code = useMemo(() => digits.join(""), [digits]);
  const isComplete = useMemo(
    () => digits.every((d) => d.length === 1),
    [digits]
  );

  const focusInput = (index) => {
    const el = inputsRef.current[index];
    if (el) el.focus();
  };

  const setDigitAt = (index, value) => {
    setDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleDigitChange = (index, rawValue) => {
    if (error) setError("");
    const value = String(rawValue ?? "").replace(/\D/g, "");
    if (!value) {
      setDigitAt(index, "");
      return;
    }

    // If user types/pastes multiple digits into one box, distribute them.
    const chars = value.slice(0, CODE_LENGTH - index).split("");
    setDigits((prev) => {
      const next = [...prev];
      for (let i = 0; i < chars.length; i++) {
        next[index + i] = chars[i];
      }
      return next;
    });

    const nextIndex = Math.min(index + chars.length, CODE_LENGTH - 1);
    focusInput(nextIndex);
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (digits[index]) {
        setDigitAt(index, "");
        return;
      }
      if (index > 0) {
        focusInput(index - 1);
        setDigitAt(index - 1, "");
      }
      return;
    }

    if (e.key === "ArrowLeft") {
      if (index > 0) focusInput(index - 1);
      return;
    }

    if (e.key === "ArrowRight") {
      if (index < CODE_LENGTH - 1) focusInput(index + 1);
      return;
    }
  };

  const handlePaste = (index, e) => {
    if (error) setError("");
    const text = e.clipboardData?.getData("text") ?? "";
    const onlyDigits = text.replace(/\D/g, "");
    if (!onlyDigits) return;
    e.preventDefault();
    handleDigitChange(index, onlyDigits);
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();

    if (!user?.id) {
      setError("No user data found. Please register or log in first.");
      return;
    }

    if (!isComplete || isSubmitting) return;
    setError("");
    setIsSubmitting(true);

    try {
      const result = await verifyCode(code, user.id);

      // `verifyCode` returns the request wrapper from service.js
      if (!result?.ok) {
        setError(result?.error || "The code is wrong.");
        return;
      }

      clearPendingVerificationUser();
      logout({ clearAppData: false });
      navigate("/Log-in", { replace: true });
    } catch (err) {
      setError(err?.message || "The code is wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !hasCheckedPendingUser) {
    return (
      <div className="verify-container">
        <div className="verify_box">
          <h2 className="verify-title">Verify your account</h2>
          <p className="verify-subtitle">Loading your verification details…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Error_page
        message="No user data found. Please register or log in first."
        error="404 - User not found"
      />
    );
  } else {
    return (
      <div className="verify-container">
        <div className="verify_box">
          <h2 className="verify-title">Verify your account</h2>
          <p className="verify-subtitle">
            Enter the 6-digit code sent to your email.
          </p>

          <form className="verify-form" onSubmit={handleVerifySubmit}>
            <div className="verify-code" role="group" aria-label="6-digit code">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputsRef.current[index] = el;
                  }}
                  className="code-input"
                  inputMode="numeric"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  pattern="[0-9]*"
                  maxLength={CODE_LENGTH}
                  value={digit}
                  aria-label={`Digit ${index + 1}`}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={(e) => handlePaste(index, e)}
                  onFocus={(e) => e.target.select()}
                />
              ))}
            </div>

            {error ? (
              <p className="verify-error" role="alert">
                {error}
              </p>
            ) : null}

            <button
              className="verify-submit"
              disabled={!isComplete || isSubmitting}
            >
              {isSubmitting ? "Verifying..." : "Verify"}
            </button>

            <p className="verify-hint">
              Didn’t receive a code? Check spam or try again.
            </p>
          </form>
        </div>
      </div>
    );
  }
};
