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
  const sideBarBodyRef = useRef(null);
  const lastPointerRef = useRef(null);

  // NEW: prevent "close then immediately reopen" from the same click
  const lastCloseAtRef = useRef(0);
  const lastClosePointRef = useRef(null);

  const recordPointer = (e) => {
    const clientX = e?.clientX ?? e?.touches?.[0]?.clientX ?? null;
    const clientY = e?.clientY ?? e?.touches?.[0]?.clientY ?? null;
    if (typeof clientX === "number" && typeof clientY === "number") {
      lastPointerRef.current = { x: clientX, y: clientY };
    }
  };

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
    ? exams.filter(({ quizTitle }) =>
        quizTitle?.toLowerCase().includes(normalizedSearch)
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
    navigate(`/exam/${selected.quizID}`);
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

  // Normalize menu position coming from Quiz_card (which may be relative to a scroll container)
  const setMenuPositionSmart = (posOrEvent) => {
    const body = sideBarBodyRef.current;

    const rawX =
      typeof posOrEvent?.clientX === "number"
        ? posOrEvent.clientX
        : Number(posOrEvent?.x ?? NaN);
    const rawY =
      typeof posOrEvent?.clientY === "number"
        ? posOrEvent.clientY
        : Number(posOrEvent?.y ?? NaN);

    const last = lastPointerRef.current; // always viewport coords
    const base = {
      x: Number.isFinite(rawX) ? rawX : last?.x ?? 0,
      y: Number.isFinite(rawY) ? rawY : last?.y ?? 0,
    };

    if (!body) {
      // small offset so menu doesn't sit exactly under the pointer
      setMenuPosition({ x: base.x + 6, y: base.y + 6 });
      return;
    }

    const r = body.getBoundingClientRect();
    const st = body.scrollTop || 0;
    const sl = body.scrollLeft || 0;

    const distToRect = (x, y, rect) => {
      const dx =
        x < rect.left ? rect.left - x : x > rect.right ? x - rect.right : 0;
      const dy =
        y < rect.top ? rect.top - y : y > rect.bottom ? y - rect.bottom : 0;
      return dx + dy;
    };

    const candidates = [
      // 1) what we captured from the actual click/tap (best in practice)
      ...(last ? [{ x: last.x, y: last.y }] : []),

      // 2) what Quiz_card passed (may already be correct)
      { x: base.x, y: base.y },

      // 3) common “relative-to-scroll-container” variants
      { x: base.x, y: base.y + st },
      { x: base.x + r.left, y: base.y + r.top },
      { x: base.x + r.left - sl, y: base.y + r.top - st },
    ];

    // choose candidate closest to visible sidebar body viewport
    let best = candidates[0];
    let bestScore = Number.POSITIVE_INFINITY;
    for (const c of candidates) {
      const score = distToRect(c.x, c.y, r);
      if (score < bestScore) {
        bestScore = score;
        best = c;
      }
    }

    // ---- UPDATED: shift right a bit + responsive clamps (mobile uses viewport, not sidebar)
    const MARGIN = 8;
    const Y_OFFSET = 6;

    const isNarrow =
      window.matchMedia && window.matchMedia("(max-width: 600px)").matches;

    const X_OFFSET = isNarrow ? 8 : 18;

    let x = best.x + X_OFFSET;
    let y = best.y + Y_OFFSET;

    if (isNarrow) {
      // On mobile the sidebar covers the page; clamp to viewport so it never goes into "invisible" space.
      // Also try to keep it above the account area (which can cover the bottom).
      const accountRect = document
        .querySelector(".sb-account-area")
        ?.getBoundingClientRect?.();

      const maxY = accountRect?.top
        ? Math.min(window.innerHeight - MARGIN, accountRect.top - MARGIN)
        : window.innerHeight - MARGIN;

      x = Math.max(MARGIN, Math.min(x, window.innerWidth - MARGIN));
      y = Math.max(MARGIN, Math.min(y, maxY));
    } else {
      // Desktop: keep inside sidebar bounds (as before)
      const sb = sidebarRef.current?.getBoundingClientRect?.();
      if (sb) {
        x = Math.max(sb.left + MARGIN, Math.min(x, sb.right - MARGIN));
        y = Math.max(sb.top + MARGIN, Math.min(y, sb.bottom - MARGIN));
      } else {
        x = Math.max(MARGIN, Math.min(x, window.innerWidth - MARGIN));
        y = Math.max(MARGIN, Math.min(y, window.innerHeight - MARGIN));
      }
    }

    setMenuPosition({ x, y });
  };

  // Allow open/close, but suppress open that happens right after a close at same spot.
  const setMenuOpenSticky = (next) => {
    const now = Date.now();
    const p = lastPointerRef.current;
    const cp = lastClosePointRef.current;

    const dist =
      p && cp
        ? Math.hypot((p.x ?? 0) - (cp.x ?? 0), (p.y ?? 0) - (cp.y ?? 0))
        : Infinity;

    const suppressOpen = now - (lastCloseAtRef.current || 0) < 250 && dist < 14; // same click spot/window

    if (typeof next === "function") {
      setMenuOpen((prev) => {
        const computed = next(prev);
        if (computed === true && suppressOpen) return prev;
        return computed;
      });
      return;
    }

    if (next === true && suppressOpen) return;
    setMenuOpen(next);
  };

  const closeOptionsMenu = (opts) => {
    const clearQuiz = opts?.clearQuiz !== false;
    // mark close moment + point (so the subsequent click doesn't reopen it)
    lastCloseAtRef.current = Date.now();
    lastClosePointRef.current = lastPointerRef.current
      ? { ...lastPointerRef.current }
      : null;

    setMenuOpen(false);
    if (clearQuiz) setMenuQuiz(null);
  };

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
            key={e.quizID}
            e={e}
            editing={editing}
            setEditing={setEditing}
            setMenuPosition={setMenuPositionSmart}
            setMenuOpen={setMenuOpenSticky} // <-- change (sticky open)
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
          onPointerDownCapture={recordPointer}
          onMouseDownCapture={recordPointer}
          onTouchStartCapture={recordPointer}
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
          style={{
            // Lock overall layout: header/account won't shrink when <details> grows.
            display: "flex",
            flexDirection: "column",
            minHeight: 0, // allows the body to be the scroll container
          }}
        >
          <div
            className="top-of-side-bar"
            style={{
              flexShrink: 0, // prevent header from shrinking
              width: "100%",
              alignSelf: "stretch",
            }}
          >
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

          <div
            ref={sideBarBodyRef}
            className="side-bar-body"
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              overflowX: "hidden",
              width: "100%",
              alignSelf: "stretch",
            }}
          >
            <nav>
              <ul>
                <li
                  onClick={(e) => {
                    e.stopPropagation();
                    setExam({ quizTitle: "Main-page", quizID: null });
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

          <div
            className="sb-account-area"
            style={{
              flexShrink: 0,
              width: "100%",
              alignSelf: "stretch",
              // helps if Account uses percentage widths/padding
              boxSizing: "border-box",
            }}
          >
            <Account collapsed={collaps || !expandedReady} />
          </div>
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
                    key={examCard.quizID}
                    type="button"
                    className="sidebar-search-result"
                    onClick={() => handleSelectExam(examCard)}
                  >
                    {examCard.quizTitle || "Untitled exam"}
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* menu option */}
      {menuQuiz && (
        <Options_menu
          isOpen={menuOpen}
          position={menuPosition}
          setEditing={setEditing}
          quiz={menuQuiz}
          where={"quiz"}
          onClose={closeOptionsMenu}
        />
      )}
    </>
  );
};
