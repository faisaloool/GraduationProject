import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

import { useExams } from "../context/ExamsProvider.jsx";

import { MdDriveFileRenameOutline } from "react-icons/md";
import { MdDeleteForever } from "react-icons/md";
import { FiShare } from "react-icons/fi";
import { GrRefresh } from "react-icons/gr";

import "../style/Options_menu_style.css";

export const Options_menu = ({
  position,
  quiz,
  setEditing,
  where,
  onClose,
}) => {
  const navigate = useNavigate();
  const { exam, setExam, deleteExam } = useExams();

  const id = quiz?.examId || quiz?.quizId;
  const containerRef = useRef(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (!onClose) return;

    const handleClick = (e) => {
      // While the confirm dialog is open, clicks happen outside the menu
      // (because the dialog is portaled). Don't auto-close the menu.
      if (confirmDeleteOpen) return;
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleKey = (e) => {
      if (e.key !== "Escape") return;
      if (confirmDeleteOpen) {
        setConfirmDeleteOpen(false);
      }
      onClose();
    };

    document.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose, confirmDeleteOpen]);

  const runAndClose = (fn) => () => {
    fn?.();
    onClose?.();
  };

  const closeDeleteDialog = () => {
    setConfirmDeleteOpen(false);
    setEditing?.({ id: -999 });
    onClose?.();
  };

  const confirmDelete = async () => {
    try {
      if (!id) return;

      const response = await deleteExam(id);
      if (response?.error) {
        console.error("Error deleting exam:", response.error);
      }

      const activeId = exam?.examId || exam?.quizId;
      if (String(activeId ?? "") === String(id ?? "")) {
        setExam({ title: "Main-page" });
        navigate("/");
      }
    } finally {
      closeDeleteDialog();
    }
  };

  const menu = (
    <div
      ref={containerRef}
      className="options_list"
      style={{
        position: "fixed",
        top: position.y,
        left: position.x,
        zIndex: 9999,
      }}
    >
      <p className="option_item" onClick={onClose}>
        Share
        <FiShare />
      </p>
      {where === "quiz" && (
        <p
          className="option_item"
          onClick={runAndClose(() =>
            setEditing({ id: `${id}`, action: "rename" })
          )}
        >
          Rename
          <MdDriveFileRenameOutline />
        </p>
      )}
      {where === "header" && (
        <p className="option_item">
          Regnerate quiz
          <GrRefresh />
        </p>
      )}
      <p
        className="option_item delete"
        onClick={() => {
          setConfirmDeleteOpen(true);
        }}
      >
        Delete
        <MdDeleteForever />
      </p>
    </div>
  );

  return (
    <>
      {createPortal(menu, document.body)}
      {confirmDeleteOpen &&
        createPortal(
          <div className="modal-overlay" onClick={closeDeleteDialog}>
            <div
              className="modal-card"
              onClick={(e) => {
                e.stopPropagation();
              }}
              role="dialog"
              aria-modal="true"
            >
              <div className="modal-header">
                <h3>Delete quiz?</h3>
              </div>
              <p className="modal-body">
                Are you sure you want to delete{" "}
                <span className="modal-quiz-title">
                  “{quiz?.title || exam?.title || "this quiz"}”
                </span>
                ? This action cannot be undone.
              </p>
              <div className="modal-actions">
                <button className="btn btn-cancel" onClick={closeDeleteDialog}>
                  Cancel
                </button>
                <button className="btn btn-delete" onClick={confirmDelete}>
                  Delete
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
