import React from "react";
import { useState, useRef, useEffect } from "react";

import { useNavigate } from "react-router-dom";

import "../style/Quiz_card_style.css";

import { BsThreeDots } from "react-icons/bs";

import { useExams } from "../context/ExamsProvider.jsx";

export const Quiz_card = ({
  e,
  editing,
  setEditing,
  setMenuPosition,
  setMenuOpen,
  setMenuQuiz,
  onSelect,
}) => {
  const MAX_EXAM_TITLE_LENGTH = 40;

  const navigate = useNavigate();
  const [hover, setHover] = React.useState(false);
  const [title, setTitle] = useState(e.quizTitle);

  const { exam, setExam, exams, loading, loadExams, deleteExam, renameExam } =
    useExams();
  const id = e.quizID;
  const activeId = exam?.quizID;
  const isActive = String(activeId ?? "") === String(id ?? "");

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const handleThreeDotsClick = (event) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();

    // Options_menu uses `position: fixed` so coordinates must be viewport-relative.
    // Keep the menu fully visible by clamping within the viewport.
    const viewportW = window.innerWidth || document.documentElement.clientWidth;
    const viewportH =
      window.innerHeight || document.documentElement.clientHeight;

    const margin = 8;
    const menuW = Math.min(280, Math.floor(viewportW * 0.9));
    const menuH = 340; // matches CSS max-height

    // Prefer opening to the right; if it overflows, open to the left.
    let x = rect.right + margin;
    if (x + menuW > viewportW - margin) {
      x = rect.left - menuW - margin;
    }
    x = clamp(x, margin, viewportW - menuW - margin);

    let y = rect.top;
    if (y + menuH > viewportH - margin) {
      y = viewportH - menuH - margin;
    }
    y = clamp(y, margin, viewportH - margin);

    setMenuPosition({ x, y });
    setMenuOpen((prev) => !prev);
    setMenuQuiz(e);
  };

  const editingId = typeof editing === "object" ? editing?.id : editing;
  const isRenamingThis =
    typeof editing === "object" &&
    editing?.action === "rename" &&
    editing?.id == id;
  const canShowMenu = editingId === -999;

  useEffect(() => {
    // Keep local title in sync, but don't clobber while actively renaming.
    if (!isRenamingThis) setTitle(e.quizTitle);
  }, [e.quizTitle, isRenamingThis]);

  const commitRename = async () => {
    const nextTitle = String(title ?? "")
      .slice(0, MAX_EXAM_TITLE_LENGTH)
      .trim();
    if (!nextTitle) {
      setTitle(e.quizTitle);
      setEditing({ id: -999 });
      return;
    }

    if (nextTitle === String(e.quizTitle ?? "").trim()) {
      setEditing({ id: -999 });
      return;
    }

    const previousTitle = e.quizTitle;
    const result = await renameExam(e.quizID, nextTitle);
    if (result?.error) {
      // Backend rejected or failed: keep the old title.
      console.error("Rename rejected:", result.error);
      setTitle(previousTitle);
      setEditing({ id: -999 });
      return;
    }

    setEditing({ id: -999 });
  };

  return (
    <>
      <div
        className={`${isActive ? "active-card" : "quiz-card"} ${
          isRenamingThis ? "editing" : ""
        }`}
        onClick={() => {
          setExam(e);
          navigate(`/exam/${e.quizID}`);
          onSelect?.();
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {isRenamingThis ? (
          <input
            className="quiz-title-input"
            value={title}
            maxLength={MAX_EXAM_TITLE_LENGTH}
            onChange={(event) =>
              setTitle(
                String(event.target.value ?? "").slice(0, MAX_EXAM_TITLE_LENGTH)
              )
            }
            onBlur={() => {
              commitRename();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                commitRename();
              }
            }}
            placeholder="Rename quiz..."
            autoFocus
          />
        ) : (
          <h2>{title}</h2>
        )}

        {canShowMenu && (
          <div
            className="threeDots"
            style={{
              opacity: hover || isActive ? 1 : 0,
              pointerEvents: hover || isActive ? "auto" : "none",
            }}
            onClick={(e) => {
              handleThreeDotsClick(e);
            }}
          >
            <BsThreeDots />
          </div>
        )}
      </div>
    </>
  );
};
