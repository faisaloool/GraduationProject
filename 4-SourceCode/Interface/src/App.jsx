import { use, useEffect, useState } from "react";
import { Side_bar } from "./components/Side_bar";
import { Quiz_main_page } from "./components/Quiz_main_page";
import Authform from "./components/Authform";
import "./style/App.css";
function App() {
  const [exames, setExames] = useState([]);
  useEffect(() => {
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
  }, []);
  return (
    <>
      {/* <main className="layout">
        <Side_bar />
        <Quiz_main_page exames={exames} />
      </main> */}
      <Authform />
    </>
  );
}

export default App;
