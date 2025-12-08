import { React, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { generateQuizFromFile } from "../util/service.js";
import { useExams } from "../context/ExamsProvider.jsx";
import { useNavigate } from "react-router-dom";
import "../style/Input.css";

import { LuSettings2 } from "react-icons/lu";

export const Input = ({ setExam }) => {
  const navigate = useNavigate();
  const { exams, loading, loadExams, deleteExam, addExam } = useExams();
  const [erorr, setErorr] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    mcqCount: 8,
    tfCount: 2,
  });

  useEffect(() => {
    if (!showSettings) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setShowSettings(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showSettings]);

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

  const saveSettings = () => {
    const mcqInput = document.getElementById("mcq-count");
    const tfInput = document.getElementById("tf-count");
    const mcqCount = parseInt(mcqInput.value, 10);
    const tfCount = parseInt(tfInput.value, 10);
    setSettings({ mcqCount, tfCount });
  };
  return (
    <>
      <div className="input-wrapper">
        <div className={`erorr-message ${erorr ? "show" : "hidden"}`}>
          No file selected.
        </div>
        <form className="file-form">
          <div
            className="input-settings"
            tabIndex={0}
            aria-label="Upload settings"
            onClick={() => {
              setShowSettings(!showSettings);
            }}
          >
            <LuSettings2 aria-hidden="true" />
          </div>
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
      {showSettings &&
        createPortal(
          <div
            className="settings-overlay"
            onClick={() => setShowSettings(false)}
          >
            <div
              className="settings-frame"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="settings-title">Quiz Settings</div>

              <div className="settings-row two-inputs">
                <label htmlFor="mcq-count">MCQ questions</label>
                <input
                  id="mcq-count"
                  className="settings-input number-input"
                  type="number"
                  min={0}
                  defaultValue={settings.mcqCount}
                />
                <label htmlFor="tf-count">True/False</label>
                <input
                  id="tf-count"
                  className="settings-input number-input"
                  type="number"
                  min={0}
                  defaultValue={settings.tfCount}
                />
              </div>

              <div className="settings-actions">
                <button
                  className="settings-save"
                  onClick={() => {
                    saveSettings();
                    setShowSettings(false);
                  }}
                >
                  Save
                </button>
                <button
                  className="settings-cancel"
                  onClick={() => setShowSettings(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
