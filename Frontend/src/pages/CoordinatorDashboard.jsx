// The coordinator's workspace (Phase 4). It loads every application, shows each
// one with its eligibility answers, and gives the coordinator three actions:
//   - Approve / Reject  → PATCH the application's status
//   - Refer             → POST a referral (only works once approved)
// After each action we reload the list so the table reflects the new state.
//
// It follows the same load pattern as StaffHome: a useEffect that fetches on mount,
// with a "loading | ok | error" status so we always show the right thing.

import { useEffect, useState } from "react";
import {
  listApplications,
  updateApplicationStatus,
  createReferral,
} from "../api";

// `token` is the logged-in coordinator's JWT, passed down from StaffHome.
function CoordinatorDashboard({ token }) {
  // The applications array once it loads. [] = none yet (or still loading).
  const [applications, setApplications] = useState([]);
  // null | "loading" | "ok" | "error" — drives what we render.
  const [status, setStatus] = useState("loading");
  // A short message shown after an action (e.g. "Referred to City General" or an
  // error). Cleared whenever we kick off a new action.
  const [notice, setNotice] = useState("");
  // The hospital typed into each row's Refer box, keyed by application id, so the
  // rows don't share one input. { [id]: "City General" }.
  const [hospitals, setHospitals] = useState({});

  // Pull the list from the backend and drop it into state. We define it at this
  // level (not just inside useEffect) so the action handlers below can re-run it
  // to refresh after a change.
  async function refresh() {
    try {
      const rows = await listApplications(token);
      setApplications(rows);
      setStatus("ok");
    } catch (err) {
      console.error("Loading applications failed:", err);
      setStatus("error");
    }
  }

  // Load once on mount (and if the token ever changes).
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Approve or reject: PATCH the status, then refresh the table.
  async function handleSetStatus(id, newStatus) {
    setNotice("");
    try {
      await updateApplicationStatus(token, id, newStatus);
      await refresh();
    } catch (err) {
      console.error("Updating status failed:", err);
      setNotice(`Could not set status to ${newStatus}.`);
    }
  }

  // Refer: read the hospital typed for THIS row, POST the referral, then refresh.
  async function handleRefer(id) {
    setNotice("");
    const hospital = (hospitals[id] || "").trim();
    if (!hospital) {
      setNotice("Enter a hospital name before referring.");
      return;
    }
    try {
      await createReferral(token, { application_id: id, hospital });
      setNotice(`Referred application #${id} to ${hospital}.`);
      // Clear just this row's input.
      setHospitals((prev) => ({ ...prev, [id]: "" }));
      await refresh();
    } catch (err) {
      // The backend returns 400 if the application isn't approved yet — the most
      // common reason this fails — so we hint at that.
      console.error("Referral failed:", err);
      setNotice("Could not refer. Approve the application first, then try again.");
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h1>Coordinator dashboard</h1>
      <p>Review applications, approve eligibility, and refer to a hospital.</p>

      {status === "loading" && <p>Loading applications…</p>}

      {status === "error" && (
        <p style={{ color: "red" }}>Could not load applications. Try refreshing.</p>
      )}

      {/* A short status line after an action. */}
      {notice && <p style={{ color: "#555" }}>{notice}</p>}

      {status === "ok" && applications.length === 0 && (
        <p>No applications yet.</p>
      )}

      {status === "ok" &&
        applications.map((appn) => (
          <div
            key={appn.id}
            style={{
              border: "1px solid #ccc",
              borderRadius: 6,
              padding: "1rem",
              marginBottom: "1rem",
            }}
          >
            <p style={{ margin: "0 0 0.5rem" }}>
              <strong>#{appn.id} — {appn.patient_name}</strong> ({appn.email},{" "}
              {appn.contact})
            </p>
            <p style={{ margin: "0 0 0.5rem" }}>
              Status: <strong>{appn.status}</strong>
            </p>

            {/* The eligibility answers the patient submitted. */}
            {appn.answers.length > 0 && (
              <ul style={{ margin: "0 0 0.5rem" }}>
                {appn.answers.map((a) => (
                  <li key={a.id}>
                    {a.question} — <em>{a.answer}</em>
                  </li>
                ))}
              </ul>
            )}

            {/* Approve / reject buttons. */}
            <div style={{ marginBottom: "0.5rem" }}>
              <button type="button" onClick={() => handleSetStatus(appn.id, "approved")}>
                Approve
              </button>{" "}
              <button type="button" onClick={() => handleSetStatus(appn.id, "rejected")}>
                Reject
              </button>
            </div>

            {/* Refer: a hospital input + button, scoped to this row. */}
            <div>
              <input
                type="text"
                placeholder="Hospital name"
                value={hospitals[appn.id] || ""}
                onChange={(e) =>
                  setHospitals((prev) => ({ ...prev, [appn.id]: e.target.value }))
                }
              />{" "}
              <button type="button" onClick={() => handleRefer(appn.id)}>
                Refer
              </button>
            </div>
          </div>
        ))}
    </div>
  );
}

export default CoordinatorDashboard;
