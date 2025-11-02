import React from "react";
import { useNavigate } from "react-router-dom";
import "../style/Quiz_card_style.css";
import { BsThreeDots } from "react-icons/bs";

export const Quiz_card = ({ exam, setExam, e }) => {
  const navigate = useNavigate();
  const [hover, setHover] = React.useState(false);

  return (
    <>
      <div
        className={` ${exam.examId === e.examId ? "active-card" : "quiz-card"}`}
        onClick={() => {
          setExam(e);
          navigate(`/exam/${e.examId}`);
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <h2>{e.title}</h2>
        <div
          className="threeDots"
          style={{ display: hover ? "block" : "none" }}
        >
          <BsThreeDots />
        </div>
      </div>
    </>
  );
};
