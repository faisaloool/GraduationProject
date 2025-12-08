import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../style/Header.css";
import { useAuth } from "../context/AuthContext.jsx";
import { BsThreeDots } from "react-icons/bs";
import { Options_menu } from "./Options_menu.jsx";

export const Header = ({ quiz, setEditing }) => {
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

  // close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (e) => {
      const target = e.target;
      if (!target || !(target instanceof Element)) return;

      // ignore clicks on the menu button or inside the menu
      if (target.closest(".menu-btn")) return;
      if (menuRef.current && menuRef.current.contains(target)) return;

      setMenuOpen(false);
    };

    document.addEventListener("click", handleClickOutside, true);
    return () => {
      document.removeEventListener("click", handleClickOutside, true);
    };
  }, [menuOpen]);

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
          quiz.title !== "Main-page" &&
          quiz.title && (
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
            position={menuPosition}
            setEditing={setEditing}
            quiz={quiz}
            where={"header"}
            onClose={() => setMenuOpen(false)}
          />
        </div>
      )}
    </>
  );
};
