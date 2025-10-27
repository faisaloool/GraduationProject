import { use, useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Side_bar } from "./components/Side_bar";
import { Quiz_main_page } from "./components/Quiz_main_page";
import Authform from "./components/Authform.jsx";
import { Library } from "./components/Library.jsx";
import "./style/App.css";
function App() {
  const [exam, setExam] = useState([]);
  /* useEffect(() => {
    exames.push({
      id: 1,
      question: "What is the capital of Jordan?",
      options: ["Amman", "Madin", "Egypt", "Mu'tah"],
      type: "mcq",
      marks: 2,
    });
    exames.push({
      id: 2,
      question: "Is the capital of Jordan Amman?",
      options: ["True", "False"],
      type: "true-false",
      marks: 1,
    });
  }, []); */
  return (
    <Router>
      <Routes>
        <Route path="/Log-in" element={<Authform login={true} />} />
        <Route path="/Sign-up" element={<Authform login={false} />} />
        <Route path="/library" element={<Library />} />
        <Route
          path="/"
          element={
            <main className="layout">
              <Side_bar setExam={setExam} exam={exam} />
              <Quiz_main_page exam={exam} />
            </main>
          }
        />
        <Route
          path="/exam/:id"
          element={
            <main className="layout">
              <Side_bar setExam={setExam} exam={exam} />
              <Quiz_main_page exam={exam} />
            </main>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
