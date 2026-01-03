import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  use,
} from "react";
import {
  fetchUserExams,
  renameQuiz,
  deleteQuiz,
  regenerateQuestion,
  deleteQuestion,
} from "../util/service.js";
import { useAuth } from "./AuthContext.jsx";

const ExamsContext = createContext();

export function ExamsProvider({ children }) {
  const { user, token } = useAuth();
  const [exam, setExam] = useState({ title: "Main-page", examId: null });
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const MAX_EXAM_TITLE_LENGTH = 40;

  const getExamId = (maybeExam) =>
    maybeExam?.examId ?? maybeExam?.quizId ?? maybeExam?.id ?? null;

  const getExamStorageKey = (userIdValue, examIdValue) =>
    `quizai:examState:${String(userIdValue || "anon")}:${String(examIdValue)}`;

  const getUserIdCandidates = () => {
    const ids = [
      user?.id,
      user?.userId,
      user?._id,
      user?.uid,
      "anon",
    ]
      .map((v) => (v == null ? null : String(v)))
      .filter((v) => v && v.trim());
    return Array.from(new Set(ids));
  };

  // Load exams when user changes
  useEffect(() => {
    if (user) {
      loadExams();
    }
  }, [user]);

  // Fetch exams from API
  const loadExams = async () => {
    setLoading(true);
    const minLoadingMs = Number(import.meta.env.VITE_MIN_LOADING_MS) || 0;
    await new Promise((resolve) => setTimeout(resolve, minLoadingMs));
    try {
      const data = await fetchUserExams(user.id, token);
      setExams(data.quizzes || []);
      return data;
    } catch (error) {
      setError(error);
    } finally {
      // This runs whether it succeeded OR failed
      setLoading(false);
    }
  };

  // Update a single exam
  const updateExam = (examId, updatedData) => {
    const targetId = String(examId);
    setExams((prev) =>
      prev.map((exam) =>
        String(getExamId(exam)) === targetId
          ? { ...exam, ...updatedData }
          : exam
      )
    );
  };

  // Delete an exam
  const deleteExam = async (examId) => {
    const targetId = String(examId);
    const existed = exams.some(
      (examItem) => String(getExamId(examItem)) === targetId
    );

    if (!existed) {
      const msg = "Exam not found";
      console.error("deleteExam:", msg);
      return { error: msg };
    }

    const result = await deleteQuiz(targetId, token);
    if (result?.error) {
      console.error("deleteExam failed:", result.error);
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
      return { title: "Main-page", examId: null };
    });

    return result;
  };

  // Add a new exam
  const addExam = (newExam) => {
    setExams((prev) => [newExam, ...prev]);
  };

  // rename exam
  const renameExam = async (examId, newTitle) => {
    const targetId = String(examId);
    let nextTitle = String(newTitle ?? "").trim();
    if (nextTitle.length > MAX_EXAM_TITLE_LENGTH) {
      nextTitle = nextTitle.slice(0, MAX_EXAM_TITLE_LENGTH).trimEnd();
    }

    if (!nextTitle) {
      console.error("renameExam: blocked empty title");
      return { error: "Title cannot be empty." };
    }

    const result = await renameQuiz(targetId, nextTitle, token);
    if (result?.error) {
      console.error("renameExam failed:", result.error);
      return { error: result.error };
    }

    // Only update local state AFTER backend confirms.
    setExams((prev) =>
      prev.map((examItem) =>
        String(getExamId(examItem)) === targetId
          ? { ...examItem, title: nextTitle }
          : examItem
      )
    );

    setExam((prev) => {
      const prevId = String(getExamId(prev));
      if (prevId !== targetId) return prev;
      return { ...prev, title: nextTitle };
    });

    return result;
  };

  const getQuestionId = (maybeQuestion) =>
    maybeQuestion?.id ??
    maybeQuestion?.questionId ??
    maybeQuestion?._id ??
    null;

  const regenerateExamQuestion = async (
    examId,
    questionId,
    questionPayload
  ) => {
    const targetExamId = String(examId ?? "").trim();
    const targetQuestionId = String(questionId ?? "").trim();

    if (!targetExamId) return { error: "Missing exam id." };
    if (!targetQuestionId) return { error: "Missing question id." };

    const currentExamId = String(getExamId(exam) ?? "");
    if (!currentExamId || currentExamId !== targetExamId) {
      return { error: "Exam not loaded." };
    }

    const prevQuestions = Array.isArray(exam?.questions) ? exam.questions : [];
    const existed = prevQuestions.some(
      (q) => String(getQuestionId(q)) === targetQuestionId
    );
    if (!existed) return { error: "Question not found." };

    const result = await regenerateQuestion(
      targetExamId,
      targetQuestionId,
      questionPayload,
      token
    );

    if (result?.error) return { error: result.error };

    const nextQuestion =
      result?.question && typeof result.question === "object"
        ? result.question
        : result;

    if (!nextQuestion || typeof nextQuestion !== "object") {
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

    return { success: true, question: nextQuestion };
  };

  const deleteExamQuestion = async (examId, questionId) => {
    const targetExamId = String(examId ?? "").trim();
    const targetQuestionId = String(questionId ?? "").trim();

    if (!targetExamId) return { error: "Missing exam id." };
    if (!targetQuestionId) return { error: "Missing question id." };

    const currentExamId = String(getExamId(exam) ?? "");
    if (!currentExamId || currentExamId !== targetExamId) {
      return { error: "Exam not loaded." };
    }

    const prevQuestions = Array.isArray(exam?.questions) ? exam.questions : [];
    const existed = prevQuestions.some(
      (q) => String(getQuestionId(q)) === targetQuestionId
    );
    if (!existed) return { error: "Question not found." };

    const result = await deleteQuestion(targetExamId, targetQuestionId, token);
    if (result?.error) return { error: result.error };

    setExam((prev) => {
      const prevExamId = String(getExamId(prev) ?? "");
      if (prevExamId !== targetExamId) return prev;

      const prevQs = Array.isArray(prev?.questions) ? prev.questions : [];
      const updatedQuestions = prevQs.filter(
        (q) => String(getQuestionId(q)) !== targetQuestionId
      );

      return { ...prev, questions: updatedQuestions };
    });

    return { success: true, ...result };
  };

  return (
    <ExamsContext.Provider
      value={{
        exam,
        setExam,
        exams,
        loading,
        loadExams,
        updateExam,
        deleteExam,
        addExam,
        renameExam,
        regenerateExamQuestion,
        deleteExamQuestion,
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
