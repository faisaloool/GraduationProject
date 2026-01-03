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
import { IoIosCreate } from "react-icons/io";
import { IoSearch } from "react-icons/io5";
import { IoLibraryOutline } from "react-icons/io5";
import LogoIcon from "./LogoIcon.jsx";

export const Side_bar = ({ editing, setEditing }) => {
  const navigate = useNavigate();

  const [collaps, setCollaps] = React.useState(false);
  const sidebarRef = useRef(null);
  const expandTimerRef = useRef(null);
  const [expandedReady, setExpandedReady] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);
  const [menuQuiz, setMenuQuiz] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const EXPAND_TRANSITION_MS = 240;

  // Hide expanded-only content immediately on collapse, and only show it after
  // the expand transition finishes to avoid janky layout during width animation.
  useEffect(() => {
    if (expandTimerRef.current) {
      window.clearTimeout(expandTimerRef.current);
      expandTimerRef.current = null;
    }

    if (collaps) {
      setExpandedReady(false);
      return;
    }

    // Expanding: wait for transition end (fallback timer below).
    setExpandedReady(false);
    expandTimerRef.current = window.setTimeout(() => {
      setExpandedReady(true);
      expandTimerRef.current = null;
    }, EXPAND_TRANSITION_MS);

    return () => {
      if (expandTimerRef.current) {
        window.clearTimeout(expandTimerRef.current);
        expandTimerRef.current = null;
      }
    };
  }, [collaps]);

  const onSidebarTransitionEnd = (e) => {
    if (collaps) return;
    // Only react to the main width animation.
    if (e.propertyName !== "width" && e.propertyName !== "flex-basis") return;
    if (expandTimerRef.current) {
      window.clearTimeout(expandTimerRef.current);
      expandTimerRef.current = null;
    }
    setExpandedReady(true);
  };

  const showExpanded = !collaps && expandedReady;

  const collapseOnMobile = () => {
    if (window.matchMedia && window.matchMedia("(max-width: 600px)").matches) {
      setCollaps(true);
    }
  };

  const { user, isLoggedIn, logout, token } = useAuth();
  const { exam, setExam, exams, loading, loadExams, error } = useExams();

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const matchingExams = normalizedSearch
    ? exams.filter(({ title }) =>
        title?.toLowerCase().includes(normalizedSearch)
      )
    : [];

  // close search function
  const closeSearch = () => {
    setShowSearch(false);
    setSearchTerm("");
  };

  // handleing serach exam sellected option
  const handleSelectExam = (selected) => {
    setExam(selected);
    navigate(`/exam/${selected.examId || selected.quizId}`);
    collapseOnMobile();
    closeSearch();
  };

  // close search with Escape
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
        <div className="error-message" role="alert" aria-live="polite">
          <div className="error-message__title">Couldn’t load quizzes</div>
          <div className="error-message__text">
            {String(error?.message || error)}
          </div>
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
            onSelect={collapseOnMobile}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      {isLoggedIn && (
        <div
          ref={sidebarRef}
          className={`side-bar ${collaps ? "collapsed" : ""}`}
          onTransitionEnd={onSidebarTransitionEnd}
          onClick={(e) => {
            if (!collaps) return;
            // Don't auto-expand when clicking interactive items (nav/account).
            if (
              e.target.closest("li") ||
              e.target.closest(".sb-account") ||
              e.target.closest(".Account")
            ) {
              return;
            }
            setCollaps(false);
          }}
        >
          <div className="top-of-side-bar">
            <div className={collaps == true ? "closlogo" : "Logo"}>
              <LogoIcon size={62} />
            </div>
            <div onClick={() => setCollaps(!collaps)}>
              {showExpanded && (
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
                  onClick={(e) => {
                    e.stopPropagation();
                    setExam({ title: "Main-page" });
                    navigate("/");
                    collapseOnMobile();
                  }}
                >
                  <div className="Item">
                    <IoIosCreate className="side-bar-icons" />
                    {showExpanded && <a className="sb-appear">New Quiz</a>}
                  </div>
                </li>
                <li>
                  <div
                    className="Item"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!error) {
                        setShowSearch(true);
                      }
                    }}
                  >
                    <IoSearch className="side-bar-icons" />
                    {showExpanded && <a className="sb-appear">Search</a>}
                  </div>
                </li>
              </ul>
            </nav>
            {showExpanded && (
              <div className="Quizzes sb-appear">
                <details open>
                  <summary className="quizss">
                    <p>Quizzes</p>
                  </summary>
                  <div className="quizzes-list">{renderQuizzes()}</div>
                </details>
              </div>
            )}
          </div>
          <Account collapsed={collaps || !expandedReady} />
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
      {menuOpen && menuQuiz && (
        <Options_menu
          position={menuPosition}
          setEditing={setEditing}
          quiz={menuQuiz}
          where={"quiz"}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </>
  );
};
