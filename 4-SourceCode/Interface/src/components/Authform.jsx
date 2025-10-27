import React, { useState } from "react";
import "../style/AuthForm.css";
import { loginUser, registerUser } from "../util/service.js";

export default function AuthForms({ login }) {
  const [isLogin, setLogin] = useState(login);

  return (
    <div className="auth-container">
      <div className="auth_box">
        <h2 className="title">
          Welcome to <span className="highlight">QUIZ AI</span>
        </h2>
        <p className="subtitle">Log in to your account to continue</p>

        <div className="buttons">
          <button
            className={isLogin ? "active" : ""}
            onClick={() => setLogin(true)}
          >
            Log In
          </button>
          <button
            className={!isLogin ? "active" : ""}
            onClick={() => setLogin(false)}
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
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

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
        // Get the "Keep me signed in" checkbox
        const keepSignedIn = document.getElementById("keepSigned")?.checked;

        // Decide where to save the data
        const storage = keepSignedIn ? localStorage : sessionStorage;

        // Store token and user
        storage.setItem("token", data.token);
        storage.setItem("user", JSON.stringify(data.user));

        alert(
          "✅ " + (isLogin ? "Logged in" : "Registered") + " successfully!"
        );
        // Redirect or reload
        //window.location.href = "/dashboard"; // change this to your route
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

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

      <div className="inputs remember">
        <input id="keepSigned" type="checkbox" name="keepSigned" />
        <label htmlFor="keepSigned">Keep me signed in</label>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}
      <button className="submit_btn" disabled={loading}>
        {loading ? "Loading..." : isLogin ? "Log In" : "Sign Up"}
      </button>

      {isLogin && <p className="forget">Forget Password?</p>}

      <button type="button" className="google-btn">
        <img
          src="https://www.svgrepo.com/show/475656/google-color.svg"
          alt="Google"
        />
        {isLogin ? "Continue with Google" : "Sign up with Google"}
      </button>
    </form>
  );
}
