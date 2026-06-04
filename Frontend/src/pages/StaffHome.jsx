// What a logged-in staff member sees. For now it has one job: PROVE the login
// worked end-to-end. It takes the token, calls the protected GET /auth/me route,
// and shows who you are. Later this becomes the shell for the real dashboards
// (coordinator/nurse/admin), which we'll show based on user.role.

import { useEffect, useState } from "react";
import { getCurrentUser } from "../api";
// The role-specific dashboard for coordinators (and admins, who can do everything
// a coordinator can). Other roles keep the simple identity view for now.
import CoordinatorDashboard from "./CoordinatorDashboard.jsx";
// The nurse's workspace (Phase 5): follow up on referrals + create trials.
import NurseDashboard from "./NurseDashboard.jsx";
// The admin's workspace (Phase 6): manage staff accounts + launch trials.
import AdminDashboard from "./AdminDashboard.jsx";

// `token` is the JWT App is holding; `onLogout` clears it and returns to login.
function StaffHome({ token, onLogout }) {
  // The user object from /auth/me, once it loads. null = still loading or failed.
  const [user, setUser] = useState(null);
  // null | "loading" | "error" — so we can show the right thing while we wait.
  const [status, setStatus] = useState("loading");

  // useEffect runs AFTER the first render. We use it to kick off the network
  // request for the current user. The [token] dependency means it re-runs only
  // if the token changes (e.g. a different person logs in).
  useEffect(() => {
    // A flag so we don't try to update state if this component unmounts mid-request.
    let active = true;

    async function load() {
      try {
        const me = await getCurrentUser(token);
        if (active) {
          setUser(me);
          setStatus("ok");
        }
      } catch (err) {
        // Token expired/invalid → bounce them back to the login screen.
        console.error("Loading current user failed:", err);
        if (active) setStatus("error");
      }
    }

    load();
    // Cleanup: if we unmount before the request finishes, ignore its result.
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <div style={{ maxWidth: 500, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h1>Staff area</h1>

      {status === "loading" && <p>Loading your account…</p>}

      {status === "error" && (
        <div>
          <p style={{ color: "red" }}>
            Your session has expired. Please log in again.
          </p>
          <button type="button" onClick={onLogout}>
            Back to login
          </button>
        </div>
      )}

      {status === "ok" && user && (
        <div>
          <p>
            Logged in as <strong>{user.name}</strong> ({user.email})
          </p>
          {/* The role decides which dashboard(s) you get. Coordinators and admins
              get the coordinator workspace; nurses get the nurse workspace (Phase 5);
              admins ALSO get the admin workspace (Phase 6: manage accounts + launch
              trials) on top, since an admin oversees everything. */}
          <p>
            Role: <strong>{user.role}</strong>
          </p>
          <button type="button" onClick={onLogout}>
            Log out
          </button>

          {/* Admin-only workspace. Passed the admin's own id so it can avoid
              offering a self-disable button (which the backend rejects anyway). */}
          {user.role === "admin" && (
            <AdminDashboard token={token} currentUserId={user.id} />
          )}

          {(user.role === "coordinator" || user.role === "admin") && (
            <CoordinatorDashboard token={token} />
          )}

          {user.role === "nurse" && <NurseDashboard token={token} />}
        </div>
      )}
    </div>
  );
}

export default StaffHome;
