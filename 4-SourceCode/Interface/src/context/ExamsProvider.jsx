import React, { createContext, useContext, useState, useEffect } from "react";
import { fetchUserExams } from "../util/service.js";
import { useAuth } from "./AuthContext.jsx";

const ExamsContext = createContext();

export function ExamsProvider({ children }) {
  const { user, token } = useAuth();
  const [exam, setExam] = useState({ title: "Main-page", examId: null });
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
    } catch (error) {
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  // Update a single exam
  const updateExam = (examId, updatedData) => {
    setExams((prev) =>
      prev.map((exam) =>
        exam.examId === examId ? { ...exam, ...updatedData } : exam
      )
    );
  };

  // Delete an exam
  const deleteExam = (examId) => {
    setExams((prev) => prev.filter((exam) => exam.examId !== examId));
  };

  // Add a new exam
  const addExam = (newExam) => {
    setExams((prev) => [newExam, ...prev]);
  };

  // rename exam
  const renameExam = (examId, newName) => {
    setExams((prev) =>
      prev.map((exam) =>
        exam.examId === examId ? { ...exam, name: newName } : exam
      )
    );
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
