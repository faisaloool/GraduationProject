import React, { useRef, useEffect, useState } from "react";
import "../style/Quiz_main_page.css";

import { Input } from "./Input";
import { Header } from "./Header";

import { useExams } from "../context/ExamsProvider.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { submitExamAnswers } from "../util/service.js";

import { GrRefresh } from "react-icons/gr";
import { MdDeleteForever } from "react-icons/md";

import { AntigravityCanvas } from "./AntigravityCanvas";

export const Quiz_main_page = ({ editing, setEditing }) => {
  const {
    exam,
    setExam,
    exams,
    loading,
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
  /* const [RightOrWrong, setRightOrWrong] = useState(new Map()); */
  const [showScrollArrow, setShowScrollArrow] = useState(false);
  const [examTransitioning, setExamTransitioning] = useState(false);
  const [initialLoadStarted, setInitialLoadStarted] = useState(false);
  const [initialLoadFinished, setInitialLoadFinished] = useState(false);

  // stable key for current exam
  const examKey = exam.examId || exam.quizId;
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
    const examId = examKey;
    if (!examId) return;

    const userIdValue = getCurrentUserId();
    const key = getExamStorageKey(userIdValue, examId);

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
    const examId = examKey;
    if (!examId)
      return { answers: new Map(), score: null, submitSyncError: null };

    const userIdValue = getCurrentUserId();
    const key = getExamStorageKey(userIdValue, examId);

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
    if (exam.title === "Main-page" || !exam.title) return;
    setExamTransitioning(true);
    const timer = setTimeout(() => setExamTransitioning(false), 350);
    return () => clearTimeout(timer);
  }, [exam.examId, exam.quizId, exam.title]);

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
  }, [examKey]);

  useEffect(() => {
    if (!examStateHydrated) return;
    saveExamState(myMap, submittedScore, submitSyncError);
  }, [examStateHydrated, examKey, myMap, submittedScore, submitSyncError]);

  useEffect(() => {
    // calculating total marks of the exam (can change without changing examKey)
    let marks = 0;
    exam.questions?.forEach(({ marks: m }) => {
      marks += m;
    });
    setTotalMarks(marks);
  }, [examKey, exam.questions]);

  const handleRegenerateQuestion = async (questionId, questionPayload) => {
    const quizId = examKey;
    const qIdKey = String(questionId);

    if (!quizId) {
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
      quizId,
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
    const quizId = examKey;
    const qIdKey = String(questionId);

    if (!quizId) {
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

    const result = await deleteExamQuestion(quizId, questionId);

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
    const examId = examKey;
    const userIdValue = getCurrentUserId();
    if (examId) {
      try {
        localStorage.removeItem(getExamStorageKey(userIdValue, examId));
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

  const parseNumericIndex = (v) => {
    const n = Number.parseInt(String(v ?? ""), 10);
    return Number.isFinite(n) ? n : null;
  };

  const getCorrectOptionLetter = (q) => {
    const type = normalizeString(q?.type);
    const rawCorrect = q?.correctAnswer;
    const correct = normalizeString(rawCorrect);

    if (!correct) return null;

    if (type === "truefalse") {
      if (correct === "a" || correct === "b") return correct;
      if (correct === "true" || correct === "t" || correct === "yes")
        return "a";
      if (correct === "false" || correct === "f" || correct === "no")
        return "b";

      const numeric = parseNumericIndex(rawCorrect);
      if (numeric === 1) return "a";
      if (numeric === 0) return "b";
      return null;
    }

    // MCQ
    if (correct.length === 1 && correct >= "a" && correct <= "d") {
      return correct;
    }

    // Sometimes backends send index (0..)
    if (typeof q?.correctAnswer === "number" && q.correctAnswer >= 0) {
      return String.fromCharCode(97 + q.correctAnswer);
    }

    // Sometimes backends send numeric strings (0.. or 1..)
    {
      const numeric = parseNumericIndex(rawCorrect);
      if (numeric != null) {
        if (numeric >= 0 && numeric <= 10) {
          // accept either 0-based or 1-based
          const zeroBased = numeric <= 3 ? numeric : numeric - 1;
          if (zeroBased >= 0 && zeroBased <= 3) {
            return String.fromCharCode(97 + zeroBased);
          }
        }
      }
    }

    // Sometimes backends send option text
    const options = Array.isArray(q?.options) ? q.options : [];
    const idx = options.findIndex(
      (opt) => normalizeString(opt) === normalizeString(q?.correctAnswer)
    );
    if (idx >= 0) return String.fromCharCode(97 + idx);

    return null;
  };

  const isAnswerCorrect = (q, selectedLetter) => {
    const selected = normalizeString(selectedLetter);
    if (!selected) return false;
    const correctLetter = getCorrectOptionLetter(q);
    return !!correctLetter && selected === correctLetter;
  };

  const handleSubmitExam = async () => {
    if (!examKey) return;
    if (isSubmitted) return;

    setSubmitSyncError(null);

    let score = 0;
    const questions = Array.isArray(exam?.questions) ? exam.questions : [];
    for (const q of questions) {
      const selected = myMap.get(String(q.id));
      if (isAnswerCorrect(q, selected)) {
        score += Number(q.marks) || 0;
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

    const result = await submitExamAnswers(
      {
        userId: userIdValue,
        examId: examKey,
        answers,
      },
      token
    );

    if (result?.error) {
      setSubmitSyncError(result.error);
    }
  };
  // here we display the exam questions and options
  const getExamResponse = (questions) => {
    return questions.map(
      ({ id, question, options, type, marks, correctAnswer }) => {
        const qIdKey = String(id);
        const isRegenerating = !!regeneratingById[qIdKey];
        const regenerateError = regenerateErrorById[qIdKey];
        const isDeleting = !!deletingById[qIdKey];
        const deleteError = deleteErrorById[qIdKey];
        const isBusy = isRegenerating || isDeleting;
        const actionError = deleteError || regenerateError;
        const correctLetter = getCorrectOptionLetter({
          id,
          question,
          options,
          type,
          marks,
          correctAnswer,
        });
        const selectedLetter = myMap.get(String(id));

        switch (String(type).toLowerCase()) {
          case "mcq":
            return (
              <div className="exam-response" key={id}>
                <h1 className="QuestionTitle Question">
                  {questionNumber + id}.{question}
                </h1>
                <div className="Option-list">
                  {options?.map((option, index) => {
                    const letter = String.fromCharCode(97 + index);
                    const isSelected = letter == selectedLetter;
                    const isCorrect = isSubmitted && correctLetter === letter;
                    const isWrong =
                      isSubmitted &&
                      isSelected &&
                      correctLetter &&
                      correctLetter !== letter;

                    return (
                      <p
                        className={`Option ${
                          isSelected ? "selected-option" : ""
                        } ${isSubmitted ? "locked" : ""} ${
                          isCorrect ? "correct-option" : ""
                        } ${isWrong ? "wrong-option" : ""}`}
                        onClick={() => {
                          if (isSubmitted) return;
                          const newMap = new Map(myMap);
                          newMap.set(String(id), letter);
                          setMyMap(newMap);
                        }}
                        key={index}
                      >
                        {letter}. {option}
                      </p>
                    );
                  })}
                </div>
                <div className="options">
                  <button
                    type="button"
                    className={`option-item ${
                      isRegenerating ? "is-loading" : ""
                    }`}
                    aria-label="Regenerate question"
                    data-tooltip="Regenerate question"
                    aria-busy={isRegenerating}
                    disabled={isBusy}
                    onClick={() =>
                      handleRegenerateQuestion(id, {
                        id,
                        question,
                        options,
                        type,
                        marks,
                      })
                    }
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

          case "truefalse":
            return (
              <div className="exam-response" key={id}>
                <h1 className="QuestionTitle Question">{question}</h1>
                <div className="Option-list">
                  {(() => {
                    const letter = "a";
                    const isSelected = letter === selectedLetter;
                    const isCorrect = isSubmitted && correctLetter === letter;
                    const isWrong =
                      isSubmitted &&
                      isSelected &&
                      correctLetter &&
                      correctLetter !== letter;

                    return (
                      <p
                        className={`Option ${
                          isSelected ? "selected-option" : ""
                        } ${isSubmitted ? "locked" : ""} ${
                          isCorrect ? "correct-option" : ""
                        } ${isWrong ? "wrong-option" : ""}`}
                        onClick={() => {
                          if (isSubmitted) return;
                          const newMap = new Map(myMap);
                          newMap.set(String(id), String.fromCharCode(97 + 0));
                          setMyMap(newMap);
                        }}
                        key={0}
                      >
                        {String.fromCharCode(97 + 0)}. True
                      </p>
                    );
                  })()}

                  {(() => {
                    const letter = "b";
                    const isSelected = letter === selectedLetter;
                    const isCorrect = isSubmitted && correctLetter === letter;
                    const isWrong =
                      isSubmitted &&
                      isSelected &&
                      correctLetter &&
                      correctLetter !== letter;

                    return (
                      <p
                        className={`Option ${
                          isSelected ? "selected-option" : ""
                        } ${isSubmitted ? "locked" : ""} ${
                          isCorrect ? "correct-option" : ""
                        } ${isWrong ? "wrong-option" : ""}`}
                        onClick={() => {
                          if (isSubmitted) return;
                          const newMap = new Map(myMap);
                          newMap.set(String(id), String.fromCharCode(97 + 1));
                          setMyMap(newMap);
                        }}
                        key={1}
                      >
                        {String.fromCharCode(97 + 1)}. False
                      </p>
                    );
                  })()}
                </div>
                <div className="options">
                  <button
                    type="button"
                    className={`option-item ${
                      isRegenerating ? "is-loading" : ""
                    }`}
                    aria-label="Regenerate question"
                    data-tooltip="Regenerate question"
                    aria-busy={isRegenerating}
                    disabled={isBusy}
                    onClick={() =>
                      handleRegenerateQuestion(id, {
                        id,
                        question,
                        options,
                        type,
                        marks,
                      })
                    }
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

          default:
            return (
              <div className="exam-response" key={id}>
                <h1>Unknown question type</h1>
              </div>
            );
        }
      }
    );
  };

  const isWelcomePage = exam.title === "Main-page" || !exam.title;
  const showInitialLoader = loading && !initialLoadFinished;
  const showExamSkeleton = !showInitialLoader && examTransitioning;
  const showExamContent =
    !showInitialLoader && !examTransitioning && !isWelcomePage;

  return (
    <div className="page">
      <div className="header">
        <Header
          quiz={error ? { title: "Main-page" } : exam}
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
                    generate an exam for {exam.title}
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
                <div
                  className={`scroll-indicator ${
                    showScrollArrow ? "" : "hidden"
                  }`}
                  role="button"
                  tabIndex={showScrollArrow ? 0 : -1}
                  onClick={showScrollArrow ? scrollToBottom : undefined}
                  onKeyDown={(e) => {
                    if (!showScrollArrow) return;
                    if (e.key === "Enter" || e.key === " ") scrollToBottom();
                  }}
                  aria-label="Scroll to bottom"
                  title="Scroll to bottom"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="30"
                    height="30"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M6 9l6 6 6-6"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
