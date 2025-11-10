import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../style/Header.css";
import { useAuth } from "../context/AuthContext.jsx";
import { BsThreeDots } from "react-icons/bs";
import { Options_menu } from "./Options_menu.jsx";

export const Header = ({ title }) => {
  const { user, isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState(null);

  const handleThreeDotsClick = (e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPosition({ x: rect.right - 250, y: rect.top });
    setMenuOpen((prev) => !prev);
  };

  //close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
          title !== "Main-page" &&
          title && (
            <button
              className="menu-btn"
              aria-label="Menu"
              onClick={(e) => {
                handleThreeDotsClick(e);
              }}
            >
              <BsThreeDots />
            </button>
          )
        )}
      </header>
      {menuOpen && (
        <div ref={menuRef}>
          <Options_menu
            className="options-menu"
            position={menuPosition}
            onClose={() => setMenuOpen(false)}
          />
        </div>
      )}
    </>
  );
};
