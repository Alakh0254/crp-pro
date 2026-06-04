// What a logged-in staff member sees at /dashboard. It reads the current user from the
// AuthContext (which already fetched /auth/me) and shows the dashboard(s) for their
// role, all wrapped in the shared AppShell (sidebar + top bar — UI_SPEC §9).
// ProtectedRoute guarantees we only get here with a loaded user, so this component does
// no loading/error handling itself — that lives in one place.

import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { AppShell } from "../ui";
// The role-specific dashboard for coordinators (and admins, who can do everything a
// coordinator can).
import CoordinatorDashboard from "./CoordinatorDashboard";
// The nurse's workspace (Phase 5): follow up on referrals + create trials.
import NurseDashboard from "./NurseDashboard";
// The admin's workspace (Phase 6): manage staff accounts + launch trials.
import AdminDashboard from "./AdminDashboard";

function StaffHome() {
  // token = the JWT to pass down to the dashboards' hooks; user = who we are;
  // logout = clear the token. All come from the one AuthContext.
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();

  // ProtectedRoute only renders us once `user` is loaded, but TypeScript can't know
  // that from here, so guard to narrow `user` from `UserRead | null`.
  if (!user) {
    return null;
  }

  // Log out, then return to the public landing page.
  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <AppShell userName={user.name} role={user.role} onLogout={handleLogout}>
      {/* The role decides which dashboard(s) you get. Coordinators and admins get the
          coordinator workspace; nurses get the nurse workspace (Phase 5); admins ALSO
          get the admin workspace (Phase 6: manage accounts + launch trials) on top,
          since an admin oversees everything. */}
      {user.role === "admin" && (
        <AdminDashboard token={token} currentUserId={user.id} />
      )}

      {(user.role === "coordinator" || user.role === "admin") && (
        <CoordinatorDashboard token={token} />
      )}

      {user.role === "nurse" && <NurseDashboard token={token} />}
    </AppShell>
  );
}

export default StaffHome;
