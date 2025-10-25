import React from "react";
import { Quiz_card } from "./Quiz_card";
import { BsReverseLayoutSidebarReverse } from "react-icons/bs";
import { IoCreateOutline } from "react-icons/io5";
import { IoSearch } from "react-icons/io5";
import { IoLibraryOutline } from "react-icons/io5";
import "../style/Side_bar.css";

export const Side_bar = () => {
  const [collaps, setCollaps] = React.useState(false);

  return (
    <>
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
              <li>
                <div className="Item">
                  <IoCreateOutline className="side-bar-icons" />
                  {!collaps && <a href="#">New Quiz</a>}
                </div>
              </li>
              <li>
                <div className="Item">
                  <IoSearch className="side-bar-icons" />
                  {!collaps && <a href="#">Search</a>}
                </div>
              </li>
              <li>
                <div className="Item">
                  <IoLibraryOutline className="side-bar-icons" />
                  {!collaps && <a href="#">Library</a>}
                </div>
              </li>
            </ul>
          </nav>
          {!collaps && (
            <div className="Quizzes">
              <details>
                <summary>Quizzes</summary>
                <div className="quizzes-list">
                  <Quiz_card />
                  <Quiz_card />
                  <Quiz_card />
                  <Quiz_card />
                  <Quiz_card />
                  <Quiz_card />
                  <Quiz_card />
                  <Quiz_card />
                  <Quiz_card />
                  <Quiz_card />
                  <Quiz_card />
                  <Quiz_card />
                  <Quiz_card />
                  <Quiz_card />
                  <Quiz_card />
                  <Quiz_card />
                </div>
              </details>
            </div>
          )}
        </div>
        <div className="Account">
          <img src="#"></img>
          {!collaps && <h2>name</h2>}
        </div>
      </div>
    </>
  );
};
