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

  useEffect(() => {
    if (user) {
      const loadExams = async () => {
        const data = await fetchUserExams(user.id, token);
        setExams(data);
      };
      loadExams();
    }
  }, [user]);

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
