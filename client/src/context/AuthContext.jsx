import { useEffect, useState } from "react";
import {
  clearSession,
  getStoredToken,
  getStoredUser,
  persistSession,
} from "../services/auth.service";
import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
} from "../api/auth.api";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getStoredToken());
  const [user, setUser] = useState(getStoredUser());
  const [loading, setLoading] = useState(Boolean(getStoredToken()));

  useEffect(() => {
    if (!token) {
      return;
    }

    getCurrentUser()
      .then((currentUser) => {
        setUser(currentUser);
        persistSession({ token, user: currentUser });
      })
      .catch(() => {
        clearSession();
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleAuthSuccess = ({ accessToken, user: nextUser }) => {
    persistSession({ token: accessToken, user: nextUser });
    setToken(accessToken);
    setUser(nextUser);
  };

  const updateUser = (nextUser) => {
    persistSession({ token, user: nextUser });
    setUser(nextUser);
  };

  const login = async (payload) => {
    const response = await loginRequest(payload);
    handleAuthSuccess(response);
    return response;
  };

  const register = async (payload) => {
    const response = await registerRequest(payload);
    handleAuthSuccess(response);
    return response;
  };

  const logout = async () => {
    try {
      if (token) {
        await logoutRequest();
      }
    } finally {
      clearSession();
      setToken(null);
      setUser(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        isAuthenticated: Boolean(token && user),
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

