import React, { createContext, useContext, useState, useEffect } from "react";

// Create the context
const AuthContext = createContext();

// Create a provider component
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage and sessionStorage
    const savedToken =
      localStorage.getItem("token") || sessionStorage.getItem("token");
    const savedUser =
      JSON.parse(localStorage.getItem("user")) ||
      JSON.parse(sessionStorage.getItem("user"));

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(savedUser);
    }

    setLoading(false);
  }, []);

  // Login function
  const login = (userData, tokenData, remember = false) => {
    setUser(userData);
    setToken(tokenData);

    // Save in localStorage or sessionStorage depending on "remember me"
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem("user", JSON.stringify(userData));
    storage.setItem("token", tokenData);
  };
  // Logout function
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoggedIn: !!token,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth easily
export function useAuth() {
  return useContext(AuthContext);
}
