import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";
import { useExams } from "../context/ExamsProvider.jsx";

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
  const [nameInput, setNameInput] = useState(name);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  useEffect(() => setNameInput(name), [name]);

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
      setPasswordInput("");
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
        left: rect.left + rect.width,
      });
    }
    setMenuOpen((prev) => !prev);
  };

  const openSettings = () => {
    setMenuOpen(false);
    setNameInput(name);
    setPasswordInput("");
    setPasswordMessage("");
    setSettingsOpen(true);
  };

  const closeSettings = () => setSettingsOpen(false);

  const handleSaveSettings = () => {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== name) {
      const remember = Boolean(localStorage.getItem("token"));
      login({ ...user, name: trimmed }, token, remember);
    }
    closeSettings();
  };

  const handlePasswordChange = () => {
    if (!passwordInput.trim()) {
      setPasswordMessage("Enter a new password before updating.");
      return;
    }
    setPasswordMessage("Password updated (demo only).");
    setPasswordInput("");
  };

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    closeSettings();
    setExam({ title: "Main-page" });
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
            className="account-quick-menu"
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
                  <p>Update your profile information and manage security.</p>
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

              <label
                className="account-field-label"
                htmlFor="account-name-input"
              >
                Display name
              </label>
              <input
                id="account-name-input"
                className="account-field-input"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
              />

              <label
                className="account-field-label"
                htmlFor="account-password-input"
              >
                New password
              </label>
              <div className="account-password-row">
                <input
                  id="account-password-input"
                  className="account-field-input"
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                />
                <button
                  type="button"
                  className="account-secondary-btn"
                  onClick={handlePasswordChange}
                  disabled={!passwordInput.trim()}
                >
                  Change password
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
                <button
                  type="button"
                  className="account-primary-btn"
                  onClick={handleSaveSettings}
                >
                  Save changes
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
