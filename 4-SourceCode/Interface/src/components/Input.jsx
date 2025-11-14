import React from "react";
import { generateQuizFromFile } from "../util/service.js";
import { useExams } from "../context/ExamsProvider.jsx";
import { useNavigate } from "react-router-dom";
import "../style/Input.css";

export const Input = ({ setExam }) => {
  const navigate = useNavigate();
  const { exams, loading, loadExams, deleteExam, addExam } = useExams();
  const [erorr, setErorr] = React.useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    const input = document.querySelector(".inputfile");
    const file = input && input.files[0];
    if (file) {
      const response = await generateQuizFromFile(file, "your-auth-token");
      const quiz = response.quizzes[0];
      setErorr(false);
      addExam(quiz);
      setExam(quiz);
      const id = quiz.quizId || quiz.examId;
      navigate(`/exam/${id}`);
    } else {
      setErorr(true);
    }
  };
  return (
    <div className="input-wrapper">
      <div className={`erorr-message ${erorr ? "show" : "hidden"}`}>
        No file selected.
      </div>
      <form className="file-form">
        <label className="add-file">
          <input type="file" className="inputfile" />
          <span className="folder-icon">📁</span>
          <span className="text">Add File</span>
          <span className="sound-wave">
            <span></span>
            <span></span>
            <span></span>
          </span>
        </label>

        <button type="submit" className="generate-btn" onClick={handleSubmit}>
          Generate Quiz
        </button>
      </form>
    </div>
  );
};
