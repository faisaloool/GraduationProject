import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { Side_bar } from "./Side_bar";
import { Quiz_main_page } from "./Quiz_main_page";
import { Error_page } from "./Error_page";

import { useAuth } from "../context/AuthContext.jsx";
import { useExams } from "../context/ExamsProvider.jsx";

export const Shared_exam_route = ({ editing, setEditing }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const sharedId = params?.id;
  const { isLoggedIn, loading: authLoading } = useAuth();
  const { loadSharedExam } = useExams();

  const lastRequestedIdRef = useRef(null);
  const redirectedToLoginRef = useRef(false);
  const [shareError, setShareError] = useState(null);

  useEffect(() => {
    const cleanSharedId = String(sharedId ?? "").trim();
    setShareError(null);
    if (!cleanSharedId) {
      setShareError("Missing shared quiz id.");
      return;
    }

    // Wait for auth boot to finish so we don't redirect too early.
    if (authLoading) return;

    if (!isLoggedIn) {
      if (redirectedToLoginRef.current) return;
      redirectedToLoginRef.current = true;
      navigate("/Log-in", {
        replace: true,
        state: { from: location.pathname },
      });
      return;
    }
    // Logged in: allow future redirects if the user logs out later.
    redirectedToLoginRef.current = false;

    // Only fetch once per shared id.
    if (lastRequestedIdRef.current === cleanSharedId) return;
    lastRequestedIdRef.current = cleanSharedId;

    (async () => {
      const result = await loadSharedExam(cleanSharedId);
      if (result?.error) {
        setShareError(result.error);
      }
    })();
  }, [
    authLoading,
    isLoggedIn,
    loadSharedExam,
    location.pathname,
    navigate,
    sharedId,
  ]);

  if (shareError) {
    return <Error_page error={shareError} />;
  }

  // While redirecting to login, render nothing.
  if (!authLoading && !isLoggedIn) return null;

  // Keep layout consistent with other pages.
  return (
    <main className="layout">
      <Side_bar editing={editing} setEditing={setEditing} />
      <Quiz_main_page editing={editing} setEditing={setEditing} />
    </main>
  );
};
