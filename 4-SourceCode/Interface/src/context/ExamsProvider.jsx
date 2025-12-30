import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  use,
} from "react";
import { fetchUserExams, renameQuiz } from "../util/service.js";
import { useAuth } from "./AuthContext.jsx";

const ExamsContext = createContext();

export function ExamsProvider({ children }) {
  const { user, token } = useAuth();
  const [exam, setExam] = useState({ title: "Main-page", examId: null });
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getExamId = (maybeExam) =>
    maybeExam?.examId ?? maybeExam?.quizId ?? maybeExam?.id ?? null;

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
  const deleteExam = (examId) => {
    const targetId = String(examId);
    const existed = exams.some((exam) => String(getExamId(exam)) === targetId);

    setExams((prev) =>
      prev.filter((exam) => String(getExamId(exam)) !== targetId)
    );

    return existed
      ? Promise.resolve()
      : Promise.reject(new Error("Exam not found"));
  };

  // Add a new exam
  const addExam = (newExam) => {
    setExams((prev) => [newExam, ...prev]);
  };

  // rename exam
  const renameExam = async (examId, newTitle) => {
    const targetId = String(examId);
    const nextTitle = String(newTitle ?? "").trim();

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
