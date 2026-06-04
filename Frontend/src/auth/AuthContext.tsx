// The app's single source of truth for "who is logged in". Before this, App.jsx
// held the token in local state and StaffHome separately fetched /auth/me. Now BOTH
// live here, in one React Context, so any component can ask `useAuth()` for the
// token, the current user (with their role), and login/logout — no prop-drilling.
//
// SECURITY NOTE: this is CLIENT-SIDE gating only — it decides what the browser shows.
// It is NOT the security boundary. The backend authenticates and authorizes every
// request itself (RBAC, org-scope); a tampered token here just gets 401/403 from the
// API. We mirror the API's permissions in the UI for UX, never to enforce them.
//
// How it works:
//   - We keep the JWT in React state, seeded from localStorage (via api.ts helpers)
//     so a page refresh keeps you logged in.
//   - Whenever a token exists, a TanStack Query fetches GET /auth/me to learn who you
//     are. Query handles the loading/error/caching; we don't hand-roll a useEffect.
//   - If that fetch fails (expired/invalid token), we log out so the app falls back
//     to the login page.

import { createContext, useContext, useEffect } from "react";
import type { ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  getCurrentUser,
  getToken,
  saveToken,
  clearToken,
  type UserRead,
} from "../api";

// The shape every consumer gets from `useAuth()`.
interface AuthContextValue {
  // The raw JWT, or null when nobody is logged in.
  token: string | null;
  // The logged-in staff user (id, name, email, role, is_active), or null until
  // /auth/me has loaded (or if there's no token).
  user: UserRead | null;
  // True while we HAVE a token but are still fetching the user behind it. Routes use
  // this to show a spinner instead of briefly bouncing you to the login page.
  isLoading: boolean;
  // True only once we have BOTH a token and the user it belongs to.
  isAuthenticated: boolean;
  // Call after a successful POST /auth/login with the returned token string.
  login: (token: string) => void;
  // Forget the token everywhere and drop the cached user.
  logout: () => void;
}

// The Context itself. `undefined` default lets `useAuth` detect misuse (a component
// used outside the provider) and throw a clear error instead of silently breaking.
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Wraps the app (see main.tsx) so everything inside can call `useAuth()`.
export function AuthProvider({ children }: { children: ReactNode }) {
  // The token lives in React state so updates re-render consumers; we seed it from
  // localStorage so a refresh doesn't log you out.
  const [token, setToken] = useState<string | null>(getToken());
  // We use the query client to clear the cached user on logout.
  const queryClient = useQueryClient();

  // Fetch the current user whenever there's a token. `enabled: !!token` means the
  // query simply doesn't run when logged out. `retry: false` so an invalid token
  // fails fast (one 401) and we log out, rather than retrying a doomed request.
  const userQuery = useQuery({
    queryKey: ["currentUser", token],
    queryFn: () => getCurrentUser(token as string),
    enabled: !!token,
    retry: false,
  });

  // login: persist the token (localStorage + state). The user query re-runs
  // automatically because its queryKey includes the token.
  function login(newToken: string) {
    saveToken(newToken);
    setToken(newToken);
  }

  // logout: forget the token everywhere and drop the cached /auth/me result so a
  // future different login can't briefly show the previous user.
  function logout() {
    clearToken();
    setToken(null);
    queryClient.removeQueries({ queryKey: ["currentUser"] });
  }

  // If we have a token but the /auth/me fetch errored, the token is expired or
  // invalid — clear it so the app shows the login page. (An effect, because we're
  // reacting to the query's result, not computing during render.)
  useEffect(() => {
    if (token && userQuery.isError) {
      logout();
    }
    // logout is stable enough for this teaching codebase; we only care about the
    // token/error pair changing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, userQuery.isError]);

  const user = userQuery.data ?? null;

  const value: AuthContextValue = {
    token,
    user,
    // Loading only matters while a token exists but its user hasn't arrived yet.
    isLoading: !!token && userQuery.isLoading,
    isAuthenticated: !!token && !!user,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// The hook every component uses to read auth state. Throwing when there's no
// provider turns a confusing "cannot read property of undefined" into a clear
// message pointing at the real mistake.
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth must be used inside an <AuthProvider>");
  }
  return ctx;
}
