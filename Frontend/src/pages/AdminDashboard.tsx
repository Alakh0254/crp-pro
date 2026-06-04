// The admin's workspace (Phase 6). It does two jobs:
//   - Accounts: lists every staff account, lets the admin create a coordinator/nurse
//     account (POST /users) and enable/disable one (PATCH /users/{id}).
//   - Trials: lists every trial and lets the admin launch a draft (PATCH /trials/{id}
//     → "open") or close an open one.
//
// Server state now comes from TanStack Query hooks (../hooks/queries): `useUsers` and
// `useTrials` cache the two lists, and the three mutations invalidate them on success
// so the screen refetches itself. The new-account form fields stay in local useState.
// This replaces the old useEffect + refresh() pattern.

import { useState } from "react";
import {
  useUsers,
  useTrials,
  useCreateUser,
  useUpdateUserStatus,
  useUpdateTrialStatus,
} from "../hooks/queries";
import type { CreatableRole } from "../api";
import { Button, Card, Spinner, StatusBadge } from "../ui";

// `token` is the logged-in admin's JWT, passed down from StaffHome. `currentUserId` is
// the admin's own id, so we can hide the disable button on their own row (the backend
// rejects self-disable anyway — this just avoids offering a dead action).
interface AdminDashboardProps {
  token: string | null;
  currentUserId: number;
}

