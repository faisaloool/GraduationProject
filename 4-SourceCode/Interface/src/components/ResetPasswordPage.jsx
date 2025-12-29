import React, { useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import "../style/ResetPasswordPage_style.css";

import { resetPassword } from "../util/service.js";

export const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const { token: tokenParam } = useParams();
  const [searchParams] = useSearchParams();

  const token = useMemo(() => {
    const queryToken = searchParams.get("token");
    return String(tokenParam || queryToken || "").trim();
  }, [tokenParam, searchParams]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const isTokenMissing = !token;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setError("");
    setSuccess("");

    if (!token) {
      setError("Invalid or missing reset token.");
      return;
    }

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const result = await resetPassword(token, password, confirmPassword);
      if (result?.error) {
        setError(result.error);
        return;
      }

      setSuccess(
        result?.message || "Your password has been updated. You can log in now."
      );

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
            disabled={loading || isTokenMissing}
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
