import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import "../style/ResetPasswordPage_style.css";

import { useAuth } from "../context/AuthContext.jsx";

import { verifyResetToken, resetPassword } from "../util/service.js";

export const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const { token } = useParams();
  const [tokenIsValid, setTokenIsValid] = useState(false);
  const { user, setUser } = useAuth();
  const [resetUserId, setResetUserId] = useState(null);

  // React 18 StrictMode/dev can run effects twice.
  // Some backends treat reset tokens as one-time use, so we cache the verification call per token.
  // This prevents double requests while still allowing state updates.
  const verifyCacheRef = useRef(new Map());

  const getPasswordComplexityError = (pw) => {
    const password = String(pw || "");
    const missing = [];

    if (password.length < 8) missing.push("8+ characters");
    if (!/[A-Z]/.test(password)) missing.push("1 uppercase letter");
    if (!/[a-z]/.test(password)) missing.push("1 lowercase letter");
    // Require a non-space non-alphanumeric character
    if (!/[^A-Za-z0-9\s]/.test(password)) missing.push("1 symbol");

    if (missing.length === 0) return "";
    return `Password must include: ${missing.join(", ")}.`;
  };
  /* const [searchParams] = useSearchParams();

  const token = useMemo(() => {
    const queryToken = searchParams.get("token");
    return String(tokenParam || queryToken || "").trim();
  }, [tokenParam, searchParams]); */

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordComplexityError = getPasswordComplexityError(password);

  const tokenValue = String(token || "").trim();
  const isTokenMissing = !tokenValue;

  useEffect(() => {
    if (!tokenValue) {
      setTokenIsValid(false);
      setResetUserId(null);
      return;
    }

    const applyResult = (result) => {
      if (result?.success) {
        setTokenIsValid(true);
        const newUserId = result?.data?.userID;
        if (newUserId != null) {
          setResetUserId(newUserId);
          setUser((prev) => ({ ...(prev || {}), id: newUserId }));
        }
      } else {
        setTokenIsValid(false);
      }
    };

    const cached = verifyCacheRef.current.get(tokenValue);

    // If we already have a resolved result, apply it.
    if (cached?.status === "done") {
      applyResult(cached.result);
      return;
    }

    // If there's an in-flight promise, attach to it.
    if (cached?.promise) {
      cached.promise.then(applyResult).catch(() => setTokenIsValid(false));
      return;
    }

    // Otherwise, start verification and cache the promise.
    const promise = verifyResetToken(tokenValue);
    verifyCacheRef.current.set(tokenValue, { promise });

    promise
      .then((res) => {
        verifyCacheRef.current.set(tokenValue, { status: "done", result: res });
        applyResult(res);
      })
      .catch(() => {
        verifyCacheRef.current.set(tokenValue, {
          status: "done",
          result: { success: false },
        });
        setTokenIsValid(false);
      });
  }, [tokenValue, setUser]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setError("");
    setSuccess("");

    if (!tokenValue) {
      setError("Invalid or missing reset token.");
      return;
    }

    const userIdToReset = resetUserId ?? user?.id;
    if (userIdToReset == null) {
      setError("Could not determine which account to reset.");
      return;
    }

    if (passwordComplexityError) {
      setError(passwordComplexityError);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const result = await resetPassword(password, userIdToReset);
      if (result?.error) {
        setError(result.error);
        return;
      }

      setSuccess(result?.message || "Your password has been updated.");

      // Small delay so the user can read the message.
      setTimeout(() => {
        navigate("/Log-in", { replace: true });
      }, 1200);
    } catch (err) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  if (!tokenIsValid) {
    return (
      <div className="reset-container">
        <div className="reset_box">
          <h2 className="reset-title">Reset link invalid</h2>
          <p className="reset-subtitle">
            This password reset link is invalid or has expired. Please request a
            new link and try again.
          </p>
          <p className="reset-footer">
            <Link to="/Log-in">Back to Log in</Link>
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="reset-container">
      <div className="reset_box">
        <h2 className="reset-title">Reset password</h2>
        <p className="reset-subtitle">
          Enter your new password below. Make sure it’s easy to remember and
          hard to guess.
        </p>

        {isTokenMissing ? (
          <p className="reset-error" role="alert" aria-live="polite">
            Invalid or missing reset token. Please open the reset link from your
            email again.
          </p>
        ) : null}

        <form className="reset-form" onSubmit={handleSubmit}>
          <div className="reset-inputs">
            <label htmlFor="newPassword">New password</label>
            <input
              id="newPassword"
              type="password"
              placeholder="Enter your new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => error && setError("")}
              autoComplete="new-password"
              required
              disabled={loading || isTokenMissing}
            />
            {password && passwordComplexityError ? (
              <p className="reset-error" role="alert" aria-live="polite">
                {passwordComplexityError}
              </p>
            ) : null}
          </div>

          <div className="reset-inputs">
            <label htmlFor="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="Re-enter your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onFocus={() => error && setError("")}
              autoComplete="new-password"
              required
              disabled={loading || isTokenMissing}
            />
          </div>

          {error ? (
            <p className="reset-error" role="alert" aria-live="polite">
              {error}
            </p>
          ) : null}

          {success ? (
            <p className="reset-success" role="status" aria-live="polite">
              {success}
            </p>
          ) : null}

          <button
            className="reset-submit"
            type="submit"
            disabled={
              loading ||
              isTokenMissing ||
              Boolean(passwordComplexityError) ||
              password !== confirmPassword
            }
          >
            {loading ? "Updating..." : "Update password"}
          </button>
        </form>

        <p className="reset-footer">
          Remembered your password? <Link to="/Log-in">Back to Log in</Link>
        </p>
      </div>
    </div>
  );
};
