import React, { useRef, useEffect, useState } from "react";
import "../style/Quiz_main_page.css";

import { Input } from "./Input";
import { Header } from "./Header";

import { useExams } from "../context/ExamsProvider.jsx";

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

  const quizRef = useRef(null);
  const [questionNumber, setQuestionNumber] = React.useState(0);
  const [totalMarks, setTotalMarks] = React.useState(0);
  const [myMap, setMyMap] = useState(new Map());
  const [submitedMap, setSubmitedMap] = useState(new Map());
  /* const [RightOrWrong, setRightOrWrong] = useState(new Map()); */
  const [showScrollArrow, setShowScrollArrow] = useState(false);
  const [examTransitioning, setExamTransitioning] = useState(false);
  const [initialLoadStarted, setInitialLoadStarted] = useState(false);
  const [initialLoadFinished, setInitialLoadFinished] = useState(false);

  // stable key for current exam
  const examKey = exam.examId || exam.quizId;
  const currentScore = submitedMap.get(examKey);
  const isSubmitted = typeof currentScore === "number";

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
    // scroll to top when a new exam is loaded
    if (quizRef.current) {
      quizRef.current.scrollTo({ top: 0, behavior: "instant" });
    }
    // resetting user answers and the question counter when a NEW exam is loaded
    setQuestionNumber(0);
    setMyMap(new Map());
  }, [examKey]);

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
        next.delete(questionId);
        return next;
      });
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
        next.delete(questionId);
        return next;
      });
      setRegenerateErrorById((prev) => {
        const next = { ...prev };
        delete next[qIdKey];
        return next;
      });

      // If exam was submitted, clear stored score to avoid stale result.
      setSubmitedMap((prev) => {
        const next = new Map(prev);
        next.delete(examKey);
        return next;
      });
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
    const next = new Map(submitedMap);
    next.delete(examKey);
    setSubmitedMap(next);
    setMyMap(new Map());
    if (quizRef.current) {
      quizRef.current.scrollTo({ top: 0, behavior: "instant" });
    }
  };

  const examResult = () => {
    let score = 0;
    exam.questions.forEach(({ id, marks }) => {
      const userAnswer = myMap.get(id);
      const correctAnswer = exam.questions.find(
        (q) => q.id === id
      ).correctAnswer;
      if (
        userAnswer === correctAnswer ||
        (userAnswer == "a" && correctAnswer == "true") ||
        (userAnswer == "b" && correctAnswer == "false")
      ) {
        score += marks;
      }
    });
    const next = new Map(submitedMap);
    next.set(examKey, score);
    setSubmitedMap(next);
  };
  // here we display the exam questions and options
  const getExamResponse = (questions) => {
    return questions.map(({ id, question, options, type, marks }) => {
      const qIdKey = String(id);
      const isRegenerating = !!regeneratingById[qIdKey];
      const regenerateError = regenerateErrorById[qIdKey];
      const isDeleting = !!deletingById[qIdKey];
      const deleteError = deleteErrorById[qIdKey];
      const isBusy = isRegenerating || isDeleting;
      const actionError = deleteError || regenerateError;

      switch (String(type).toLowerCase()) {
        case "mcq":
          return (
            <div className="exam-response" key={id}>
              <h1 className="QuestionTitle Question">
                {questionNumber + id}.{question}
              </h1>
              <div className="Option-list">
                {options?.map((option, index) => (
                  <p
                    className={`Option ${
                      String.fromCharCode(97 + index) == myMap.get(id)
                        ? "selected-option"
                        : ""
                    }`}
                    onClick={() => {
                      const newMap = new Map(myMap);
                      newMap.set(id, String.fromCharCode(97 + index));
                      setMyMap(newMap);
                    }}
                    key={index}
                  >
                    {String.fromCharCode(97 + index)}. {option}
                  </p>
                ))}
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
                <p
                  className={`Option ${
                    String.fromCharCode(97 + 0) === myMap.get(id)
                      ? "selected-option"
                      : ""
                  }`}
                  onClick={() => {
                    const newMap = new Map(myMap);
                    newMap.set(id, String.fromCharCode(97 + 0));
                    setMyMap(newMap);
                  }}
                  key={0}
                >
                  {String.fromCharCode(97 + 0)}. True
                </p>
                <p
                  className={`Option ${
                    String.fromCharCode(97 + 1) === myMap.get(id)
                      ? "selected-option"
                      : ""
                  }`}
                  onClick={() => {
                    const newMap = new Map(myMap);
                    newMap.set(id, String.fromCharCode(97 + 1));
                    setMyMap(newMap);
                  }}
                  key={1}
                >
                  {String.fromCharCode(97 + 1)}. False
                </p>
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
    });
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
                  <div className="submitExamBtn" onClick={examResult}>
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
