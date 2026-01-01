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
  const navigate = useNavigate();
  const [hover, setHover] = React.useState(false);
  const [title, setTitle] = useState(e.title);

  const { exam, setExam, exams, loading, loadExams, deleteExam, renameExam } =
    useExams();
  const id = e.examId || e.quizId;

  const handleThreeDotsClick = (event) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setMenuPosition({ x: rect.right + 5, y: rect.top });
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
    if (!isRenamingThis) setTitle(e.title);
  }, [e.title, isRenamingThis]);

  const commitRename = async () => {
    const nextTitle = String(title ?? "").trim();
    if (!nextTitle) {
      setTitle(e.title);
      setEditing({ id: -999 });
      return;
    }

    if (nextTitle === String(e.title ?? "").trim()) {
      setEditing({ id: -999 });
      return;
    }

    const previousTitle = e.title;
    const result = await renameExam(e.examId || e.quizId, nextTitle);
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
        className={`${exam.examId === e.examId ? "active-card" : "quiz-card"} ${
          isRenamingThis ? "editing" : ""
        }`}
        onClick={() => {
          setExam(e);
          navigate(`/exam/${e.examId || e.quizId}`);
          onSelect?.();
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {isRenamingThis ? (
          <input
            className="quiz-title-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
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
              opacity: hover ? 1 : 0,
              pointerEvents: hover ? "auto" : "none",
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
