import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../style/AuthForm.css";
import {
  loginUser,
  registerUser,
  requestPasswordResetEmail,
} from "../util/service.js";
import { useAuth } from "../context/AuthContext.jsx";

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

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");

    try {
      let data;
      if (isLogin) {
        data = await loginUser(email, password);
      } else {
        data = await registerUser(name, email, password);
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

    if (!email.trim()) {
      setError("Please enter your email first.");
      return;
    }

    setSendingReset(true);
    try {
      const result = await requestPasswordResetEmail(email);
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
          />
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
        />
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

      <button className="submit_btn" disabled={loading}>
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
