import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  use,
  useCallback,
} from "react";
import {
  fetchUserExams,
  renameQuiz,
  deleteQuizService,
  fetchSharedExam,
  regenerateQuiz,
  regenerateQuestion,
  deleteQuestion,
  getQuizInfo,
  submitExamAnswers,
} from "../util/service.js";
import { useAuth } from "./AuthContext.jsx";

const ExamsContext = createContext();

export function ExamsProvider({ children }) {
  const { user, token } = useAuth();
  const [exam, _setExam] = useState({ quizTitle: "Main-page", quizID: null });
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [regeneratingQuiz, setRegeneratingQuiz] = useState(false);
  const [examResetNonce, setExamResetNonce] = useState(0);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const MAX_EXAM_TITLE_LENGTH = 40;

  const getExamId = (maybeExam) =>
    maybeExam?.quizID ??
    maybeExam?.quizId ??
    maybeExam?.examId ??
    maybeExam?.id ??
    maybeExam?._id ??
    null;

  const normalizeExam = (maybeExam) => {
    if (!maybeExam || typeof maybeExam !== "object") {
      return { quizTitle: "Main-page", quizID: null };
    }

    const quizID = getExamId(maybeExam);
    const quizTitle =
      maybeExam?.quizTitle ??
      maybeExam?.title ??
      maybeExam?.name ??
      maybeExam?.quizName ??
      "";

    return {
      ...maybeExam,
      quizID: quizID == null ? null : quizID,
      quizTitle: String(quizTitle || "").trim() || "Untitled exam",
    };
  };

  const setExam = useCallback((next) => {
    _setExam((prev) => {
      const computed = typeof next === "function" ? next(prev) : next;
      return normalizeExam(computed);
    });
  }, []);

  const getExamStorageKey = (userIdValue, examIdValue) =>
    `quizai:examState:${String(userIdValue || "anon")}:${String(examIdValue)}`;

  const getUserIdCandidates = () => {
    const ids = [user?.id, user?.userId, user?._id, user?.uid, "anon"]
      .map((v) => (v == null ? null : String(v)))
      .filter((v) => v && v.trim());
    return Array.from(new Set(ids));
  };

  const pushFeedback = useCallback((type, message) => {
    const msg = String(message ?? "").trim();
    if (!msg) return;
    setFeedback({
      type: type === "success" ? "success" : "error",
      message: msg,
      ts: Date.now(),
    });
  }, []);

  const clearFeedback = useCallback(() => {
    setFeedback(null);
  }, []);

  // Load exams when user changes
  useEffect(() => {
    if (user) {
      loadExams();
      return;
    }

    // User logged out: clear any in-memory quiz state.
    setExam({ quizTitle: "Main-page", quizID: null });
    setExams([]);
    setError(null);
    setFeedback(null);
  }, [user]);

  const getExamData = async (quizID, token) => {
    const targetId = String(quizID ?? "").trim();
    if (!targetId) {
      setError("Missing exam id.");
      return false;
    }

    // 1) Try to use hydrated data from the exams list (if already fetched before)
    const cached = exams.find(
      (e) => String(getExamId(e) ?? "") === String(targetId)
    );

    // Consider it "valid data" when it includes a questions array
    if (cached && Array.isArray(cached.questions)) {
      setError(null);
      setExam(cached);
      return true;
    }

    // 2) Otherwise fetch, then hydrate the matching exams[] element
    try {
      setError(null);
      const data = await getQuizInfo(token, targetId);
      const normalized = normalizeExam(data);
      setExam(normalized);

      // Update the exams list entry as well
      setExams((prev) => {
        const idx = prev.findIndex(
          (e) => String(getExamId(e) ?? "") === String(targetId)
        );
        if (idx === -1) return prev; // expected to exist already; keep minimal

        const copy = prev.slice();
        copy[idx] = normalizeExam({ ...copy[idx], ...normalized });
        return copy;
      });

      return true;
    } catch (error) {
      setError(error);
      return false;
    }
  };
  // Fetch exams from API
  const loadExams = async () => {
    setLoading(true);
    const minLoadingMs = Number(import.meta.env.VITE_MIN_LOADING_MS) || 0;
    await new Promise((resolve) => setTimeout(resolve, minLoadingMs));
    try {
      const data = await fetchUserExams(user.id, token);
      const list =
        (Array.isArray(data?.quizzesInfo) && data.quizzesInfo) ||
        (Array.isArray(data?.quizzes) && data.quizzes) ||
        [];
      const normalizedList = list.map(normalizeExam);
      setExams(normalizedList);

      // If a shared exam was just saved into the user's exams, we redirect to '/'
      // and set this flag so the main page auto-selects the newest/last exam.
      try {
        const flag = sessionStorage.getItem("quizai:selectLastExamOnLoad");
        if (flag && normalizedList.length) {
          sessionStorage.removeItem("quizai:selectLastExamOnLoad");
          setExam(normalizedList[normalizedList.length - 1]);
        }
      } catch {
        // ignore storage errors
      }
      return data;
    } catch (error) {
      setError(error);
    } finally {
      // This runs whether it succeeded OR failed
      setLoading(false);
    }
  };

  // Update a single exam
  const updateExam = (quizID, updatedData) => {
    const targetId = String(quizID);
    setExams((prev) =>
      prev.map((exam) =>
        String(getExamId(exam)) === targetId
          ? normalizeExam({ ...exam, ...updatedData })
          : exam
      )
    );
  };

  // Delete an exam
  const deleteExam = async (quizID) => {
    const targetId = String(quizID);
    const existed = exams.some(
      (examItem) => String(getExamId(examItem)) === targetId
    );

    if (!existed) {
      const msg = "Exam not found";
      console.error("deleteExam:", msg);
      pushFeedback("error", msg);
      return { error: msg };
    }

    const result = await deleteQuizService(targetId, token);
    if (result?.error) {
      console.error("deleteExam failed:", result.error);
      pushFeedback("error", result.error);
      return { error: result.error };
    }

    // Remove any locally persisted attempt/submission state for this exam.
    // (Stored by Quiz_main_page under quizai:examState:<userId>:<examId>)
    try {
      for (const userIdValue of getUserIdCandidates()) {
        localStorage.removeItem(getExamStorageKey(userIdValue, targetId));
      }
    } catch {
      // ignore storage errors
    }

    // Only update local state AFTER backend confirms.
    setExams((prev) =>
      prev.filter((examItem) => String(getExamId(examItem)) !== targetId)
    );

    setExam((prev) => {
      const prevId = String(getExamId(prev));
      if (prevId !== targetId) return prev;
      return { quizTitle: "Main-page", quizID: null };
    });

    pushFeedback("success", result?.message || "Quiz deleted successfully.");

    return result;
  };

  // Add a new exam
  const addExam = (newExam) => {
    setExams((prev) => [normalizeExam(newExam), ...prev]);
  };

  const loadSharedExam = useCallback(
    async (sharedId) => {
      const uuid = String(sharedId ?? "").trim();
      if (!uuid) {
        setError("Missing shared quiz id.");
        return { error: "Missing shared quiz id." };
      }
      const userId = user?.id ?? user?.userId ?? user?._id ?? user?.uid ?? null;
      if (!userId) {
        setError("Missing user id.");
        return { error: "Missing user id." };
      }

      setError(null);
      try {
        const result = await fetchSharedExam(uuid, token, userId);
        if (result?.error) {
          setError(result.error);
          return { error: result.error };
        }

        // New backend behavior: success response with no quiz payload,
        // because the shared exam is persisted into the user's exams list.
        if (result?.saved === true) {
          pushFeedback(
            "success",
            result?.message || "Shared quiz saved successfully."
          );
          return { success: true, saved: true };
        }

        /* const sharedQuiz = result && typeof result === "object" ? result : null;
        if (!sharedQuiz) {
          const msg = "Unexpected server response.";
          setError(msg);
          return { error: msg };
        }

        const normalizedSharedQuiz = normalizeExam(sharedQuiz);

        setExam(normalizedSharedQuiz);

        const sharedExamId = getExamId(normalizedSharedQuiz);
        if (sharedExamId != null) {
          setExams((prev) => {
            const exists = prev.some(
              (item) => String(getExamId(item)) === String(sharedExamId)
            );
            if (exists) return prev;
            return [normalizedSharedQuiz, ...prev];
          });
        }

        return { success: true, quiz: normalizedSharedQuiz }; */
      } catch (err) {
        const msg = err?.message || "Failed to load shared quiz.";
        setError(msg);
        return { error: msg };
      }
    },
    [token, user, pushFeedback]
  );
  const getQuestionCounts = useCallback((exam) => {
    let mcqCount = 0;
    let tfCount = 0;

    // Safely get questions array, default to empty if missing
    const questions = exam?.questions || [];

    questions.forEach((q) => {
      // get number of choices, default to 0 if missing
      const len = q?.choices?.length || 0;

      if (len > 2) {
        mcqCount++;
      } else if (len === 2) {
        tfCount++;
      }
    });

    return { mcqCount, tfCount };
  }, []);
  const regenerateWholeExam = useCallback(
    async (quizID) => {
      const targetId = String(quizID ?? "").trim();
      if (!targetId) {
        pushFeedback("error", "Missing exam id.");
        return { error: "Missing exam id." };
      }

      setRegeneratingQuiz(true);

      const { mcqCount, tfCount } = getQuestionCounts(exam);

      try {
        const result = await regenerateQuiz(targetId, token, {
          tfCount,
          mcqCount,
        });
        if (result?.error) {
          pushFeedback("error", result.error);
          return { error: result.error };
        }

        const nextExamRaw =
          result && typeof result === "object" ? result : null;
        const nextExam = nextExamRaw ? normalizeExam(nextExamRaw) : null;
        if (!nextExam) {
          const msg = "Unexpected server response.";
          pushFeedback("error", msg);
          return { error: msg };
        }

        // Clear any locally persisted attempt/submission state for the old exam.
        try {
          for (const userIdValue of getUserIdCandidates()) {
            localStorage.removeItem(getExamStorageKey(userIdValue, targetId));
          }
        } catch {
          // ignore storage errors
        }

        const nextExamId = String(getExamId(nextExam) ?? targetId);

        setExams((prev) => {
          const target = String(targetId);

          if (nextExamId === target) {
            return prev.map((item) =>
              String(getExamId(item)) === target ? nextExam : item
            );
          }

          // If backend generates a new exam id, replace old exam with the new one.
          const idx = prev.findIndex(
            (item) => String(getExamId(item)) === target
          );
          if (idx === -1) return [nextExam, ...prev];

          const copy = prev.slice();
          copy.splice(idx, 1, nextExam);
          return copy;
        });

        setExam((prev) => {
          const prevId = String(getExamId(prev) ?? "");
          if (prevId !== String(targetId)) return prev;
          return nextExam;
        });

        // Signal Quiz_main_page to reset its local UI state even when examId stays the same.
        setExamResetNonce((n) => n + 1);

        pushFeedback("success", "Quiz regenerated successfully.");

        return { success: true, quiz: nextExam };
      } catch (err) {
        const msg = err?.message || "Failed to regenerate quiz.";
        pushFeedback("error", msg);
        return { error: msg };
      } finally {
        setRegeneratingQuiz(false);
      }
    },
    [token, pushFeedback, exam, getQuestionCounts]
  );

  // rename exam
  const renameExam = async (quizID, quizTitle) => {
    const targetId = String(quizID);
    let nextTitle = String(quizTitle ?? "").trim();
    if (nextTitle.length > MAX_EXAM_TITLE_LENGTH) {
      nextTitle = nextTitle.slice(0, MAX_EXAM_TITLE_LENGTH).trimEnd();
    }

    if (!nextTitle) {
      console.error("renameExam: blocked empty title");
      pushFeedback("error", "Title cannot be empty.");
      return { error: "Title cannot be empty." };
    }

    const result = await renameQuiz(targetId, nextTitle, token);
    if (result?.error) {
      console.error("renameExam failed:", result.error);
      pushFeedback("error", result.error);
      return { error: result.error };
    }

    // Only update local state AFTER backend confirms.
    setExams((prev) =>
      prev.map((examItem) =>
        String(getExamId(examItem)) === targetId
          ? { ...examItem, quizTitle: nextTitle }
          : examItem
      )
    );

    setExam((prev) => {
      const prevId = String(getExamId(prev));
      if (prevId !== targetId) return prev;
      return { ...prev, quizTitle: nextTitle };
    });

    pushFeedback("success", result?.message || "Quiz renamed successfully.");

    return result;
  };

  const getQuestionId = (maybeQuestion) =>
    maybeQuestion?.id ??
    maybeQuestion?.questionId ??
    maybeQuestion?.questionID ??
    null;

  const regenerateExamQuestion = async (
    examId,
    questionId,
    questionPayload
  ) => {
    const targetExamId = String(examId ?? "").trim();
    const targetQuestionId = String(questionId ?? "").trim();

    if (!targetExamId) {
      pushFeedback("error", "Missing exam id.");
      return { error: "Missing exam id." };
    }
    if (!targetQuestionId) {
      pushFeedback("error", "Missing question id.");
      return { error: "Missing question id." };
    }

    const currentExamId = String(getExamId(exam) ?? "");
    if (!currentExamId || currentExamId !== targetExamId) {
      pushFeedback("error", "Exam not loaded.");
      return { error: "Exam not loaded." };
    }

    const prevQuestions = Array.isArray(exam?.questions) ? exam.questions : [];
    const existed = prevQuestions.some(
      (q) => String(getQuestionId(q)) === targetQuestionId
    );
    if (!existed) {
      pushFeedback("error", "Question not found.");
      return { error: "Question not found." };
    }

    const Type = questionPayload?.choices.length == 2 ? "tf" : "mcq";

    const result = await regenerateQuestion(
      targetExamId,
      targetQuestionId,
      Type,
      token
    );

    if (result?.error) {
      pushFeedback("error", result.error);
      return { error: result.error };
    }

    const nextQuestion =
      result?.question && typeof result.question === "object"
        ? result.question
        : result;

    if (!nextQuestion || typeof nextQuestion !== "object") {
      pushFeedback("error", "Unexpected server response.");
      return { error: "Unexpected server response." };
    }

    setExam((prev) => {
      const prevExamId = String(getExamId(prev) ?? "");
      if (prevExamId !== targetExamId) return prev;

      const prevQs = Array.isArray(prev?.questions) ? prev.questions : [];
      const updatedQuestions = prevQs.map((q) => {
        const qId = String(getQuestionId(q));
        if (qId !== targetQuestionId) return q;

        const merged = { ...q, ...nextQuestion };
        if (merged.id == null && q?.id != null) merged.id = q.id;
        if (merged.questionId == null && q?.questionId != null)
          merged.questionId = q.questionId;
        if (merged.id == null && merged.questionId == null) {
          merged.id = getQuestionId(q) ?? targetQuestionId;
        }
        return { ...merged };
      });

      return { ...prev, questions: updatedQuestions };
    });

    // Keep the quizzes list in sync as well (important if user re-selects quiz).
    setExams((prev) =>
      prev.map((examItem) => {
        const itemId = String(getExamId(examItem) ?? "");
        if (itemId !== targetExamId) return examItem;

        const itemQs = Array.isArray(examItem?.questions)
          ? examItem.questions
          : null;
        if (!itemQs) return examItem;

        const updatedQuestions = itemQs.map((q) => {
          const qId = String(getQuestionId(q));
          if (qId !== targetQuestionId) return q;

          const merged = { ...q, ...nextQuestion };
          if (merged.id == null && q?.id != null) merged.id = q.id;
          if (merged.questionId == null && q?.questionId != null)
            merged.questionId = q.questionId;
          if (merged.id == null && merged.questionId == null) {
            merged.id = getQuestionId(q) ?? targetQuestionId;
          }
          return { ...merged };
        });

        return { ...examItem, questions: updatedQuestions };
      })
    );

    pushFeedback("success", "Question regenerated successfully.");
    return { success: true, question: nextQuestion };
  };

  const deleteExamQuestion = async (examId, questionId) => {
    const targetExamId = String(examId ?? "").trim();
    const targetQuestionId = String(questionId ?? "").trim();

    if (!targetExamId) {
      pushFeedback("error", "Missing exam id.");
      return { error: "Missing exam id." };
    }
    if (!targetQuestionId) {
      pushFeedback("error", "Missing question id.");
      return { error: "Missing question id." };
    }

    const currentExamId = String(getExamId(exam) ?? "");
    if (!currentExamId || currentExamId !== targetExamId) {
      pushFeedback("error", "Exam not loaded.");
      return { error: "Exam not loaded." };
    }

    const prevQuestions = Array.isArray(exam?.questions) ? exam.questions : [];
    const existed = prevQuestions.some(
      (q) => String(getQuestionId(q)) === targetQuestionId
    );
    if (!existed) {
      pushFeedback("error", "Question not found.");
      return { error: "Question not found." };
    }

    const result = await deleteQuestion(targetExamId, targetQuestionId, token);
    if (result?.error) {
      pushFeedback("error", result.error);
      return { error: result.error };
    }

    setExam((prev) => {
      const prevExamId = String(getExamId(prev) ?? "");
      if (prevExamId !== targetExamId) return prev;

      const prevQs = Array.isArray(prev?.questions) ? prev.questions : [];
      const updatedQuestions = prevQs.filter(
        (q) => String(getQuestionId(q)) !== targetQuestionId
      );

      return { ...prev, questions: updatedQuestions };
    });

    pushFeedback(
      "success",
      result?.message || "Question deleted successfully."
    );
    return { success: true, ...result };
  };

  const submitExamAnswersToBackend = useCallback(
    (submissionPayload) => {
      const examIdValue = String(submissionPayload?.examId ?? "").trim();
      if (!examIdValue) {
        pushFeedback("error", "Missing exam id.");
        return;
      }

      const normalizedAnswers = Array.isArray(submissionPayload?.answers)
        ? submissionPayload.answers
            .map((a) => {
              const questionId = String(a?.questionId ?? "").trim();
              const selectedOptionId = String(a?.selectedOptionId ?? "").trim();
              if (!questionId || !selectedOptionId) return null;
              return { questionId, selectedOptionId };
            })
            .filter(Boolean)
        : [];

      const normalizedPayload = {
        examId: examIdValue,
        answers: normalizedAnswers,
      };

      if (!token) {
        pushFeedback("error", "Not logged in.");
        return;
      }

      // Fire-and-forget: keep the normal submit flow on the UI.
      void (async () => {
        const result = await submitExamAnswers(normalizedPayload, token);
        if (result?.error) {
          pushFeedback("error", result.error);
          return;
        }
        // Optional: only show success if backend explicitly returns it.
        if (result?.success === true || result?.ok === true) {
          pushFeedback("success", "Exam submitted successfully.");
        }
      })();
    },
    [token, pushFeedback]
  );

  return (
    <ExamsContext.Provider
      value={{
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
        loadSharedExam,
        updateExam,
        deleteExam,
        addExam,
        renameExam,
        regenerateWholeExam,
        regenerateExamQuestion,
        deleteExamQuestion,
        submitExamAnswers: submitExamAnswersToBackend,
        error,
      }}
    >
      {children}
    </ExamsContext.Provider>
  );
}

export function useExams() {
  return useContext(ExamsContext);
}
