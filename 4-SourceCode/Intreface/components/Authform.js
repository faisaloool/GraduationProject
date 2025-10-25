import React, { useState } from "react";
import "./AuthForm.css";
export default function AuthForms() {
  const [isLogin, setLogin] = useState(true);
  return (
    <div className="auth-container">
      <div className="auth_box">
        <h2 className="title">
          Welcome to <span className="highlight">QUIZ AI</span>
        </h2>
        <p className="subtitle">Log in to you'r account to continue</p>
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
  return (
    <form className="form">
      {!isLogin && (
        <div className="inputs">
          <label>Full Name</label>
          <input type="text" placeholder="Eneter your Name" required />
        </div>
      )}
      <div className="inputs">
        <label>Email</label>
        <input type="email" placeholder="Enter your Email" required />
      </div>
      <div className="inputs">
        <label>Password</label>
        <input type="password" placeholder="Enter your Password" required />
      </div>
      <button className="submit_btn">{isLogin ? "Log In" : "Sign Up"}</button>
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
