import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { router } from "expo-router";

import { authApi } from "../api/authApi";
import {
  clearSession,
  restoreSession,
  setSessionExpiredHandler,
  setSessionUpdatedHandler,
  storeSession
} from "../api/client";
import { normalizeRole } from "../constants/roles";

const AuthContext = createContext(null);

function mapSessionUser(session) {
  if (!session) return null;

  return {
    id: session.userId,
    userId: session.userId,
    itsId: session.itsNo,
    itsNo: session.itsNo,
    name: session.name,
    roleId: session.roleId,
    roleName: session.roleName,
    role: normalizeRole(session.roleName),
    jamaatId: session.jamaatId ?? null
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    let mounted = true;

    const removeSessionHandler = setSessionUpdatedHandler(nextSession => {
      if (!mounted) return;
      setSession(nextSession);
      setUser(mapSessionUser(nextSession));
    });

    const removeExpiredHandler = setSessionExpiredHandler(async () => {
      if (mounted) {
        setUser(null);
        setSession(null);
      }
      router.replace("/login");
    });

    async function bootstrap() {
      try {
        const restoredSession = await restoreSession();
        if (mounted) {
          setSession(restoredSession);
          setUser(mapSessionUser(restoredSession));
        }
      } finally {
        if (mounted) setBootstrapping(false);
      }
    }

    bootstrap();

    return () => {
      mounted = false;
      removeSessionHandler();
      removeExpiredHandler();
    };
  }, []);

  async function login(itsNo, password) {
    const loginSession = await authApi.login(itsNo, password);
    const storedSession = await storeSession(loginSession);
    const nextUser = mapSessionUser(storedSession);
    setSession(storedSession);
    setUser(nextUser);
    return nextUser;
  }

  async function logout() {
    let serverError = null;
    try {
      // Logout is a protected API and receives the current access token through
      // ApiClient. A 401 will run the normal refresh-and-retry flow once.
      await authApi.logout();
    } catch (error) {
      serverError = error;
    } finally {
      // Local logout must always complete, even if the server is unavailable.
      await clearSession();
      setSession(null);
      setUser(null);
    }
    return { serverError };
  }

  const value = useMemo(
    () => ({
      user,
      session,
      bootstrapping,
      login,
      logout,
      setUser,
      setSession
    }),
    [user, session, bootstrapping]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
