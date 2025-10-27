import React from "react";
import { useNavigate } from "react-router-dom";
import "../style/Header.css";
import { useAuth } from "../context/AuthContext.jsx";
import { BsThreeDots } from "react-icons/bs";

export const Header = () => {
  const { user, isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();
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
        {!isLoggedIn ? (
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
