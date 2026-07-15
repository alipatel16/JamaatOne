import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  apiRequest,
  clearToken,
  getStoredToken,
  storeToken,
} from "../api/client";
import { endpoints } from "../api/endpoints";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    bootstrap();
  }, []);

  async function bootstrap() {
    try {
      const token = await getStoredToken();
      if (!token) return;
      const profile = await apiRequest(endpoints.me);
      setUser(profile);
    } catch {
      await clearToken();
    } finally {
      setBootstrapping(false);
    }
  }

  async function login(itsId, password) {
    const result = await apiRequest(endpoints.login, {
      method: "POST",
      body: JSON.stringify({ itsId, password }),
    });

    await storeToken(result.accessToken);
    setUser(result.user);
  }

  async function logout() {
    await clearToken();
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, bootstrapping, login, logout, setUser }),
    [user, bootstrapping],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
