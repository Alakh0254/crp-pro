// What a logged-in staff member sees at /dashboard. It reads the current user from
// the AuthContext (which already fetched /auth/me) and shows the dashboard(s) for
// their role. ProtectedRoute guarantees we only get here with a loaded user, so this
// component no longer does its own loading/error handling — that moved to one place.

import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
// The role-specific dashboard for coordinators (and admins, who can do everything
// a coordinator can). Other roles keep the simple identity view for now.
import CoordinatorDashboard from "./CoordinatorDashboard.jsx";
// The nurse's workspace (Phase 5): follow up on referrals + create trials.
import NurseDashboard from "./NurseDashboard.jsx";
// The admin's workspace (Phase 6): manage staff accounts + launch trials.
import AdminDashboard from "./AdminDashboard.jsx";

function StaffHome() {
  // token = the JWT to pass down to the dashboards' API calls; user = who we are;
  // logout = clear the token. All come from the one AuthContext.
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();

  // Log out, then return to the public landing page.
  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <div style={{ maxWidth: 500, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h1>Staff area</h1>

      <div>
        <p>
          Logged in as <strong>{user.name}</strong> ({user.email})
        </p>
        {/* The role decides which dashboard(s) you get. Coordinators and admins get
            the coordinator workspace; nurses get the nurse workspace (Phase 5);
            admins ALSO get the admin workspace (Phase 6: manage accounts + launch
            trials) on top, since an admin oversees everything. */}
        <p>
          Role: <strong>{user.role}</strong>
        </p>
        <button type="button" onClick={handleLogout}>
          Log out
        </button>

        {/* Admin-only workspace. Passed the admin's own id so it can avoid offering
            a self-disable button (which the backend rejects anyway). */}
        {user.role === "admin" && (
          <AdminDashboard token={token} currentUserId={user.id} />
        )}

        {(user.role === "coordinator" || user.role === "admin") && (
          <CoordinatorDashboard token={token} />
        )}

        {user.role === "nurse" && <NurseDashboard token={token} />}
      </div>
    </div>
  );
}

export default StaffHome;
