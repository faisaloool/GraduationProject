import { React, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import "../style/Header.css";

import { useAuth } from "../context/AuthContext.jsx";
import { useExams } from "../context/ExamsProvider.jsx";
import Cookies from "js-cookie";

import { BsThreeDots } from "react-icons/bs";
import { Options_menu } from "./Options_menu.jsx";

export const Header = ({ quiz, setEditing }) => {
  const { exam, setExam, exams, loading, loadExams, deleteExam, error } =
    useExams();
  const { user, isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);

  const handleThreeDotsClick = (e) => {
    e.stopPropagation();
    setMenuOpen(!menuOpen);
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPosition({ x: rect.right - 250, y: rect.top });
  };

  const hasStoredAuth = () => {
    try {
      return Boolean(Cookies.get("quizai:token"));
    } catch {
      return false;
    }
  };

  const [loggedIn, setLoggedIn] = useState(isLoggedIn || hasStoredAuth());

  useEffect(() => {
    setLoggedIn(isLoggedIn || hasStoredAuth());
  }, [isLoggedIn]);

  useEffect(() => {
    const handleAuthChanged = () => setLoggedIn(hasStoredAuth());
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

  const shouldMountMenu = Boolean(
    loggedIn && exam?.quizTitle && exam?.quizTitle !== "Main-page"
  );
  return (
    <>
      <header>
        <div className="ai-version">Quiz AI</div>
        {!loggedIn ? (
          <div className="header-btns">
            <button className="log-in" onClick={handleClick(true)}>
              <span className="label-long">Log in</span>
              <span className="label-short">Login</span>
            </button>
            <button className="sign-up" onClick={handleClick(false)}>
              <span className="label-long">Create account</span>
              <span className="label-short">Sign up</span>
            </button>
          </div>
        ) : (
          quiz.quizTitle !== "Main-page" &&
          quiz.quizTitle && (
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

      {/* menu option */}
      {shouldMountMenu && (
        <Options_menu
          isOpen={menuOpen}
          position={menuPosition}
          setEditing={setEditing}
          quiz={exam}
          where={"header"}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </>
  );
};
