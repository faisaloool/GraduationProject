import { React, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { generateQuizFromFile } from "../util/service.js";
import { useExams } from "../context/ExamsProvider.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import "../style/Input.css";

import { LuSettings2 } from "react-icons/lu";
import { GoFileSubmodule } from "react-icons/go";

export const Input = ({ setExam }) => {
  const navigate = useNavigate();
  const { exams, loading, loadExams, deleteExam, addExam } = useExams();
  const { token, isLoggedIn } = useAuth();
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    if (isSubmitting) return;

    if (!isLoggedIn || !token) {
      setErrorMessage("Please log in before submitting.");
      return;
    }

    const input = document.querySelector(".inputfile");
    const file = input && input.files[0];
    if (!file) {
      setErrorMessage("No file selected.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);
    try {
      const response = await generateQuizFromFile(file, token);

      if (response?.error) {
        throw new Error(String(response.error));
      }

      const quiz = response?.body?.quizzes?.[0];
      if (!quiz) {
        throw new Error(
          String(
            response?.body?.message ||
              response?.rawText ||
              "No quiz returned from server."
          )
        );
      }

      addExam(quiz);
      setExam(quiz);
      const id = quiz.quizId || quiz.examId;
      navigate(`/exam/${id}`);
    } catch (err) {
      setErrorMessage(String(err?.message || err || "Something went wrong."));
    } finally {
      setIsSubmitting(false);
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
        <div className={`erorr-message ${errorMessage ? "show" : "hidden"}`}>
          {errorMessage || " "}
        </div>
        <form className="upload-bar" onSubmit={handleSubmit}>
          <div
            className="upload-settings"
            tabIndex={0}
            aria-label="Upload settings"
            onClick={() => {
              if (isSubmitting) return;
              setShowSettings(!showSettings);
            }}
          >
            <LuSettings2 aria-hidden="true" />
          </div>
          <label className="upload-file">
            <input type="file" className="inputfile" disabled={isSubmitting} />
            <span className="folder-icon">
              <GoFileSubmodule />
            </span>
            <span className="text">Add File</span>
            <span className="sound-wave">
              <span></span>
              <span></span>
              <span></span>
            </span>
          </label>

          <button
            type="submit"
            className="upload-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="upload-spinner" aria-hidden="true" />
                Generating...
              </>
            ) : (
              "Generate Quiz"
            )}
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
