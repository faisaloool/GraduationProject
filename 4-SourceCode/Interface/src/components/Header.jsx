import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../style/Header.css";
import { useAuth } from "../context/AuthContext.jsx";
import { BsThreeDots } from "react-icons/bs";

export const Header = () => {
  const { user, isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();

  const hasStoredAuth = () => {
    try {
      return Boolean(
        localStorage.getItem("token") || sessionStorage.getItem("token")
      );
    } catch {
      return false;
    }
  };

  const [loggedIn, setLoggedIn] = useState(isLoggedIn || hasStoredAuth());

  useEffect(() => {
    setLoggedIn(isLoggedIn || hasStoredAuth());
  }, [isLoggedIn]);

  useEffect(() => {
    const handleAuthChanged = () => setLoggedIn(true);
    const handleStorage = () => setLoggedIn(hasStoredAuth()); // cross-tab support
    window.addEventListener("auth:changed", handleAuthChanged);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("auth:changed", handleAuthChanged);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const handleClick = (login) => () => {
    if (login) {
      navigate(`/Log-in`);
    } else {
      navigate(`/Sign-up`);
    }
  };
  return (
    <>
      <header>
        <div className="ai-version">Quiz AI 1.0</div>
        {!loggedIn ? (
          <div className="header-btns">
            <button className="log-in" onClick={handleClick(true)}>
              Log in
            </button>
            <button className="sign-up" onClick={handleClick(false)}>
              Create account
            </button>
          </div>
        ) : (
          <button className="menu-btn" aria-label="Menu">
            <BsThreeDots />
          </button>
        )}
      </header>
    </>
  );
};
