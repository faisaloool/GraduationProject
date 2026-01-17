import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { verifyCode } from "../util/service.js";
import Cookies from "js-cookie";

const TOKEN_COOKIE_KEY = "quizai:token";

// Create the context
const AuthContext = createContext();

// Create a provider component
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = Cookies.get(TOKEN_COOKIE_KEY);
    // Check both storages just in case
    const user = localStorage.getItem("user") || sessionStorage.getItem("user");

    // If we have a token but NO user data, something is wrong -> Logout forcefully
    if (token && !user) {
      Cookies.remove(TOKEN_COOKIE_KEY);
      setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const BOOT_DELAY = Number(import.meta.env.VITE_MIN_LOADING_MS); /* || 0 */
    let timeoutId;

    const boot = () => {
      try {
        const savedToken = Cookies.get(TOKEN_COOKIE_KEY);

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
        } else if (!savedToken && savedUser) {
          // Token cookie missing/expired: log out to clear stale persisted auth.
          logout({ clearAppData: false });
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

    // Save user in localStorage or sessionStorage depending on "remember me"
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem("user", JSON.stringify(userData));

    // Store token in a secure cookie (not in local/session storage)
    Cookies.set(TOKEN_COOKIE_KEY, tokenData, {
      path: "/",
      secure: true,
      sameSite: "strict",
      expires: remember ? 7 : undefined,
    });

    try {
      window.dispatchEvent(new Event("auth:changed"));
    } catch {
      // ignore
    }
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
  const logout = useCallback(({ clearAppData = true } = {}) => {
    const clearStorage = (storage) => {
      if (!storage) return;
      try {
        storage.removeItem("user");

        // Backward-compat cleanup (token used to be stored here)
        storage.removeItem("token");

        if (clearAppData) {
          // Remove any app-cached data (e.g., quiz attempt/submission state).
          // Stored keys include: quizai:examState:<userId>:<examId>
          const keysToRemove = [];
          for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            if (!key) continue;
            if (key.startsWith("quizai:")) keysToRemove.push(key);
          }
          keysToRemove.forEach((k) => storage.removeItem(k));
        }
      } catch {
        // ignore storage errors (private mode / quota / blocked)
      }
    };

    try {
      Cookies.remove(TOKEN_COOKIE_KEY, { path: "/" });
    } catch {
      // ignore cookie errors
    }

    clearStorage(localStorage);
    clearStorage(sessionStorage);
    setUser(null);
    setToken(null);

    try {
      window.dispatchEvent(new Event("auth:changed"));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const syncAuthFromCookie = () => {
      const cookieToken = Cookies.get(TOKEN_COOKIE_KEY);
      // Only enforce cookie presence when we actually have an auth token.
      // During signup/verify flows we may have a user but intentionally no token yet.
      if (!cookieToken && token) logout({ clearAppData: false });
    };

    // Check immediately + periodically.
    syncAuthFromCookie();
    const intervalId = setInterval(syncAuthFromCookie, 60_000);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") syncAuthFromCookie();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [token, logout]);

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
