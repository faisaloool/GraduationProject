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

  const sharedToken = params.token;
  const { isLoggedIn, loading: authLoading } = useAuth();
  const { loadSharedExam } = useExams();

  const lastRequestedIdRef = useRef(null);
  const redirectedToLoginRef = useRef(false);
  const [shareError, setShareError] = useState(null);

  useEffect(() => {
    const cleanSharedToken = String(sharedToken ?? "").trim();
    setShareError(null);
    if (!cleanSharedToken) {
      setShareError("Missing shared quiz token.");
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
    if (lastRequestedIdRef.current === cleanSharedToken) return;
    lastRequestedIdRef.current = cleanSharedToken;

    (async () => {
      const result = await loadSharedExam(cleanSharedToken);
      if (result?.error) {
        setShareError(result.error);
        return;
      }

      // If backend saved the shared exam into the user's exams, switch to normal route
      // and force a full reload so state is guaranteed to be fresh.
      if (result?.saved) {
        try {
          sessionStorage.setItem("quizai:selectLastExamOnLoad", "1");
        } catch {
          // ignore storage errors
        }
        window.location.assign("/");
      }
    })();
  }, [
    authLoading,
    isLoggedIn,
    loadSharedExam,
    location.pathname,
    navigate,
    sharedToken,
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
