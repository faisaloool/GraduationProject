import React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { Quiz_card } from "./Quiz_card";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchUserExams } from "../util/service.js";

import { BsReverseLayoutSidebarReverse } from "react-icons/bs";
import { IoCreateOutline } from "react-icons/io5";
import { IoSearch } from "react-icons/io5";
import { IoLibraryOutline } from "react-icons/io5";
import "../style/Side_bar.css";

export const Side_bar = ({ setExam, exam }) => {
  const [collaps, setCollaps] = React.useState(false);
  const { user, isLoggedIn, logout, token } = useAuth();
  const [exams, setExams] = useState([]);
  const navigate = useNavigate();

  /* const mockUserExams = [
    {
      examId: 1,
      title: "General Knowledge Test",
      totalMarks: 10,
      questions: [
        {
          id: 1,
          question: "What is the capital of Jordan?",
          options: ["Amman", "Madin", "Egypt", "Mu'tah"],
          type: "mcq",
          marks: 2,
        },
        {
          id: 2,
          question: "Which language is used for web styling?",
          options: ["HTML", "CSS", "Python", "C++"],
          type: "mcq",
          marks: 3,
        },
      ],
    },
    {
      examId: 2,
      title: "Programming Basics",
      totalMarks: 12,
      questions: [
        {
          id: 1,
          question: "Who developed JavaScript?",
          options: [
            "Brendan Eich",
            "Tim Berners-Lee",
            "Guido van Rossum",
            "James Gosling",
          ],
          type: "mcq",
          marks: 2,
        },
        {
          id: 2,
          question: "What does HTTP stand for?",
          options: [
            "HyperText Transfer Protocol",
            "HighText Transmission Process",
            "Hyper Transfer Text Protocol",
            "None",
          ],
          type: "mcq",
          marks: 2,
        },
        {
          id: 3,
          question: "What is 5 + 7?",
          options: ["10", "11", "12", "13"],
          type: "mcq",
          marks: 1,
        },
      ],
    },
  ]; */

  useEffect(() => {
    if (user) {
      const loadExams = async () => {
        const data = await fetchUserExams(user.id, token);
        setExams(data);
      };
      loadExams();
    }
  }, [user]);

  /* useEffect(() => {
    if (user) {
      // Directly set mock data
      setExams(mockUserExams);
    }
  }, [user]); */

  return (
    <>
      {isLoggedIn && (
        <div
          className={`side-bar ${collaps ? "collapsed" : ""}`}
          onClick={() => {
            if (collaps) setCollaps(false);
          }}
        >
          <div className="top-of-side-bar">
            <div className="Logo">
              <img src="#" alt="Quiz AI logo" />
            </div>
            <div onClick={() => setCollaps(!collaps)}>
              {!collaps && (
                <div className="shrink shrink-icon">
                  <div>
                    <BsReverseLayoutSidebarReverse />
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="side-bar-body">
            <nav>
              <ul>
                <li
                  onClick={() => {
                    setExam({ questions: [] });
                    navigate("/");
                  }}
                >
                  <div className="Item">
                    <IoCreateOutline className="side-bar-icons" />
                    {!collaps && <a>New Quiz</a>}
                  </div>
                </li>
                <li>
                  <div className="Item">
                    <IoSearch className="side-bar-icons" />
                    {!collaps && <a>Search</a>}
                  </div>
                </li>
                <li>
                  <div
                    className="Item"
                    onClick={() => {
                      navigate("/library");
                    }}
                  >
                    <IoLibraryOutline className="side-bar-icons" />
                    {!collaps && <a>Library</a>}
                  </div>
                </li>
              </ul>
            </nav>
            {!collaps && (
              <div className="Quizzes">
                <details>
                  <summary>Quizzes</summary>
                  <div className="quizzes-list">
                    {exams.map((e) => (
                      <Quiz_card
                        key={e.examId}
                        e={e}
                        setExam={setExam}
                        exam={exam}
                      />
                    ))}
                  </div>
                </details>
              </div>
            )}
          </div>
          <div className="Account">
            <img src="#"></img>
            {!collaps && <h2>{user.name}</h2>}
          </div>
        </div>
      )}
    </>
  );
};
