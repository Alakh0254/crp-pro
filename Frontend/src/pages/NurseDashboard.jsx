// The nurse's workspace (Phase 5). It does two jobs:
//   - Follow up: lists referred patients (with their details) and lets the nurse
//     move each referral forward — Contacted / Enrolled / Declined (PATCH /referrals/{id}).
//   - Trials: a small form to create a trial (POST /trials), plus the list of trials.
// After each action we reload the relevant list so the screen reflects the new state.
//
// It mirrors CoordinatorDashboard's pattern: a useEffect that fetches on mount,
// a "loading | ok | error" status, and a `notice` line shown after an action.

import { useEffect, useState } from "react";
import {
  listReferrals,
  updateReferralStatus,
  createTrial,
  listTrials,
} from "../api.js";

// `token` is the logged-in nurse's JWT, passed down from StaffHome.
function NurseDashboard({ token }) {
  // The referrals array once it loads. [] = none yet (or still loading).
  const [referrals, setReferrals] = useState([]);
  // The trials array once it loads.
  const [trials, setTrials] = useState([]);
  // null | "loading" | "ok" | "error" — drives what we render.
  const [status, setStatus] = useState("loading");
  // A short message shown after an action (success or error). Cleared on each new action.
  const [notice, setNotice] = useState("");
  // The new-trial form fields.
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Pull both lists from the backend. Defined at this level (not just inside
  // useEffect) so the action handlers below can re-run it to refresh after a change.
  async function refresh() {
    try {
      const [referralRows, trialRows] = await Promise.all([
        listReferrals(token),
        listTrials(token),
      ]);
      setReferrals(referralRows);
      setTrials(trialRows);
      setStatus("ok");
    } catch (err) {
      console.error("Loading nurse dashboard failed:", err);
      setStatus("error");
    }
  }

  // Load once on mount (and if the token ever changes).
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Record follow-up: PATCH the referral's status, then refresh the list.
  async function handleFollowUp(id, newStatus) {
    setNotice("");
    try {
      await updateReferralStatus(token, id, newStatus);
      setNotice(`Referral #${id} marked "${newStatus}".`);
      await refresh();
    } catch (err) {
      console.error("Updating referral failed:", err);
      setNotice(`Could not set referral #${id} to ${newStatus}.`);
    }
  }

  // Create a trial: validate the fields, POST it, then clear the form and refresh.
  async function handleCreateTrial(e) {
    // The form's onSubmit fires on Enter too; stop the browser from reloading the page.
    e.preventDefault();
    setNotice("");
    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    if (!cleanTitle || !cleanDescription) {
      setNotice("Enter both a title and a description to create a trial.");
      return;
    }
    try {
      const trial = await createTrial(token, {
        title: cleanTitle,
        description: cleanDescription,
      });
      setNotice(`Created trial #${trial.id}: ${trial.title}.`);
      setTitle("");
      setDescription("");
      await refresh();
    } catch (err) {
      console.error("Creating trial failed:", err);
      setNotice("Could not create the trial. Try again.");
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h1>Nurse dashboard</h1>
      <p>Follow up with referred patients and create clinical trials.</p>

      {status === "loading" && <p>Loading…</p>}

      {status === "error" && (
        <p style={{ color: "red" }}>Could not load the dashboard. Try refreshing.</p>
      )}

      {/* A short status line after an action. */}
      {notice && <p style={{ color: "#555" }}>{notice}</p>}

      {status === "ok" && (
        <>
          {/* --- Referred patients ------------------------------------------- */}
          <h2>Referred patients</h2>
          {referrals.length === 0 && <p>No referrals yet.</p>}

          {referrals.map((ref) => (
            <div
              key={ref.id}
              style={{
                border: "1px solid #ccc",
                borderRadius: 6,
                padding: "1rem",
                marginBottom: "1rem",
              }}
            >
              <p style={{ margin: "0 0 0.5rem" }}>
                <strong>
                  #{ref.id} — {ref.application.patient_name}
                </strong>{" "}
                ({ref.application.email}, {ref.application.contact})
              </p>
              <p style={{ margin: "0 0 0.5rem" }}>
                Hospital: <strong>{ref.hospital}</strong> · Status:{" "}
                <strong>{ref.status}</strong>
              </p>

              {/* The eligibility answers the patient submitted, for follow-up context. */}
              {ref.application.answers.length > 0 && (
                <ul style={{ margin: "0 0 0.5rem" }}>
                  {ref.application.answers.map((a) => (
                    <li key={a.id}>
                      {a.question} — <em>{a.answer}</em>
                    </li>
                  ))}
                </ul>
              )}

              {/* Follow-up buttons: move the referral along its lifecycle. */}
              <div>
                <button type="button" onClick={() => handleFollowUp(ref.id, "contacted")}>
                  Mark contacted
                </button>{" "}
                <button type="button" onClick={() => handleFollowUp(ref.id, "enrolled")}>
                  Mark enrolled
                </button>{" "}
                <button type="button" onClick={() => handleFollowUp(ref.id, "declined")}>
                  Mark declined
                </button>
              </div>
            </div>
          ))}

          {/* --- Create a trial ---------------------------------------------- */}
          <h2>Create a trial</h2>
          <form onSubmit={handleCreateTrial} style={{ marginBottom: "1rem" }}>
            <div style={{ marginBottom: "0.5rem" }}>
              <input
                type="text"
                placeholder="Trial title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ marginBottom: "0.5rem" }}>
              <textarea
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                style={{ width: "100%", boxSizing: "border-box" }}
              />
            </div>
            <button type="submit">Create trial</button>
          </form>

          {/* --- Existing trials --------------------------------------------- */}
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
                <strong>#{trial.id} — {trial.title}</strong> ({trial.status})
              </p>
              <p style={{ margin: 0 }}>{trial.description}</p>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default NurseDashboard;
