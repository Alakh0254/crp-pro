// What a logged-in staff member sees. For now it has one job: PROVE the login
// worked end-to-end. It takes the token, calls the protected GET /auth/me route,
// and shows who you are. Later this becomes the shell for the real dashboards
// (coordinator/nurse/admin), which we'll show based on user.role.

import { useEffect, useState } from "react";
import { getCurrentUser } from "../api.js";

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
          {/* The role decides which dashboard you'll get in later phases. */}
          <p>
            Role: <strong>{user.role}</strong>
          </p>
          <button type="button" onClick={onLogout}>
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

export default StaffHome;