function AdminDashboard({ token, currentUserId }: AdminDashboardProps) {
  // The two cached lists + their loading/error flags, from Query.
  const usersQuery = useUsers(token);
  const trialsQuery = useTrials(token);
  // The three writes. Each invalidates its list on success so it refetches.
  const createUser = useCreateUser(token);
  const updateUser = useUpdateUserStatus(token);
  const updateTrial = useUpdateTrialStatus(token);

  // A short message shown after an action (success or error). Cleared on each new action.
  const [notice, setNotice] = useState("");
  // The new-account form fields. role defaults to "coordinator" (one of the two the
  // backend allows).
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<CreatableRole>("coordinator");

  // Create an account: validate the fields, POST it, then clear the form. Query
  // refetches the users list on success.
  function handleCreateUser(e: React.FormEvent) {
    // The form's onSubmit fires on Enter too; stop the browser from reloading the page.
    e.preventDefault();
    setNotice("");
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    if (!cleanName || !cleanEmail || !password) {
      setNotice("Enter a name, email and password to create an account.");
      return;
    }
    createUser.mutate(
      { name: cleanName, email: cleanEmail, password, role },
      {
        onSuccess: (user) => {
          setNotice(`Created ${user.role} account #${user.id}: ${user.email}.`);
          setName("");
          setEmail("");
          setPassword("");
          setRole("coordinator");
        },
        onError: (err) => {
          // The backend returns 400 if the email is already taken — the most common
          // reason this fails — so we hint at that.
          console.error("Creating user failed:", err);
          setNotice("Could not create the account. Is the email already in use?");
        },
      }
    );
  }

  // Enable/disable an account: PATCH is_active; Query refetches on success.
  function handleToggleActive(id: number, nextActive: boolean) {
    setNotice("");
    updateUser.mutate(
      { id, isActive: nextActive },
      {
        onSuccess: () =>
          setNotice(`Account #${id} ${nextActive ? "enabled" : "disabled"}.`),
        onError: (err) => {
          console.error("Updating user failed:", err);
          setNotice(`Could not ${nextActive ? "enable" : "disable"} account #${id}.`);
        },
      }
    );
  }

  // Launch/close a trial: PATCH the status; Query refetches on success.
  function handleSetTrialStatus(id: number, newStatus: "open" | "closed") {
    setNotice("");
    updateTrial.mutate(
      { id, status: newStatus },
      {
        onSuccess: () => setNotice(`Trial #${id} set to "${newStatus}".`),
        onError: (err) => {
          console.error("Updating trial failed:", err);
          setNotice(`Could not set trial #${id} to ${newStatus}.`);
        },
      }
    );
  }

  const users = usersQuery.data ?? [];
  const trials = trialsQuery.data ?? [];
  const isLoading = usersQuery.isLoading || trialsQuery.isLoading;
  const isError = usersQuery.isError || trialsQuery.isError;

  // Shared classes for the form fields (matches the other dashboards' inputs).
  const inputClasses =
    "w-full rounded-card border border-outline px-3 py-2 text-sm outline-none " +
    "transition-colors focus:border-primary focus:ring-1 focus:ring-primary";

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold text-on-surface">Admin dashboard</h2>
        <p className="text-sm text-on-surface-variant">
          Manage staff accounts and launch clinical trials.
        </p>
      </header>

      {isLoading && (
        <div className="flex items-center gap-2 text-on-surface-variant">
          <Spinner label="Loading dashboard" />
          <span>Loading…</span>
        </div>
      )}

      {isError && (
        <p className="text-sm text-error">Could not load the dashboard. Try refreshing.</p>
      )}

      {/* A short status line after an action. */}
      {notice && <p className="text-sm text-on-surface-variant">{notice}</p>}

      {!isLoading && !isError && (
        <>
          {/* --- Create an account ------------------------------------------- */}
          <h3 className="text-lg font-semibold text-on-surface">Create a staff account</h3>
          <Card>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <input
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClasses}
              />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClasses}
              />
              <input
                type="password"
                placeholder="Temporary password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClasses}
              />
              {/* Only the two roles an admin may create — matches the backend Literal. */}
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as CreatableRole)}
                className={inputClasses}
              >
                <option value="coordinator">Coordinator</option>
                <option value="nurse">Nurse</option>
              </select>
              <Button type="submit" disabled={createUser.isPending}>
                {createUser.isPending ? "Creating…" : "Create account"}
              </Button>
            </form>
          </Card>

          {/* --- Staff accounts --------------------------------------------- */}
          <h3 className="text-lg font-semibold text-on-surface">Staff accounts</h3>
          {users.length === 0 && (
            <p className="text-sm text-on-surface-variant">No accounts yet.</p>
          )}

          <div className="space-y-4">
            {users.map((u) => (
              <Card key={u.id} className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-on-surface">
                    <span className="font-semibold">
                      #{u.id} — {u.name}
                    </span>{" "}
                    <span className="text-on-surface-variant">({u.email})</span>
                  </p>
                  <StatusBadge status={u.is_active ? "open" : "closed"} />
                </div>
                <p className="text-sm text-on-surface-variant">
                  Role: <strong className="text-on-surface">{u.role}</strong>
                </p>

                {/* Enable/disable, except on the admin's own row: the backend rejects
                    self-disable, so we don't offer the button there. */}
                {u.id === currentUserId ? (
                  <p className="text-sm text-on-surface-variant">This is you.</p>
                ) : u.is_active ? (
                  <Button
                    variant="danger"
                    onClick={() => handleToggleActive(u.id, false)}
                    disabled={updateUser.isPending}
                  >
                    Disable
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleToggleActive(u.id, true)}
                    disabled={updateUser.isPending}
                  >
                    Enable
                  </Button>
                )}
              </Card>
            ))}
          </div>

          {/* --- Trials ------------------------------------------------------ */}
          <h3 className="text-lg font-semibold text-on-surface">Trials</h3>
          {trials.length === 0 && (
            <p className="text-sm text-on-surface-variant">No trials yet.</p>
          )}

          <div className="space-y-4">
            {trials.map((trial) => (
              <Card key={trial.id} className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-on-surface">
                    #{trial.id} — {trial.title}
                  </p>
                  <StatusBadge status={trial.status} />
                </div>
                <p className="text-sm text-on-surface-variant">{trial.description}</p>

                {/* A draft can be launched; an open trial can be closed. A closed
                    trial has no further action here. */}
                {trial.status === "draft" && (
                  <Button
                    onClick={() => handleSetTrialStatus(trial.id, "open")}
                    disabled={updateTrial.isPending}
                  >
                    Launch
                  </Button>
                )}
                {trial.status === "open" && (
                  <Button
                    variant="danger"
                    onClick={() => handleSetTrialStatus(trial.id, "closed")}
                    disabled={updateTrial.isPending}
                  >
                    Close
                  </Button>
                )}
              </Card>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export default AdminDashboard;
