import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  fetchProfile,
  getAccessToken,
  login as apiLogin,
  logout as apiLogout,
  refreshAccessToken,
  type UserProfile,
} from "@/lib/auth";

interface AuthContextValue {
  user: UserProfile | null;
  status: "loading" | "authenticated" | "unauthenticated";
  login: (identifier: string, password: string) => Promise<UserProfile>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");

  // On mount, restore the session from a persisted token (if any) by
  // validating it against /auth/profile.
  useEffect(() => {
    let cancelled = false;
    async function restore() {
      if (!getAccessToken()) {
        setStatus("unauthenticated");
        return;
      }
      try {
        const profile = await fetchProfile();
        if (!cancelled) {
          setUser(profile);
          setStatus("authenticated");
        }
      } catch {
        // Access token may simply be expired (not invalid) — try the
        // refresh token before giving up, so a page reload doesn't
        // silently log the user out while their session is still valid.
        const refreshed = await refreshAccessToken();
        if (cancelled) return;
        if (refreshed) {
          try {
            const profile = await fetchProfile();
            if (!cancelled) {
              setUser(profile);
              setStatus("authenticated");
            }
            return;
          } catch {
            /* fall through to logout below */
          }
        }
        if (!cancelled) {
          apiLogout();
          setStatus("unauthenticated");
        }
      }
    }
    restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const profile = await apiLogin(identifier, password);
    setUser(profile);
    setStatus("authenticated");
    return profile;
  }, []);

  const logout = useCallback(() => {
    apiLogout();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo<AuthContextValue>(() => ({ user, status, login, logout }), [user, status, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
