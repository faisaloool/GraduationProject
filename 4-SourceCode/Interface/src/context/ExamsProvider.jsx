import React, { createContext, useContext, useState, useEffect } from "react";
import { fetchUserExams } from "../util/service.js";
import { useAuth } from "./AuthContext.jsx";

const ExamsContext = createContext();

export function ExamsProvider({ children }) {
  const { user, token } = useAuth();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load exams when user changes
  useEffect(() => {
    if (user) {
      loadExams();
    }
  }, [user]);

  // Fetch exams from API
  const loadExams = async () => {
    setLoading(true);
    try {
      const data = await fetchUserExams(user.id, token);
      setExams(data.quizzes || []);
    } catch (error) {
      console.error("Error loading exams:", error);
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

  return (
    <ExamsContext.Provider
      value={{ exams, loading, loadExams, updateExam, deleteExam, addExam }}
    >
      {children}
    </ExamsContext.Provider>
  );
}

export function useExams() {
  return useContext(ExamsContext);
}
