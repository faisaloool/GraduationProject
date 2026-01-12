import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Side_bar } from "./components/Side_bar";
import { Quiz_main_page } from "./components/Quiz_main_page";
import { Error_page } from "./components/Error_page";
import { ResetPasswordPage } from "./components/ResetPasswordPage.jsx";
import Authform from "./components/Authform.jsx";
import { Library } from "./components/Library.jsx";
import "./style/App.css";
import { VerifyAccount } from "./components/Verifyaccount.jsx";
import { Shared_exam_route } from "./components/Shared_exam_route.jsx";
function App() {
  const [editing, setEditing] = useState(-999);
  const [isLogin, setIsLogin] = useState(false);
  return (
    <Router>
      <Routes>
        <Route
          path="/Log-in"
          element={<Authform isLogin={isLogin} setIsLogin={setIsLogin} />}
        />
        <Route
          path="/Sign-up"
          element={<Authform isLogin={isLogin} setIsLogin={setIsLogin} />}
        />
        <Route path="/verifyaccount" element={<VerifyAccount />} />
        <Route
          path="/"
          element={
            <main className="layout">
              <Side_bar editing={editing} setEditing={setEditing} />
              <Quiz_main_page editing={editing} setEditing={setEditing} />
            </main>
          }
        />
        <Route
          path="/exam/:id"
          element={
            <main className="layout">
              <Side_bar editing={editing} setEditing={setEditing} />
              <Quiz_main_page editing={editing} setEditing={setEditing} />
            </main>
          }
        />
        <Route
          path="/shared/:id"
          element={
            <Shared_exam_route editing={editing} setEditing={setEditing} />
          }
        />
        <Route path="/error" element={<Error_page />} />
        <Route path="/change-password/:token" element={<ResetPasswordPage />} />
        <Route path="/change-password" element={<ResetPasswordPage />} />
      </Routes>
    </Router>
  );
}

export default App;
