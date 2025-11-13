import React from "react";
import { createPortal } from "react-dom";

import { MdDriveFileRenameOutline } from "react-icons/md";
import { MdDeleteForever } from "react-icons/md";
import { FiShare } from "react-icons/fi";
import "../style/Options_menu_style.css";

export const Options_menu = ({ position, quiz, setIsEditing, where }) => {
  const menu = (
    <div
      className="options_list"
      style={{
        position: "fixed",
        top: position.y,
        left: position.x,
        zIndex: 9999,
      }}
    >
      <p className="option_item">
        Share
        <FiShare />
      </p>
      {where === "quiz" && (
        <p
          className="option_item"
          onClick={() => {
            setIsEditing(quiz.examId);
          }}
        >
          Rename
          <MdDriveFileRenameOutline />
        </p>
      )}
      <p className="option_item delete">
        Delete
        <MdDeleteForever />
      </p>
    </div>
  );
  return createPortal(menu, document.body);
};
