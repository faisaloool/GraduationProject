import React, { use } from "react";
import { useEffect } from "react";
import "../style/Quiz_main_page.css";
import { Input } from "./Input";
import { Header } from "./Header";

export const Quiz_main_page = (exames) => {
  useEffect(() => {
    getExamResponse(exames.exam.questions);
  }, [exames]);
  const getExamResponse = (questions) => {
    if (!questions || questions.length === 0) {
      return (
        <div className="exam-response">
          <h1 className="wellcome"><span className="wlc">Welcome to </span> <span className="quiz">Quiz AI</span> </h1>
          <p className="subtitle">Get ready for the endless lernning!</p>
          <div className="input">
            <Input />
          </div>
        </div>
      );
    }

    return exames.exam.questions.map(({ id, question, options, type }) => {
      switch (String(type).toLowerCase()) {
        case "mcq":
          return (
            <div className="exam-response" key={id}>
              <h1 className="QuestionTitle Question">{question}</h1>
              <div className="Option-list">
                {options?.map((option, index) => (
                  <p className="Option" key={index}>
                    {String.fromCharCode(97 + index)}. {option}
                  </p>
                ))}
              </div>
            </div>
          );

        case "true-false":
          return (
            <div className="exam-response" key={id}>
              <h1 className="QuestionTitle Question">{question}</h1>
              <div className="Option-list">
                {options?.map((option, index) => (
                  <p className="Option" key={index}>
                    {option}
                  </p>
                ))}
              </div>
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

  return (
    <>
      <div className="page">
        <div className="header">
          <Header />
        </div>
        <main>
          <div className="exam-space">
            {getExamResponse(exames.exam.questions)}
          </div>
        </main>
      </div>
    </>
  );
};
