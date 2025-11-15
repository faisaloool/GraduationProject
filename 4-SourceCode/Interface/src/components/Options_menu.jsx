import { React } from "react";
import { useState } from "react";
import { createPortal } from "react-dom";

import { MdDriveFileRenameOutline } from "react-icons/md";
import { MdDeleteForever } from "react-icons/md";
import { FiShare } from "react-icons/fi";
import "../style/Options_menu_style.css";

export const Options_menu = ({ position, quiz, setEditing, where }) => {
  const [id, setId] = useState(quiz.examId || quiz.quizId);
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
            setEditing({ id: `${id}`, action: "rename" });
          }}
        >
          Rename
          <MdDriveFileRenameOutline />
        </p>
      )}
      <p
        className="option_item delete"
        onClick={() => {
          setEditing({ id: `${id}`, action: "delete" });
        }}
      >
        Delete
        <MdDeleteForever />
      </p>
    </div>
  );
  return createPortal(menu, document.body);
};
