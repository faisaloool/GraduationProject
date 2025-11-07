import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ExamsProvider } from "./context/ExamsProvider.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <ExamsProvider>
        <App />
      </ExamsProvider>
    </AuthProvider>
  </StrictMode>
);
