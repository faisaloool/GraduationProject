import React from "react";
import { useNavigate } from "react-router-dom";
import "../style/Quiz_card_style.css";
import { BsThreeDots } from "react-icons/bs";

export const Quiz_card = ({ exam, setExam, e }) => {
  const navigate = useNavigate();
  return (
    <>
      <div
        className={` ${exam.examId === e.examId ? "active-card" : "quiz-card"}`}
        onClick={() => {
          setExam(e);
          navigate(`/exam/${e.examId}`);
        }}
      >
        <h2>{e.title}</h2>
        <BsThreeDots />
      </div>
    </>
  );
};
