import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../style/AuthForm.css";
import {
  loginUser,
  registerUser,
  requestPasswordResetEmail,
} from "../util/service.js";
import { useAuth } from "../context/AuthContext.jsx";
import { savePendingVerificationUser } from "../util/pendingVerification.js";

export default function AuthForms({ isLogin, setIsLogin }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === "/Log-in") setIsLogin(true);
    if (location.pathname === "/Sign-up") setIsLogin(false);
  }, [location.pathname, setIsLogin]);

  return (
    <div className="auth-container">
      <div className="auth_box">
        <h2 className="title">
          <span className="welcom"> Welcome to </span>{" "}
          <span className="highlight">Quiz AI</span>
        </h2>
        <p className="subtitle">Log in to your account to continue</p>

        <div className="buttons">
          <button
            className={isLogin ? "active" : ""}
            onClick={() => {
              setIsLogin(true);
              navigate("/Log-in");
            }}
          >
            Log In
          </button>
          <button
            className={!isLogin ? "active" : ""}
            onClick={() => {
              setIsLogin(false);
              navigate("/Sign-up");
            }}
          >
            Sign Up
          </button>
        </div>

        <Form isLogin={isLogin} />
      </div>
    </div>
  );
}

function Form({ isLogin }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, setUser } = useAuth();

  const NAME_LIMITS = {
    MIN: 2,
    MAX: 50,
  };

  const EMAIL_LIMITS = {
    MAX: 254,
  };

  const getNameError = (rawName) => {
    const clean = String(rawName || "").trim();
    if (!clean) return "Full name is required.";
    if (clean.length < NAME_LIMITS.MIN) {
      return `Full name must be at least ${NAME_LIMITS.MIN} characters.`;
    }
    if (clean.length > NAME_LIMITS.MAX) {
      return `Full name must be ${NAME_LIMITS.MAX} characters or less.`;
    }
    return "";
  };

  const getEmailError = (rawEmail) => {
    const clean = String(rawEmail || "").trim();
    if (!clean) return "Email is required.";
    if (clean.length > EMAIL_LIMITS.MAX) return "Email is too long.";

    // Simple, practical email check (HTML5 type=email is also present).
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clean)) return "Please enter a valid email address.";
    return "";
  };

  const getSignupPasswordError = (pw) => {
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

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  const signupPasswordError = !isLogin ? getSignupPasswordError(password) : "";
  const signupNameError = !isLogin ? getNameError(name) : "";
  const emailError = getEmailError(email);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!isLogin && signupNameError) {
      setError(signupNameError);
      return;
    }

    if (emailError) {
      setError(emailError);
      return;
    }

    if (!isLogin && signupPasswordError) {
      setError(signupPasswordError);
      return;
    }

    setLoading(true);

    try {
      let data;
      const cleanEmail = String(email || "").trim();
      if (isLogin) {
        data = await loginUser(cleanEmail, password);
      } else {
        const cleanName = String(name || "").trim();
        data = await registerUser(cleanName, cleanEmail, password);
      }

      if (data.error) {
        setError(data.error);
      } else {
        if (isLogin) {
          const keepSignedIn =
            document.getElementById("keepSigned")?.checked || false;
          // Use the new login function from context
          login(data.user, data.token, keepSignedIn);
          const from = location?.state?.from;
          if (typeof from === "string" && from.trim()) {
            navigate(from, { replace: true });
          } else {
            navigate("/");
          }
        } else {
          setUser(data.user);
          savePendingVerificationUser(data.user);
          navigate("/verifyaccount");
        }
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const handleForgotPassword = async () => {
    if (sendingReset) return;
    setError("");
    setInfo("");

    const emailErr = getEmailError(email);
    if (emailErr) {
      setError(emailErr);
      return;
    }

    setSendingReset(true);
    try {
      const result = await requestPasswordResetEmail(
        String(email || "").trim()
      );
      if (result?.error) {
        setError(result.error);
        return;
      }
      setInfo(
        result?.message ||
          "If this email exists, we sent you a link to change your password."
      );
    } catch (err) {
      setError(err?.message || "Failed to send password reset email.");
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      {!isLogin && (
        <div className="inputs">
          <label>Full Name</label>
          <input
            type="text"
            placeholder="Enter your name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={NAME_LIMITS.MAX}
          />
          {name && signupNameError ? (
            <p className="auth-error" role="alert" aria-live="polite">
              {signupNameError}
            </p>
          ) : null}
        </div>
      )}

      <div className="inputs">
        <label>Email</label>
        <input
          type="email"
          placeholder="Enter your Email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={EMAIL_LIMITS.MAX}
        />
        {email && emailError ? (
          <p className="auth-error" role="alert" aria-live="polite">
            {emailError}
          </p>
        ) : null}
      </div>

      <div className="inputs">
        <label>Password</label>
        <input
          type="password"
          placeholder="Enter your Password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {!isLogin && password && signupPasswordError && (
          <p className="auth-error" role="alert" aria-live="polite">
            {signupPasswordError}
          </p>
        )}
      </div>

      {isLogin && (
        <div className="inputs remember">
          <input id="keepSigned" type="checkbox" name="keepSigned" />
          <label htmlFor="keepSigned">Keep me signed in</label>
        </div>
      )}

      {error && (
        <p className="auth-error" role="alert" aria-live="polite">
          {error}
        </p>
      )}

      {info && (
        <p className="auth-success" role="status" aria-live="polite">
          {info}
        </p>
      )}

      <button
        className="submit_btn"
        disabled={
          loading ||
          (!isLogin && name && Boolean(signupNameError)) ||
          (email && Boolean(emailError)) ||
          (!isLogin && password && Boolean(signupPasswordError))
        }
      >
        {loading ? "Loading..." : isLogin ? "Log In" : "Sign Up"}
      </button>

      {isLogin && (
        <button
          type="button"
          className="forgot"
          onClick={handleForgotPassword}
          disabled={sendingReset}
        >
          {sendingReset ? "Sending..." : "Forget Password?"}
        </button>
      )}
    </form>
  );
}
