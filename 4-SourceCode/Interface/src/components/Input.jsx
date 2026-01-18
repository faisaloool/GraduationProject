import { React, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { generateQuizFromFile } from "../util/service.js";
import { useExams } from "../context/ExamsProvider.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import "../style/Input.css";

import FileUploadPreview from "./FileUploadPreview.jsx";
import { LuSettings2 } from "react-icons/lu";
import { GoFileSubmodule } from "react-icons/go";

export const Input = ({ setExam }) => {
  const navigate = useNavigate();
  const { exams, loading, loadExams, deleteExam, addExam } = useExams();
  const { token, isLoggedIn } = useAuth();
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const [settings, setSettings] = useState({
    mcqCount: 8,
    tfCount: 2,
  });

  const TOTAL_LIMITS = {
    MIN_TOTAL: 1,
    MAX_TOTAL: 20,
  };

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

    const file = selectedFile;
    if (!file) {
      setErrorMessage("No file selected.");
      return;
    }

    const mcqCount = Number(settings?.mcqCount) || 0;
    const tfCount = Number(settings?.tfCount) || 0;
    const total = mcqCount + tfCount;
    if (total < TOTAL_LIMITS.MIN_TOTAL || total > TOTAL_LIMITS.MAX_TOTAL) {
      setErrorMessage(
        `Total questions must be between ${TOTAL_LIMITS.MIN_TOTAL} and ${TOTAL_LIMITS.MAX_TOTAL} (MCQ + True/False).`
      );
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);
    try {
      const response = await generateQuizFromFile(file, token, {
        mcqCount,
        tfCount,
      });

      if (response?.error) {
        throw new Error(String(response.error));
      }

      const quiz = response?.data;
      if (!quiz) {
        throw new Error(
          String(
            response?.data?.message ||
              response?.rawText ||
              "No quiz returned from server."
          )
        );
      }

      addExam(quiz);
      setExam(quiz);
      const id = quiz.quizID ?? quiz.quizId ?? quiz.examId ?? quiz.id;
      navigate(`/exam/${id}`);
    } catch (err) {
      setErrorMessage(String(err?.message || err || "Something went wrong."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e) => {
    const files = e?.target?.files;
    if (!files || files.length === 0) {
      setSelectedFile(null);
      return;
    }

    if (files.length > 1) {
      setErrorMessage("You can upload only one file.");
    } else {
      setErrorMessage("");
    }

    setSelectedFile(files[0]);
  };

  const handleRemoveFile = () => {
    if (isSubmitting) return;
    setSelectedFile(null);
    setErrorMessage("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const saveSettings = () => {
    const mcqInput = document.getElementById("mcq-count");
    const tfInput = document.getElementById("tf-count");

    // Per-field limits (total is enforced separately)
    const LIMITS = {
      MIN: 0,
      MAX: TOTAL_LIMITS.MAX_TOTAL,
    };

    // 1. Parse the values
    let mcqCount = parseInt(mcqInput.value, 10) || 0;
    let tfCount = parseInt(tfInput.value, 10) || 0;

    // 2. Clamp each value to [0..50]
    mcqCount = Math.min(Math.max(mcqCount, LIMITS.MIN), LIMITS.MAX);
    tfCount = Math.min(Math.max(tfCount, LIMITS.MIN), LIMITS.MAX);

    const total = mcqCount + tfCount;
    if (total < TOTAL_LIMITS.MIN_TOTAL || total > TOTAL_LIMITS.MAX_TOTAL) {
      setSettingsError(
        `Total questions must be between ${TOTAL_LIMITS.MIN_TOTAL} and ${TOTAL_LIMITS.MAX_TOTAL}. Current total: ${total}.`
      );
      return false;
    }

    setSettingsError("");

    // 3. Optional: Update the UI inputs so the user sees the change
    mcqInput.value = mcqCount;
    tfInput.value = tfCount;

    // 4. Save to state
    setSettings({ mcqCount, tfCount });
    return true;
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
            <input
              ref={fileInputRef}
              type="file"
              className="inputfile"
              disabled={isSubmitting}
              onChange={handleFileChange}
            />
            <span className="folder-icon">
              <GoFileSubmodule />
            </span>
            <span className="text">
              {selectedFile ? "Change File" : "Add File"}
            </span>
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

        <div className="file-preview-slot" aria-hidden={!selectedFile}>
          {selectedFile ? (
            <FileUploadPreview
              file={selectedFile}
              onRemove={handleRemoveFile}
              disabled={isSubmitting}
            />
          ) : null}
        </div>
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
                  max={TOTAL_LIMITS.MAX_TOTAL}
                  defaultValue={settings.mcqCount}
                />
                <label htmlFor="tf-count">True/False</label>
                <input
                  id="tf-count"
                  className="settings-input number-input"
                  type="number"
                  min={0}
                  max={TOTAL_LIMITS.MAX_TOTAL}
                  defaultValue={settings.tfCount}
                />
              </div>

              {settingsError && (
                <div className="settings-error" role="alert">
                  {settingsError}
                </div>
              )}

              <div className="settings-actions">
                <button
                  className="settings-save"
                  onClick={() => {
                    const ok = saveSettings();
                    if (ok) setShowSettings(false);
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
