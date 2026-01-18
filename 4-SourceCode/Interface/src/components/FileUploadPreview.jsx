import React from "react";
import "../style/FileUploadPreview.css";

import { LuFileText, LuX } from "react-icons/lu";

function getFileExtension(fileName) {
  if (!fileName) return "";
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === fileName.length - 1) return "";
  return fileName.slice(lastDot + 1).toUpperCase();
}

export default function FileUploadPreview({
  file,
  onRemove,
  disabled = false,
}) {
  if (!file) return null;

  const ext = getFileExtension(file.name);

  return (
    <div
      className="file-upload-preview"
      role="group"
      aria-label="Uploaded file"
    >
      <div className="file-upload-preview__left">
        <div className="file-upload-preview__icon" aria-hidden="true">
          <LuFileText />
        </div>

        <div className="file-upload-preview__meta">
          <div className="file-upload-preview__name" title={file.name}>
            {file.name}
          </div>
          <div className="file-upload-preview__sub">
            {ext ? (
              <span
                className="file-upload-preview__ext"
                aria-label={`File extension ${ext}`}
              >
                {ext}
              </span>
            ) : (
              <span className="file-upload-preview__ext file-upload-preview__ext--unknown">
                FILE
              </span>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        className="file-upload-preview__remove"
        onClick={onRemove}
        disabled={disabled}
        aria-label="Remove uploaded file"
        title="Remove"
      >
        <LuX aria-hidden="true" />
        <span className="file-upload-preview__removeText">Remove</span>
      </button>
    </div>
  );
}
