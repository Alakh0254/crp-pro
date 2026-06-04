// A gate for staff-only routes. Wrap any element that requires a login in this, and
// it decides between three outcomes:
//   - no token            → send to /login
//   - token, user loading → show a spinner (don't flash the login page)
//   - token + valid user  → render the protected screen
//
// This replaces the old `token ? <StaffHome/> : <Login/>` ternary that lived in
// App.jsx. Reminder: this is UX gating, not security — the backend still authorizes
// every request. A user who forces their way past this just sees a page whose API
// calls return 401/403.

import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Spinner } from "../ui";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { token, user, isLoading } = useAuth();

  // Not logged in at all → straight to the login page. `replace` so the protected
  // URL doesn't sit in history (Back wouldn't bounce them right back here).
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // We have a token but are still fetching /auth/me — show a centered spinner rather
  // than briefly redirecting to login and back.
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Loading your account" />
      </div>
    );
  }

  // Token present but no user means the fetch failed (expired/invalid token);
  // AuthContext is logging us out, so meanwhile send to login.
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Authenticated and loaded — render the protected screen.
  return <>{children}</>;
}

export default ProtectedRoute;
