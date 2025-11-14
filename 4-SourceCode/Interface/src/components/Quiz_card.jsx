import React from "react";
import { useState, useRef, useEffect } from "react";

import { useNavigate } from "react-router-dom";

import "../style/Quiz_card_style.css";

import { BsThreeDots } from "react-icons/bs";

import { useExams } from "../context/ExamsProvider.jsx";

export const Quiz_card = ({
  e,
  editing,
  setIsEditing,
  setMenuPosition,
  setMenuOpen,
  setMenuQuiz,
}) => {
  const navigate = useNavigate();
  const [hover, setHover] = React.useState(false);
  const [title, setTitle] = useState(e.title);

  const { exam, setExam, exams, loading, loadExams, deleteExam, renameExam } =
    useExams();

  const handleThreeDotsClick = (event) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setMenuPosition({ x: rect.right + 5, y: rect.top });
    setMenuOpen((prev) => !prev);
    setMenuQuiz(e);
  };

  /* useEffect(() => {
    console.log("editing changed in Quiz_card:", editing);
  }, [editing]); */

  return (
    <>
      <div
        className={`${exam.examId === e.examId ? "active-card" : "quiz-card"} ${
          editing == e.examId ? "editing" : ""
        }`}
        onClick={() => {
          setExam(e);
          navigate(`/exam/${e.examId || e.quizId}`);
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {editing == e.examId ? (
          <input
            className="quiz-title-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={() => {
              setIsEditing(-999);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                e.title = title;
                renameExam(e.examId, title);
                setIsEditing(-999);
              }
            }}
            placeholder="Rename quiz..."
            autoFocus
          />
        ) : (
          <h2>{title}</h2>
        )}

        {editing != e.examId && (
          <div
            className="threeDots"
            style={{ display: hover ? "block" : "none" }}
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
