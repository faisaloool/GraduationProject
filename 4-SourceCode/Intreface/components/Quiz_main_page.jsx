import React from "react";
import "../style/Quiz_main_page.css";
import { Input } from "./Input";
import { Header } from "./Header";

export const Quiz_main_page = ({ exames }) => {
  const getExamResponse = (exames) => {
    if (!exames || exames.length === 0) {
      return (
        <div className="exam-response">
          <h1 className="wellcome">Wellcome to Quiz AI</h1>
          <p>Get ready for the endless lernning!</p>
          <div className="input">
            <Input />
          </div>
        </div>
      );
    }

    return exames.map(({ id, question, options, type }) => {
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
          <div className="exam-space">{getExamResponse(exames)}</div>
        </main>
      </div>
    </>
  );
};
