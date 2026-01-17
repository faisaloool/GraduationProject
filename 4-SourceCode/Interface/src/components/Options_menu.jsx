import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

import { useExams } from "../context/ExamsProvider.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getShareToken } from "../util/service.js";

import { MdDriveFileRenameOutline } from "react-icons/md";
import { MdDeleteForever } from "react-icons/md";
import { FiShare } from "react-icons/fi";
import { GrRefresh } from "react-icons/gr";

import "../style/Options_menu_style.css";

export const Options_menu = ({
  isOpen = true,
  position,
  quiz,
  setEditing,
  where,
  onClose,
}) => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { exam, setExam, deleteExam, regenerateWholeExam, regeneratingQuiz } =
    useExams();

  const id =
    quiz?.quizID ??
    quiz?.quizId ??
    quiz?.examId ??
    quiz?.id ??
    quiz?._id ??
    null;
  const containerRef = useRef(null);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState("");
  const [shareCode, setShareCode] = useState("");

  // NEW: resolved position + max-height for mobile so menu stays visible
  const [resolvedPos, setResolvedPos] = useState(
    () => position || { x: 0, y: 0 }
  );
  const [menuMaxHeight, setMenuMaxHeight] = useState(null);

  const shareUrl = shareCode
    ? `${window.location.origin}/shared/${encodeURIComponent(
        String(shareCode)
      )}`
    : "";

  // Reposition after mount/updates (uses actual rendered menu size)
  useLayoutEffect(() => {
    if (!position) return;

    const compute = () => {
      const el = containerRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const margin = 8;

      const isNarrow =
        window.matchMedia && window.matchMedia("(max-width: 600px)").matches;

      // In mobile, avoid the account area covering the bottom of the menu.
      const accountRect = isNarrow
        ? document.querySelector(".sb-account-area")?.getBoundingClientRect?.()
        : null;

      const bottomLimit =
        isNarrow && accountRect?.top
          ? Math.min(window.innerHeight - margin, accountRect.top - margin)
          : window.innerHeight - margin;

      let x = Number(position.x) || 0;
      let y = Number(position.y) || 0;

      // Prefer staying on-screen horizontally
      x = Math.max(
        margin,
        Math.min(x, window.innerWidth - rect.width - margin)
      );

      // If it overflows the bottom (or would be under account), flip up
      if (y + rect.height > bottomLimit) {
        y = y - rect.height;
      }

      // Clamp vertically into the visible safe area
      y = Math.max(margin, Math.min(y, bottomLimit - rect.height));

      // If still too tall for the safe area, keep it at top and make it scrollable
      const availableH = Math.max(60, bottomLimit - margin - y);
      if (isNarrow && rect.height > availableH) {
        setMenuMaxHeight(availableH);
      } else {
        setMenuMaxHeight(null);
      }

      setResolvedPos({ x, y });
    };

    const raf = window.requestAnimationFrame(compute);
    window.addEventListener("resize", compute);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", compute);
    };
  }, [position, shareOpen, confirmDeleteOpen]);

  useEffect(() => {
    if (!onClose) return;

    const handleKey = (e) => {
      if (e.key !== "Escape") return;

      if (confirmDeleteOpen) {
        setConfirmDeleteOpen(false);
        return;
      }

      if (shareOpen) {
        setShareOpen(false);
        setCopyStatus("");
        return;
      }

      onClose();
    };

    // NOTE: outside-click closing is handled by the backdrop below (prevents trigger click re-opening).
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose, confirmDeleteOpen, shareOpen]);

  const handleShareClick = async () => {
    // Close the menu list immediately, but keep this component mounted
    // so the Share modal can stay open.
    onClose?.({ clearQuiz: false });

    setShareOpen(true);
    setCopyStatus("");
    setShareError("");
    setShareCode("");

    const quizId = String(id ?? "").trim();
    if (!quizId) {
      setShareError("Missing quiz id.");
      return;
    }
    if (!token) {
      setShareError("You must be logged in to share.");
      return;
    }

    setShareLoading(true);
    try {
      const result = await getShareToken(quizId, token);
      console.log("getShareToken result:", result);
      if (result?.error) {
        setShareError(result.error);
        return;
      }

      const code =
        typeof result === "string"
          ? result
          : result?.data ?? result?.shareCode ?? result?.token ?? "";

      const cleaned = String(code ?? "").trim();
      if (!cleaned) {
        setShareError("Unexpected server response.");
        return;
      }

      setShareCode(cleaned);
    } catch (err) {
      setShareError(err?.message || "Failed to generate share link.");
    } finally {
      setShareLoading(false);
    }
  };
  const runAndClose = (fn) => () => {
    fn?.();
    onClose?.();
  };

  const openDeleteDialog = () => {
    // Close the menu list immediately, but keep this component mounted
    // so the Delete confirmation can stay open.
    onClose?.({ clearQuiz: false });
    setConfirmDeleteOpen(true);
  };

  const closeDeleteDialog = () => {
    setConfirmDeleteOpen(false);
    setEditing?.({ id: -999 });
    onClose?.();
  };

  const closeShareDialog = () => {
    setShareOpen(false);
    setCopyStatus("");
    setShareError("");
    setShareCode("");
    setShareLoading(false);
    setEditing?.({ id: -999 });
    onClose?.();
  };

  const copyShareLink = async () => {
    if (!shareUrl) return;

    try {
      if (navigator?.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = shareUrl;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setCopyStatus("Copied!");
      window.setTimeout(() => setCopyStatus(""), 1500);
    } catch {
      setCopyStatus("Couldn't copy");
      window.setTimeout(() => setCopyStatus(""), 1500);
    }
  };

  const confirmDelete = async () => {
    try {
      if (!id) return;

      const response = await deleteExam(id);
      if (response?.error) {
        console.error("Error deleting exam:", response.error);
      }

      const activeId = exam?.quizID;
      if (String(activeId ?? "") === String(id ?? "")) {
        setExam({ quizTitle: "Main-page", quizID: null });
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
        top: resolvedPos?.y ?? position?.y,
        left: resolvedPos?.x ?? position?.x,
        zIndex: 20000, // ensure it's above sidebar/account on mobile
        maxHeight: menuMaxHeight ?? undefined,
        overflowY: menuMaxHeight ? "auto" : undefined,
      }}
    >
      <p className="option_item" onClick={handleShareClick}>
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
      {where === "header" && id && (
        <p
          className="option_item"
          onClick={runAndClose(async () => {
            if (regeneratingQuiz) return;
            const response = await regenerateWholeExam?.(id);
            if (response?.error) {
              console.error("Error regenerating quiz:", response.error);
            }
          })}
        >
          Regnerate quiz
          <GrRefresh />
        </p>
      )}
      <p className="option_item delete" onClick={openDeleteDialog}>
        Delete
        <MdDeleteForever />
      </p>
    </div>
  );

  const shouldRender = Boolean(isOpen || shareOpen || confirmDeleteOpen);
  if (!shouldRender) return null;

  const portalContent = (
    <>
      {/* Backdrop prevents underlying three-dots click from firing after close (no "close then reopen") */}
      {isOpen && !confirmDeleteOpen && !shareOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9998,
            background: "transparent",
          }}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose?.();
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose?.();
          }}
        />
      )}
      {isOpen && !confirmDeleteOpen && !shareOpen ? menu : null}
    </>
  );

  return (
    <>
      {createPortal(portalContent, document.body)}
      {shareOpen &&
        createPortal(
          <div className="modal-overlay" onClick={closeShareDialog}>
            <div
              className="modal-card"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div className="modal-header">
                <h3>Share quiz</h3>
              </div>
              <p className="modal-body">
                {shareLoading
                  ? "Generating share link…"
                  : "Copy the link and share it."}
              </p>

              <div className="share-row">
                <input
                  className="share-input"
                  type="text"
                  value={shareUrl}
                  readOnly
                  onFocus={(e) => e.target.select()}
                  aria-label="Share link"
                  placeholder={shareLoading ? "Please wait…" : ""}
                />
                <button
                  className="btn btn-copy"
                  type="button"
                  onClick={copyShareLink}
                  disabled={!shareUrl || shareLoading}
                >
                  {shareLoading ? (
                    <span className="share-copy-loading">
                      <span className="share-spinner" aria-hidden="true" />
                      Loading
                    </span>
                  ) : (
                    "Copy"
                  )}
                </button>
              </div>

              <div className="share-status" aria-live="polite">
                {shareError || copyStatus}
              </div>

              <div className="modal-actions">
                <button className="btn btn-cancel" onClick={closeShareDialog}>
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
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
                  “{quiz?.quizTitle || exam?.quizTitle || "this quiz"}”
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
