import React, { useRef, useEffect, useState } from "react";
import "../style/Quiz_main_page.css";

import { Input } from "./Input";
import { Header } from "./Header";

import { useExams } from "../context/ExamsProvider.jsx";
import { useAuth } from "../context/AuthContext.jsx";
/* import { submitExamAnswers } from "../util/service.js"; */

import { GrRefresh } from "react-icons/gr";
import { MdDeleteForever } from "react-icons/md";

import { AntigravityCanvas } from "./AntigravityCanvas";
import { FeedbackPopup } from "./FeedbackPopup";
import { ScrollToBottomIndicator } from "./ScrollToBottomIndicator";

// REMOVE the inline ScrollToBottomIndicator component definition here
// (it now lives in ./ScrollToBottomIndicator.jsx)

export const Quiz_main_page = ({ editing, setEditing }) => {
  const {
    exam,
    setExam,
    getExamData,
    exams,
    loading,
    regeneratingQuiz,
    examResetNonce,
    feedback,
    clearFeedback,
    loadExams,
    deleteExam,
    regenerateExamQuestion,
    deleteExamQuestion,
    error,
  } = useExams();

  const { user, token } = useAuth();

  const quizRef = useRef(null);
  const [questionNumber, setQuestionNumber] = React.useState(0);
  const [totalMarks, setTotalMarks] = React.useState(0);
  const [myMap, setMyMap] = useState(new Map());
  const [submittedScore, setSubmittedScore] = useState(null);
  const [submitSyncError, setSubmitSyncError] = useState(null);
  const [examStateHydrated, setExamStateHydrated] = useState(false);
  const [showScrollArrow, setShowScrollArrow] = useState(false);
  const [examTransitioning, setExamTransitioning] = useState(false);
  const [initialLoadStarted, setInitialLoadStarted] = useState(false);
  const [initialLoadFinished, setInitialLoadFinished] = useState(false);

  // Track latest transition to avoid stale async/timers causing twitch
  const transitionSeqRef = useRef(0);
  const transitionTimerRef = useRef(null);

  // stable key for current exam (normalized to string to avoid 1 vs "1" changes)
  const examKeyRaw = exam?.quizID;
  const examKey = examKeyRaw == null ? null : String(examKeyRaw);

  const currentScore = submittedScore;
  const isSubmitted = typeof currentScore === "number";

  const getCurrentUserId = () =>
    user?.id ?? user?.userId ?? user?._id ?? user?.uid ?? null;

  const getExamStorageKey = (userIdValue, examIdValue) =>
    `quizai:examState:${String(userIdValue || "anon")}:${String(examIdValue)}`;

  const mapToObject = (map) => {
    const obj = {};
    for (const [k, v] of map.entries()) obj[String(k)] = v;
    return obj;
  };

  const objectToMap = (obj) => {
    const map = new Map();
    if (!obj || typeof obj !== "object") return map;
    for (const [k, v] of Object.entries(obj)) map.set(String(k), v);
    return map;
  };

  const saveExamState = (nextMap, nextSubmittedScore, nextSubmitSyncError) => {
    const quizID = examKey;
    if (!quizID) return;

    const userIdValue = getCurrentUserId();
    const key = getExamStorageKey(userIdValue, quizID);

    try {
      const payload = {
        answers: mapToObject(nextMap),
        submitted: typeof nextSubmittedScore === "number",
        score:
          typeof nextSubmittedScore === "number" ? nextSubmittedScore : null,
        submitSyncError: nextSubmitSyncError || null,
      };
      localStorage.setItem(key, JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }
  };

  const loadExamState = () => {
    const quizID = examKey;
    if (!quizID)
      return { answers: new Map(), score: null, submitSyncError: null };

    const userIdValue = getCurrentUserId();
    const key = getExamStorageKey(userIdValue, quizID);

    try {
      const raw = localStorage.getItem(key);
      if (!raw)
        return { answers: new Map(), score: null, submitSyncError: null };
      const parsed = JSON.parse(raw);
      const answers = objectToMap(parsed?.answers);
      const score = typeof parsed?.score === "number" ? parsed.score : null;
      const submitSyncError = parsed?.submitSyncError || null;
      return { answers, score, submitSyncError };
    } catch {
      return { answers: new Map(), score: null, submitSyncError: null };
    }
  };

  const [regeneratingById, setRegeneratingById] = useState({});
  const [regenerateErrorById, setRegenerateErrorById] = useState({});

  const [deletingById, setDeletingById] = useState({});
  const [deleteErrorById, setDeleteErrorById] = useState({});

  useEffect(() => {
    if (!initialLoadStarted && loading) {
      setInitialLoadStarted(true);
      return;
    }
    if (initialLoadStarted && !loading && !initialLoadFinished) {
      setInitialLoadFinished(true);
    }
  }, [loading, initialLoadStarted, initialLoadFinished]);

  useEffect(() => {
    if (exam.quizTitle === "Main-page" || !exam.quizTitle) return;
    if (!examKey) return;

    let cancelled = false;
    const seq = ++transitionSeqRef.current;

    // cancel any pending "end transition" from previous exam switches
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }

    setExamTransitioning(true);

    (async () => {
      const startedAt = Date.now();
      try {
        await getExamData(examKey, token);
      } finally {
        const elapsed = Date.now() - startedAt;
        const remaining = Math.max(0, 350 - elapsed);

        const finish = () => {
          if (cancelled) return;
          if (transitionSeqRef.current !== seq) return; // a newer transition started
          setExamTransitioning(false);
        };

        if (cancelled || transitionSeqRef.current !== seq) return;

        if (remaining) {
          transitionTimerRef.current = setTimeout(finish, remaining);
        } else {
          finish();
        }
      }
    })();

    return () => {
      cancelled = true;
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = null;
      }
    };
  }, [examKey, token]);

  useEffect(() => {
    setExamStateHydrated(false);
    // scroll to top when a new exam is loaded
    if (quizRef.current) {
      quizRef.current.scrollTo({ top: 0, behavior: "instant" });
    }
    // resetting user answers and the question counter when a NEW exam is loaded
    setQuestionNumber(0);

    const {
      answers,
      score,
      submitSyncError: storedSyncError,
    } = loadExamState();
    setMyMap(answers);
    setSubmittedScore(score);
    setSubmitSyncError(storedSyncError);
    setExamStateHydrated(true);
  }, [examKey, examResetNonce]);

  useEffect(() => {
    if (!examStateHydrated) return;
    saveExamState(myMap, submittedScore, submitSyncError);
  }, [examStateHydrated, examKey, myMap, submittedScore, submitSyncError]);

  useEffect(() => {
    // calculating total marks of the exam (can change without changing examKey)
    /* let marks = 0;
    exam.questions?.forEach(({ marks: m }) => {
      marks += m;
    }); */
    setTotalMarks(exam.questions?.length * 1 || 0);
  }, [examKey, exam.questions]);

  const handleRegenerateQuestion = async (questionId, questionPayload) => {
    const quizID = examKey;
    const qIdKey = String(questionId);

    if (!quizID) {
      setRegenerateErrorById((prev) => ({
        ...prev,
        [qIdKey]: "Missing quiz id.",
      }));
      return;
    }

    setRegeneratingById((prev) => ({ ...prev, [qIdKey]: true }));
    setRegenerateErrorById((prev) => {
      const next = { ...prev };
      delete next[qIdKey];
      return next;
    });

    const result = await regenerateExamQuestion(
      quizID,
      questionId,
      questionPayload
    );

    if (result?.error) {
      setRegenerateErrorById((prev) => ({
        ...prev,
        [qIdKey]: result.error,
      }));
    } else {
      // Clear the user's selected answer for this question (options likely changed)
      setMyMap((prev) => {
        const next = new Map(prev);
        next.delete(String(questionId));
        return next;
      });

      // Clear submission since questions changed.
      setSubmittedScore(null);
      setSubmitSyncError(null);
    }

    setRegeneratingById((prev) => {
      const next = { ...prev };
      delete next[qIdKey];
      return next;
    });
  };

  const handleDeleteQuestion = async (questionId) => {
    const quizID = examKey;
    const qIdKey = String(questionId);

    if (!quizID) {
      setDeleteErrorById((prev) => ({
        ...prev,
        [qIdKey]: "Missing quiz id.",
      }));
      return;
    }

    setDeletingById((prev) => ({ ...prev, [qIdKey]: true }));
    setDeleteErrorById((prev) => {
      const next = { ...prev };
      delete next[qIdKey];
      return next;
    });

    const result = await deleteExamQuestion(quizID, questionId);

    if (result?.error) {
      setDeleteErrorById((prev) => ({
        ...prev,
        [qIdKey]: result.error,
      }));
    } else {
      // Clear selected answer + any previous regen error for this question.
      setMyMap((prev) => {
        const next = new Map(prev);
        next.delete(String(questionId));
        return next;
      });
      setRegenerateErrorById((prev) => {
        const next = { ...prev };
        delete next[qIdKey];
        return next;
      });

      // Clear submission since questions changed.
      setSubmittedScore(null);
      setSubmitSyncError(null);
    }

    setDeletingById((prev) => {
      const next = { ...prev };
      delete next[qIdKey];
      return next;
    });
  };

  useEffect(() => {
    const el = quizRef.current;
    if (!el) return;

    const check = () => {
      const canScroll = el.scrollHeight > el.clientHeight + 1;
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 2;
      setShowScrollArrow(canScroll && !atBottom);
    };

    check();
    el.addEventListener("scroll", check);
    window.addEventListener("resize", check);
    const obs = new MutationObserver(check);
    obs.observe(el, { childList: true, subtree: true });

    return () => {
      el.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
      obs.disconnect();
    };
  }, [exam]);

  // After a submission is recorded, auto-scroll to bottom to reveal the result
  useEffect(() => {
    if (isSubmitted) {
      // allow DOM to render the result first
      requestAnimationFrame(scrollToBottom);
    }
  }, [isSubmitted]);

  // Smoothly scroll the main container to the bottom when the arrow is clicked
  const scrollToBottom = () => {
    const el = quizRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  // Reset current exam submission and answers
  const handleRetry = () => {
    const quizID = examKey;
    const userIdValue = getCurrentUserId();
    if (quizID) {
      try {
        localStorage.removeItem(getExamStorageKey(userIdValue, quizID));
      } catch {
        // ignore
      }
    }

    setSubmittedScore(null);
    setSubmitSyncError(null);
    setMyMap(new Map());
    if (quizRef.current) {
      quizRef.current.scrollTo({ top: 0, behavior: "instant" });
    }
  };

  const normalizeString = (v) =>
    String(v ?? "")
      .trim()
      .toLowerCase();

  const stripOptionLabel = (v) =>
    String(v ?? "")
      .replace(/^\s*([a-dA-D]|\d{1,2})\s*[\)\.\:\-]\s+/, "")
      .replace(/^\s*[•\-–—]\s+/, "")
      .trim();

  const optionLooksLabeled = (v) =>
    /^\s*([a-dA-D]|\d{1,2})\s*[\)\.\:\-]\s+/.test(String(v ?? "")) ||
    /^\s*[•\-–—]\s+/.test(String(v ?? ""));

  const parseNumericIndex = (v) => {
    const n = Number.parseInt(String(v ?? ""), 10);
    return Number.isFinite(n) ? n : null;
  };

  const letterToIndex = (v) => {
    const s = normalizeString(v);
    if (s.length === 1 && s >= "a" && s <= "z") {
      return s.charCodeAt(0) - 97;
    }
    return null;
  };

  const coerceSelectionIndex = (v) => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    const fromLetter = letterToIndex(v);
    if (fromLetter != null) return fromLetter;
    const numeric = parseNumericIndex(v);
    return numeric != null ? numeric : null;
  };

  const getQuestionKey = (q) =>
    q?.questionID ?? q?.id ?? q?.questionId ?? q?._id ?? null;

  const normalizeChoicesToOptions = (q) => {
    const raw = Array.isArray(q?.options)
      ? q.options
      : Array.isArray(q?.choices)
      ? q.choices
      : [];

    const options = raw
      .map((item) => {
        if (typeof item === "string") return item;
        if (!item || typeof item !== "object") return null;
        return item.choice ?? item.text ?? item.value ?? null;
      })
      .filter((v) => typeof v === "string" && v.trim());

    return options;
  };

  const getCorrectOptionIndex = (q) => {
    const options = normalizeChoicesToOptions(q);

    // New format may omit `type`; infer True/False when possible.
    let type = normalizeString(q?.type);
    if (!type) {
      const o0 = normalizeString(options?.[0]);
      const o1 = normalizeString(options?.[1]);
      const suggested = normalizeString(q?.suggestedAnswer);
      const inferredTrueFalse =
        (options?.length === 2 &&
          ((o0 === "true" && o1 === "false") ||
            (o0 === "false" && o1 === "true"))) ||
        suggested === "true" ||
        suggested === "false" ||
        suggested === "t" ||
        suggested === "f";
      if (inferredTrueFalse) type = "truefalse";
    }

    const rawCorrect = q?.correctAnswer ?? q?.suggestedAnswer;
    const correct = normalizeString(rawCorrect);

    if (!correct) return null;

    if (type === "truefalse") {
      if (correct === "a") return 0;
      if (correct === "b") return 1;
      if (correct === "true" || correct === "t" || correct === "yes") return 0;
      if (correct === "false" || correct === "f" || correct === "no") return 1;

      const numeric = parseNumericIndex(rawCorrect);
      if (numeric === 1) return 0;
      if (numeric === 0) return 1;
      return null;
    }

    // MCQ: letter form
    {
      const idx = letterToIndex(rawCorrect);
      if (idx != null) return idx;
    }

    // Sometimes backends send index (0..)
    if (typeof q?.correctAnswer === "number" && q.correctAnswer >= 0) {
      return q.correctAnswer;
    }

    // Sometimes backends send numeric strings (0.. or 1..)
    {
      const numeric = parseNumericIndex(rawCorrect);
      if (numeric != null) {
        if (numeric >= 0 && numeric <= 10) {
          // accept either 0-based or 1-based
          const zeroBased = numeric <= 3 ? numeric : numeric - 1;
          if (zeroBased >= 0 && zeroBased <= 10) return zeroBased;
        }
      }
    }

    // Sometimes backends send option text
    const idx = options.findIndex(
      (opt) =>
        normalizeString(stripOptionLabel(opt)) ===
        normalizeString(stripOptionLabel(rawCorrect))
    );
    if (idx >= 0) return idx;

    return null;
  };

  const isAnswerCorrect = (q, selectedIndexValue) => {
    const selectedIndex = coerceSelectionIndex(selectedIndexValue);
    if (selectedIndex == null) return false;
    const correctIndex = getCorrectOptionIndex(q);
    return correctIndex != null && selectedIndex === correctIndex;
  };

  const handleSubmitExam = async () => {
    if (!examKey) return;
    if (isSubmitted) return;

    setSubmitSyncError(null);

    let score = 0;
    const questions = Array.isArray(exam?.questions) ? exam.questions : [];
    for (const q of questions) {
      const qKey = getQuestionKey(q);
      const selectedIndexValue = myMap.get(String(qKey));
      if (isAnswerCorrect(q, selectedIndexValue)) {
        score += Number(1) || 0;
      }
    }

    setSubmittedScore(score);

    const userIdValue = getCurrentUserId();
    if (!userIdValue) {
      setSubmitSyncError("Not logged in. Saved locally only.");
      return;
    }

    const answers = Array.from(myMap.entries()).map(
      ([questionId, selectedOption]) => ({
        questionId,
        selectedOption,
      })
    );
  };

  // here we display the exam questions and options
  const getExamResponse = (questions) => {
    // Guard: only render once we have a valid questions array
    if (!Array.isArray(questions) || questions.length === 0) return null;

    return questions.map((q, index) => {
      const id = getQuestionKey(q);
      const question = q?.questionContent ?? q?.question ?? "";
      const options = normalizeChoicesToOptions(q);
      const type = q?.type;
      const marks = q?.marks;
      const correctAnswer = q?.correctAnswer ?? q?.suggestedAnswer;

      const qIdKey = String(id);
      const isRegenerating = !!regeneratingById[qIdKey];
      const regenerateError = regenerateErrorById[qIdKey];
      const isDeleting = !!deletingById[qIdKey];
      const deleteError = deleteErrorById[qIdKey];
      const isBusy = isRegenerating || isDeleting;
      const actionError = deleteError || regenerateError;

      if (id == null) {
        return (
          <div className="exam-response" key={`missing-id-${index}`}>
            <h1>Invalid question (missing id)</h1>
          </div>
        );
      }

      const correctIndex = getCorrectOptionIndex({
        id,
        question,
        options,
        type,
        marks,
        correctAnswer,
      });
      const selectedIndex = coerceSelectionIndex(myMap.get(String(id)));

      return (
        <div className="exam-response" key={id}>
          <h1 className="QuestionTitle Question">
            {questionNumber + index + 1}. {question}
          </h1>

          <div className="Option-list">
            {Array.isArray(options) && options.length > 0 ? (
              options.map((option, optIndex) => {
                const letter = String.fromCharCode(97 + optIndex);
                const isSelected = optIndex === selectedIndex;
                const isCorrect = isSubmitted && correctIndex === optIndex;
                const isWrong =
                  isSubmitted &&
                  isSelected &&
                  correctIndex != null &&
                  correctIndex !== optIndex;

                const optionText = optionLooksLabeled(option)
                  ? String(option)
                  : `${letter}. ${option}`;

                return (
                  <p
                    className={`Option ${isSelected ? "selected-option" : ""} ${
                      isSubmitted ? "locked" : ""
                    } ${isCorrect ? "correct-option" : ""} ${
                      isWrong ? "wrong-option" : ""
                    }`}
                    onClick={() => {
                      if (isSubmitted) return;
                      const newMap = new Map(myMap);
                      newMap.set(String(id), optIndex);
                      setMyMap(newMap);
                    }}
                    key={optIndex}
                  >
                    {optionText}
                  </p>
                );
              })
            ) : (
              <p className="Option locked">No choices available.</p>
            )}
          </div>

          <div className="options">
            <button
              type="button"
              className={`option-item ${isRegenerating ? "is-loading" : ""}`}
              aria-label="Regenerate question"
              data-tooltip="Regenerate question"
              aria-busy={isRegenerating}
              disabled={isBusy}
              onClick={() => handleRegenerateQuestion(id, q)}
            >
              {isRegenerating ? (
                <span className="option-spinner" aria-hidden />
              ) : (
                <GrRefresh aria-hidden />
              )}
            </button>

            <button
              type="button"
              className={`option-item delete-option ${
                isDeleting ? "is-loading" : ""
              }`}
              aria-label="Delete question"
              data-tooltip="Delete question"
              aria-busy={isDeleting}
              disabled={isBusy}
              onClick={() => handleDeleteQuestion(id)}
            >
              {isDeleting ? (
                <span className="option-spinner" aria-hidden />
              ) : (
                <MdDeleteForever aria-hidden />
              )}
            </button>
          </div>

          {actionError && (
            <p className="question-action-error" role="alert">
              {actionError}
            </p>
          )}
        </div>
      );
    });
  };

  const isWelcomePage = exam.quizTitle === "Main-page" || !exam.quizTitle;
  const showInitialLoader =
    regeneratingQuiz || (loading && !initialLoadFinished);
  const showExamSkeleton = !showInitialLoader && examTransitioning;
  const showExamContent =
    !showInitialLoader && !examTransitioning && !isWelcomePage;

  return (
    <div className="page">
      <FeedbackPopup feedback={feedback} onClose={clearFeedback} />
      <div className="header">
        <Header
          quiz={error ? { quizTitle: "Main-page" } : exam}
          setEditing={setEditing}
        />
      </div>

      <main ref={quizRef}>
        {error ? (
          <div className="exam-space">
            <div className="exam-error-card" role="alert">
              <h2>Sorry somthing went wrong </h2>
              <p>{String(error)}</p>
            </div>
          </div>
        ) : showInitialLoader ? (
          <div className="exam-space">
            <div
              className="quiz-initial-loader"
              role="status"
              aria-live="polite"
            >
              <div className="quiz-initial-loader-spinner" aria-hidden />
              <div className="quiz-initial-loader-text">Loading...</div>
            </div>
          </div>
        ) : isWelcomePage ? (
          <div className="wellcome-page">
            <AntigravityCanvas className="welcome-canvas" />
            <div className="wellcome-content">
              <h1 className="wellcome">
                <span className="wlc">Welcome to </span>
                <span className="quiz">Quiz AI</span>
              </h1>
              <p className="subtitle">Get ready for endless learning!</p>
            </div>
            <div className="input wellcome-content">
              <Input setExam={setExam} />
            </div>
          </div>
        ) : (
          <div className="exam-space">
            {showExamSkeleton && (
              <div className="exam-skeleton">
                <div className="skeleton-message shimmer" />
                {[0, 1].map((idx) => (
                  <div className="exam-skeleton-question" key={idx}>
                    <div className="skeleton-question-title shimmer" />
                    <div className="skeleton-option-list">
                      {Array.from({ length: idx === 0 ? 4 : 2 }).map(
                        (_, optIdx) => (
                          <div
                            className="skeleton-option-line shimmer"
                            key={optIdx}
                          />
                        )
                      )}
                    </div>
                  </div>
                ))}
                <div className="skeleton-submit shimmer" />
              </div>
            )}

            {showExamContent && (
              <>
                <div className="userMessage">
                  <div className="message">
                    generate an exam for {exam.quizTitle}
                  </div>
                </div>
                {getExamResponse(exam.questions)}

                {!isSubmitted && (
                  <div className="submitExamBtn" onClick={handleSubmitExam}>
                    submit
                  </div>
                )}

                {isSubmitted && (
                  <div className="exam-result-row">
                    <div className="exam-result">{`You scored ${currentScore} / ${totalMarks}`}</div>
                    <button className="retry-btn" onClick={handleRetry}>
                      Retry
                    </button>
                  </div>
                )}

                {isSubmitted && submitSyncError && (
                  <div className="exam-sync-error" role="alert">
                    {String(submitSyncError)}
                  </div>
                )}
                {/* fixed bottom-center scroll indicator */}
                <ScrollToBottomIndicator
                  visible={showScrollArrow}
                  onActivate={scrollToBottom}
                />
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
