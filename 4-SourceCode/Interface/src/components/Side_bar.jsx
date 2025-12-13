import React from "react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";

import { Quiz_card } from "./Quiz_card";
import { Options_menu } from "./Options_menu";
import "../style/Side_bar.css";
import { Account } from "./Account";

import { useAuth } from "../context/AuthContext.jsx";
import { useExams } from "../context/ExamsProvider.jsx";

import { BsReverseLayoutSidebarReverse } from "react-icons/bs";
import { IoCreateOutline } from "react-icons/io5";
import { IoSearch } from "react-icons/io5";
import { IoLibraryOutline } from "react-icons/io5";

export const Side_bar = ({ editing, setEditing }) => {
  const navigate = useNavigate();

  const [collaps, setCollaps] = React.useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);
  const [menuQuiz, setMenuQuiz] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const menuRef = useRef(null);

  const { user, isLoggedIn, logout, token } = useAuth();
  const { exam, setExam, exams, loading, loadExams, deleteExam, error } =
    useExams();

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const matchingExams = normalizedSearch
    ? exams.filter(({ title }) =>
        title?.toLowerCase().includes(normalizedSearch)
      )
    : [];

  const closeSearch = () => {
    setShowSearch(false);
    setSearchTerm("");
  };

  const handleSelectExam = (selected) => {
    setExam(selected);
    navigate(`/exam/${selected.examId || selected.quizId}`);
    closeSearch();
  };

  useEffect(() => {
    if (!showSearch) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") closeSearch();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showSearch]);

  const renderQuizzes = () => {
    if (error) {
      return (
        <div className="error-message">
          <p>Error loading quizzes: {error.message}</p>
        </div>
      );
    }

    if (loading) {
      return (
        <div>
          {[...Array(4)].map((_, idx) => (
            <div key={idx} className="quiz-card skeleton-card">
              <div className="skeleton-title" />
              <div className="skeleton-dot" />
            </div>
          ))}
        </div>
      );
    }

    return (
      <div>
        {exams.map((e) => (
          <Quiz_card
            key={e.examId || e.quizId}
            e={e}
            editing={editing}
            setEditing={setEditing}
            setMenuPosition={setMenuPosition}
            setMenuOpen={setMenuOpen}
            setMenuQuiz={setMenuQuiz}
          />
        ))}
      </div>
    );
  };

  const handleClosePopUp = () => {
    setEditing({ id: -999 });
    setMenuQuiz(null);
  };

  const handleConfirmDelete = async () => {
    try {
      if (!menuQuiz) return handleClosePopUp();
      const id = menuQuiz.examId || menuQuiz.quizId;
      await deleteExam(id);
      if ((exam?.examId || exam?.quizId) === id) {
        setExam({ title: "Main-page" });
        navigate("/");
      }
    } finally {
      setMenuOpen(false);
      handleClosePopUp();
    }
  };

  // close popup with Escape
  useEffect(() => {
    if (editing.id === -999) return;
    const onKey = (e) => {
      if (e.key === "Escape") handleClosePopUp();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing]);

  return (
    <>
      {isLoggedIn && (
        <div
          className={`side-bar ${collaps ? "collapsed" : ""}`}
          onClick={() => {
            if (collaps) setCollaps(false);
          }}
        >
          <div className="top-of-side-bar">
            <div className={collaps==true?"closlogo" :"Logo"}>
              <img src="#" alt="Quiz AI logo" />
            </div>
            <div onClick={() => setCollaps(!collaps)}>
              {!collaps && (
                <div className="shrink shrink-icon">
                  <div>
                    <BsReverseLayoutSidebarReverse />
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="side-bar-body">
            <nav>
              <ul>
                <li
                  onClick={() => {
                    setExam({ title: "Main-page" });
                    navigate("/");
                  }}
                >
                  <div className="Item">
                    <IoCreateOutline className="side-bar-icons" />
                    {!collaps && <a>New Quiz</a>}
                  </div>
                </li>
                <li>
                  <div className="Item" onClick={() => setShowSearch(true)}>
                    <IoSearch className="side-bar-icons" />
                    {!collaps && <a>Search</a>}
                  </div>
                </li>
              </ul>
            </nav>
            {!collaps && (
              <div className="Quizzes">
                <details open>
                  <summary className="quizss"><p>Quizzes</p></summary>
                  <div className="quizzes-list">{renderQuizzes()}</div>
                </details>
              </div>
            )}
          </div>
          <Account collapsed={collaps} />
        </div>
      )}

      {showSearch &&
        createPortal(
          <div
            className="sidebar-search-overlay"
            onClick={closeSearch}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="sidebar-search-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sidebar-search-header">
                <div>
                  <h3>Find a quiz</h3>
                  <p>Search by quiz title and jump straight to it.</p>
                </div>
                <button
                  type="button"
                  className="sidebar-search-close"
                  aria-label="Close search"
                  onClick={closeSearch}
                >
                  ×
                </button>
              </div>

              <input
                type="search"
                placeholder="Type a quiz name…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />

              <div className="sidebar-search-results">
                {!normalizedSearch && (
                  <p className="sidebar-search-hint">
                    Start typing to see matching quizzes.
                  </p>
                )}

                {normalizedSearch && matchingExams.length === 0 && (
                  <p className="sidebar-search-hint">
                    No exam named “{searchTerm.trim()}”.
                  </p>
                )}

                {matchingExams.map((examCard) => (
                  <button
                    key={examCard.examId || examCard.quizId}
                    type="button"
                    className="sidebar-search-result"
                    onClick={() => handleSelectExam(examCard)}
                  >
                    {examCard.title || "Untitled exam"}
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* menu option */}
      {menuOpen && (
        <div
          ref={menuRef}
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(false);
          }}
        >
          <Options_menu
            position={menuPosition}
            setEditing={setEditing}
            quiz={menuQuiz}
            where={"quiz"}
            onClose={() => setMenuOpen(false)}
          />
        </div>
      )}

      {/* delete pop up */}
      {editing.id != -999 && editing.action === "delete" && (
        <div className="modal-overlay" onClick={handleClosePopUp}>
          <div
            className="modal-card"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <div className="modal-header">
              <h3>Delete quiz?</h3>
            </div>
            <p className="modal-body">
              Are you sure you want to delete{" "}
              <span className="modal-quiz-title">
                “{menuQuiz?.title || "this quiz"}”
              </span>
              ? This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn btn-cancel" onClick={handleClosePopUp}>
                Cancel
              </button>
              <button className="btn btn-delete" onClick={handleConfirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
