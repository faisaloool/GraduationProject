import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";
import { useExams } from "../context/ExamsProvider.jsx";

import { requestPasswordResetEmail } from "../util/service.js";

import "../style/Account_style.css";

export const Account = ({ collapsed = false }) => {
  const navigate = useNavigate();
  const { user, token, login, logout, error, loading } = useAuth();
  const {
    exam,
    setExam,
    exams,
    loading: examsLoading,
    loadExams,
    deleteExam,
    error: examsError,
  } = useExams();
  const name = user?.name || user?.username || "User";
  const email = user?.email || "";
  const avatarUrl = user?.avatar || user?.photoURL || user?.image || "";
  const initials = name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const accountRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState({ top: 0, left: 0 });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordSending, setPasswordSending] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e) => {
      const target = e.target;
      if (
        accountRef.current?.contains(target) ||
        target.closest(".account-quick-menu")
      ) {
        return;
      }
      setMenuOpen(false);
    };
    const handleResize = () => setMenuOpen(false);
    document.addEventListener("mousedown", handleClick);
    window.addEventListener("resize", handleResize);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("resize", handleResize);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!settingsOpen) {
      setPasswordMessage("");
    }
    const onKeyDown = (e) => e.key === "Escape" && setSettingsOpen(false);
    if (settingsOpen) {
      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }
  }, [settingsOpen]);

  const toggleMenu = () => {
    if (accountRef.current) {
      const rect = accountRef.current.getBoundingClientRect();
      setMenuCoords({
        top: rect.top,
        left: rect.right,
      });
    }
    setMenuOpen((prev) => !prev);
  };

  const openSettings = () => {
    setMenuOpen(false);
    setPasswordMessage("");
    setSettingsOpen(true);
  };

  const closeSettings = () => setSettingsOpen(false);

  const handlePasswordChange = async () => {
    if (passwordSending) return;
    setPasswordMessage("");

    if (!email) {
      setPasswordMessage("No email found for this account.");
      return;
    }

    setPasswordSending(true);
    try {
      const result = await requestPasswordResetEmail(email);
      if (result?.error) {
        setPasswordMessage(result.error);
        return;
      }

      setPasswordMessage(
        result?.message ||
          "We sent you an email with a link to change your password."
      );
    } catch (err) {
      setPasswordMessage(err?.message || "Failed to send reset email.");
    } finally {
      setPasswordSending(false);
    }
  };

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    closeSettings();
    setExam({ quizTitle: "Main-page", quizID: null });
    navigate("/");
  };

  const fatalError = examsError || error;
  if (fatalError) {
    return (
      <div
        className={`sb-account ${
          collapsed ? "collapsed" : ""
        } sb-account--error`}
        role="alert"
      >
        <div className="sb-account__avatar skeleton-avatar">!</div>
        {!collapsed && (
          <div className="sb-account__info">
            <p className="account-error-title">Unable to load account</p>
            <p className="account-error-subtitle">{String(fatalError)}</p>
          </div>
        )}
      </div>
    );
  }

  if (examsLoading || !user) {
    return (
      <div
        className={`sb-account ${
          collapsed ? "collapsed" : ""
        } sb-account--skeleton`}
      >
        <div className="sb-account__avatar skeleton-avatar" />
        {!collapsed && (
          <div className="sb-account__info">
            <div className="skeleton-line skeleton-line--wide" />
            <div className="skeleton-line skeleton-line--narrow" />
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div
        ref={accountRef}
        className={`sb-account ${collapsed ? "collapsed" : ""}`}
        title={collapsed ? name : undefined}
        role="button"
        tabIndex={0}
        aria-haspopup="true"
        aria-expanded={menuOpen}
        onClick={toggleMenu}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleMenu();
          }
        }}
      >
        <div className="sb-account__avatar" aria-hidden={!!avatarUrl}>
          {avatarUrl ? (
            <img src={avatarUrl} alt={`${name} avatar`} />
          ) : (
            <span>{initials}</span>
          )}
        </div>

        {!collapsed && (
          <div className="sb-account__info">
            <div className="sb-account__name" title={name}>
              {name}
            </div>
            {email && (
              <div className="sb-account__email" title={email}>
                {email}
              </div>
            )}
          </div>
        )}
      </div>

      {menuOpen &&
        createPortal(
          <div
            className={`account-quick-menu ${
              collapsed ? "account-quick-menu--collapsed" : ""
            }`}
            style={{ top: menuCoords.top, left: menuCoords.left }}
          >
            <button
              type="button"
              onClick={openSettings}
              className="account-quick-item"
            >
              Account settings
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="account-quick-item account-quick-item--danger"
            >
              Log out
            </button>
          </div>,
          document.body
        )}

      {settingsOpen &&
        createPortal(
          <div
            className="account-settings-overlay"
            onClick={closeSettings}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="account-settings-panel"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="account-settings-header">
                <div>
                  <h3>Account settings</h3>
                </div>
                <button
                  type="button"
                  className="account-close-btn"
                  aria-label="Close settings"
                  onClick={closeSettings}
                >
                  ×
                </button>
              </div>

              <div className="account-details-card">
                <div className="account-details-avatar">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={`${name} avatar`} />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                <div>
                  <p className="account-details-label">Current name</p>
                  <p className="account-details-value">{name}</p>
                  <p className="account-details-label">Email</p>
                  <p className="account-details-value">
                    {email || "No email on file"}
                  </p>
                </div>
              </div>

              <label className="account-field-label">Password</label>
              <div className="account-password-row">
                <button
                  type="button"
                  className="account-secondary-btn"
                  onClick={handlePasswordChange}
                  disabled={passwordSending || !email}
                >
                  {passwordSending ? "Sending..." : "Change password"}
                </button>
              </div>
              {passwordMessage && (
                <p className="account-settings-hint">{passwordMessage}</p>
              )}

              <div className="account-settings-actions">
                <button
                  type="button"
                  className="account-secondary-btn"
                  onClick={closeSettings}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="account-danger-btn"
                  onClick={handleLogout}
                >
                  Log out
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
