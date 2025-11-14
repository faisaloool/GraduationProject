import { use, useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Side_bar } from "./components/Side_bar";
import { Quiz_main_page } from "./components/Quiz_main_page";
import Authform from "./components/Authform.jsx";
import { Library } from "./components/Library.jsx";
import "./style/App.css";
function App() {
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
              <Side_bar />
              <Quiz_main_page />
            </main>
          }
        />
        <Route
          path="/exam/:id"
          element={
            <main className="layout">
              <Side_bar />
              <Quiz_main_page />
            </main>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
