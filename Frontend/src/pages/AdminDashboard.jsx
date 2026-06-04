// The admin's workspace (Phase 6). It does two jobs:
//   - Accounts: lists every staff account, lets the admin create a coordinator/
//     nurse account (POST /users) and enable/disable one (PATCH /users/{id}).
//   - Trials: lists every trial and lets the admin launch a draft (PATCH
//     /trials/{id} → "open") or close an open one.
// After each action we reload the relevant list so the screen reflects the new state.
//
// It mirrors NurseDashboard/CoordinatorDashboard: a useEffect that fetches on
// mount, a "loading | ok | error" status, and a `notice` line shown after an action.

import { useEffect, useState } from "react";
import {
  listUsers,
  createUser,
  updateUserStatus,
  listTrials,
  updateTrialStatus,
} from "../api";

// `token` is the logged-in admin's JWT, passed down from StaffHome. `currentUserId`
// is the admin's own id, so we can hide the disable button on their own row (the
// backend rejects self-disable anyway — this just avoids offering a dead action).
function AdminDashboard({ token, currentUserId }) {
  // The staff accounts array once it loads. [] = none yet (or still loading).
  const [users, setUsers] = useState([]);
  // The trials array once it loads.
  const [trials, setTrials] = useState([]);
  // null | "loading" | "ok" | "error" — drives what we render.
  const [status, setStatus] = useState("loading");
  // A short message shown after an action (success or error). Cleared on each new action.
  const [notice, setNotice] = useState("");
  // The new-account form fields. role defaults to "coordinator" (one of the two
  // the backend allows).
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("coordinator");

  // Pull both lists from the backend. Defined at this level (not just inside
  // useEffect) so the action handlers below can re-run it to refresh after a change.
  async function refresh() {
    try {
      const [userRows, trialRows] = await Promise.all([
        listUsers(token),
        listTrials(token),
      ]);
      setUsers(userRows);
      setTrials(trialRows);
      setStatus("ok");
    } catch (err) {
      console.error("Loading admin dashboard failed:", err);
      setStatus("error");
    }
  }

  // Load once on mount (and if the token ever changes).
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Create an account: validate the fields, POST it, then clear the form and refresh.
  async function handleCreateUser(e) {
    // The form's onSubmit fires on Enter too; stop the browser from reloading the page.
    e.preventDefault();
    setNotice("");
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    if (!cleanName || !cleanEmail || !password) {
      setNotice("Enter a name, email and password to create an account.");
      return;
    }
    try {
      const user = await createUser(token, {
        name: cleanName,
        email: cleanEmail,
        password,
        role,
      });
      setNotice(`Created ${user.role} account #${user.id}: ${user.email}.`);
      setName("");
      setEmail("");
      setPassword("");
      setRole("coordinator");
      await refresh();
    } catch (err) {
      // The backend returns 400 if the email is already taken — the most common
      // reason this fails — so we hint at that.
      console.error("Creating user failed:", err);
      setNotice("Could not create the account. Is the email already in use?");
    }
  }

  // Enable/disable an account: PATCH is_active, then refresh the list.
  async function handleToggleActive(id, nextActive) {
    setNotice("");
    try {
      await updateUserStatus(token, id, nextActive);
      setNotice(`Account #${id} ${nextActive ? "enabled" : "disabled"}.`);
      await refresh();
    } catch (err) {
      console.error("Updating user failed:", err);
      setNotice(`Could not ${nextActive ? "enable" : "disable"} account #${id}.`);
    }
  }

  // Launch/close a trial: PATCH the status, then refresh the list.
  async function handleSetTrialStatus(id, newStatus) {
    setNotice("");
    try {
      await updateTrialStatus(token, id, newStatus);
      setNotice(`Trial #${id} set to "${newStatus}".`);
      await refresh();
    } catch (err) {
      console.error("Updating trial failed:", err);
      setNotice(`Could not set trial #${id} to ${newStatus}.`);
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h1>Admin dashboard</h1>
      <p>Manage staff accounts and launch clinical trials.</p>

      {status === "loading" && <p>Loading…</p>}

      {status === "error" && (
        <p style={{ color: "red" }}>Could not load the dashboard. Try refreshing.</p>
      )}

      {/* A short status line after an action. */}
      {notice && <p style={{ color: "#555" }}>{notice}</p>}

      {status === "ok" && (
        <>
          {/* --- Create an account ------------------------------------------- */}
          <h2>Create a staff account</h2>
          <form onSubmit={handleCreateUser} style={{ marginBottom: "1rem" }}>
            <div style={{ marginBottom: "0.5rem" }}>
              <input
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ marginBottom: "0.5rem" }}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ marginBottom: "0.5rem" }}>
              <input
                type="password"
                placeholder="Temporary password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ marginBottom: "0.5rem" }}>
              {/* Only the two roles an admin may create — matches the backend Literal. */}
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="coordinator">Coordinator</option>
                <option value="nurse">Nurse</option>
              </select>
            </div>
            <button type="submit">Create account</button>
          </form>

          {/* --- Staff accounts --------------------------------------------- */}
          <h2>Staff accounts</h2>
          {users.length === 0 && <p>No accounts yet.</p>}

          {users.map((u) => (
            <div
              key={u.id}
              style={{
                border: "1px solid #ccc",
                borderRadius: 6,
                padding: "1rem",
                marginBottom: "1rem",
              }}
            >
              <p style={{ margin: "0 0 0.5rem" }}>
                <strong>
                  #{u.id} — {u.name}
                </strong>{" "}
                ({u.email})
              </p>
              <p style={{ margin: "0 0 0.5rem" }}>
                Role: <strong>{u.role}</strong> · Status:{" "}
                <strong>{u.is_active ? "active" : "disabled"}</strong>
              </p>

              {/* Enable/disable, except on the admin's own row: the backend rejects
                  self-disable, so we don't offer the button there. */}
              {u.id === currentUserId ? (
                <p style={{ margin: 0, color: "#888" }}>This is you.</p>
              ) : u.is_active ? (
                <button type="button" onClick={() => handleToggleActive(u.id, false)}>
                  Disable
                </button>
              ) : (
                <button type="button" onClick={() => handleToggleActive(u.id, true)}>
                  Enable
                </button>
              )}
            </div>
          ))}

          {/* --- Trials ------------------------------------------------------ */}
          <h2>Trials</h2>
          {trials.length === 0 && <p>No trials yet.</p>}

          {trials.map((trial) => (
            <div
              key={trial.id}
              style={{
                border: "1px solid #ccc",
                borderRadius: 6,
                padding: "1rem",
                marginBottom: "1rem",
              }}
            >
              <p style={{ margin: "0 0 0.5rem" }}>
                <strong>
                  #{trial.id} — {trial.title}
                </strong>{" "}
                ({trial.status})
              </p>
              <p style={{ margin: "0 0 0.5rem" }}>{trial.description}</p>

              {/* A draft can be launched; an open trial can be closed. A closed
                  trial has no further action here. */}
              {trial.status === "draft" && (
                <button type="button" onClick={() => handleSetTrialStatus(trial.id, "open")}>
                  Launch
                </button>
              )}
              {trial.status === "open" && (
                <button type="button" onClick={() => handleSetTrialStatus(trial.id, "closed")}>
                  Close
                </button>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default AdminDashboard;
