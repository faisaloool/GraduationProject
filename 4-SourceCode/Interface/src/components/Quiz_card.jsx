import React from "react";
import { useState, useRef, useEffect } from "react";

import { Options_menu } from "./Options_menu";

import { useNavigate } from "react-router-dom";
import "../style/Quiz_card_style.css";
import { BsThreeDots } from "react-icons/bs";

export const Quiz_card = ({ exam, setExam, e }) => {
  const navigate = useNavigate();
  const [hover, setHover] = React.useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState(null);

  const handleThreeDotsClick = (e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPosition({ x: rect.right + 5, y: rect.top });
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

  return (
    <>
      <div
        className={` ${exam.examId === e.examId ? "active-card" : "quiz-card"}`}
        onClick={() => {
          setExam(e);
          navigate(`/exam/${e.examId || e.quizId}`);
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <h2>{e.title}</h2>
        <div
          className="threeDots"
          style={{ display: hover ? "block" : "none" }}
          onClick={(e) => {
            handleThreeDotsClick(e);
          }}
        >
          <BsThreeDots />
        </div>
        {menuOpen && (
          <div ref={menuRef}>
            <Options_menu
              className="options-menu"
              position={menuPosition}
              onClose={() => setMenuOpen(false)}
            />
          </div>
        )}
      </div>
    </>
  );
};
