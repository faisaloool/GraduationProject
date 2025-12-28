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

  return (
    <>
      <div
        className={`${exam.examId === e.examId ? "active-card" : "quiz-card"} ${
          isRenamingThis ? "editing" : ""
        }`}
        onClick={() => {
          setExam(e);
          navigate(`/exam/${e.examId || e.quizId}`);
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
              setEditing({ id: -999 });
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                e.title = title;
                renameExam(e.examId || e.quizId, title);
                setEditing({ id: -999 });
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
