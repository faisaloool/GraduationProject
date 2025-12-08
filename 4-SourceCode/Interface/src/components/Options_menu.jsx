import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { MdDriveFileRenameOutline } from "react-icons/md";
import { MdDeleteForever } from "react-icons/md";
import { FiShare } from "react-icons/fi";
import "../style/Options_menu_style.css";

export const Options_menu = ({
  position,
  quiz,
  setEditing,
  where,
  onClose,
}) => {
  const [id] = useState(quiz.examId || quiz.quizId);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!onClose) return;
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const runAndClose = (fn) => () => {
    fn?.();
    onClose?.();
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
      <p
        className="option_item delete"
        onClick={runAndClose(() =>
          setEditing({ id: `${id}`, action: "delete" })
        )}
      >
        Delete
        <MdDeleteForever />
      </p>
    </div>
  );
  return createPortal(menu, document.body);
};
