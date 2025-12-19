import React, { createContext, useContext, useState, useEffect } from "react";
import { verifyCode } from "../util/service.js";

// Create the context
const AuthContext = createContext();

// Create a provider component
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const BOOT_DELAY = Number(import.meta.env.VITE_MIN_LOADING_MS); /* || 0 */
    let timeoutId;

    const boot = () => {
      try {
        const savedToken =
          localStorage.getItem("token") || sessionStorage.getItem("token");

        const savedUserStr =
          localStorage.getItem("user") || sessionStorage.getItem("user");

        let savedUser = null;
        if (savedUserStr) {
          try {
            savedUser = JSON.parse(savedUserStr);
          } catch (parseErr) {
            console.error(
              "AuthContext: failed to parse saved user JSON",
              parseErr
            );
            savedUser = null;
          }
        }

        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(savedUser);
        }
      } catch (err) {
        setError(err);
      } finally {
        timeoutId = setTimeout(() => setLoading(false), BOOT_DELAY);
      }
    };

    boot();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
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

  const signup = (code) => {
    setLoading(true);
    setError(null);

    const verify = async () => {
      try {
        console.log("Verifying code:", code, "for user:", user);
        if (!user?.email) {
          throw new Error("Missing email for verification");
        }
        const response = await verifyCode(code, user.email);

        if (!response) {
          throw new Error("Verification failed");
        }

        // Prefer explicit flags if present.
        if (response?.success === true) return response;
        if (response?.success === false) {
          throw new Error(response?.message || "The code is wrong.");
        }

        // Fallback: treat presence of an error field as failure.
        if (response?.error) {
          throw new Error(
            response?.message || response.error || "The code is wrong."
          );
        }

        // If the backend doesn't send success/error, assume success.
        return response;
      } catch (err) {
        setUser(null);
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    };

    return verify();
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

  const changeName = () => {};
  const changePassword = () => {};

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        token,
        isLoggedIn: !!token,
        loading,
        login,
        logout,
        signup,
        error,
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
