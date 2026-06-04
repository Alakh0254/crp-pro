// The coordinator's workspace (Phase 4). It loads every application, shows each one
// with its eligibility answers, and gives the coordinator three actions:
//   - Approve / Reject  → PATCH the application's status
//   - Refer             → POST a referral (only works once approved)
//
// Server state now comes from TanStack Query hooks (../hooks/queries) instead of the
// old hand-rolled useEffect + refresh(): `useApplications` caches the list and tracks
// loading/error, and the two mutations invalidate the cache on success so the list
// refetches automatically — no manual refresh() calls. Local UI state (the per-row
// hospital inputs and the action notice) stays in useState, where it belongs.

import { useState } from "react";
import {
  useApplications,
  useUpdateApplicationStatus,
  useCreateReferral,
} from "../hooks/queries";
import { Button, Card, Spinner, StatusBadge } from "../ui";

// `token` is the logged-in coordinator's JWT, passed down from StaffHome.
interface CoordinatorDashboardProps {
  token: string | null;
}

function CoordinatorDashboard({ token }: CoordinatorDashboardProps) {
  // The cached applications list + its loading/error flags, straight from Query.
  const applicationsQuery = useApplications(token);
  // The two writes. Each invalidates ["applications"] on success (createReferral also
  // invalidates ["referrals"]), so the list above refetches without us asking.
  const updateStatus = useUpdateApplicationStatus(token);
  const createReferral = useCreateReferral(token);

  // A short message shown after an action (success or error). Cleared on each new action.
  const [notice, setNotice] = useState("");
  // The hospital typed into each row's Refer box, keyed by application id, so the rows
  // don't share one input. { [id]: "City General" }.
  const [hospitals, setHospitals] = useState<Record<number, string>>({});

  // Approve or reject: fire the mutation; Query refetches the list on success.
  function handleSetStatus(id: number, newStatus: "approved" | "rejected") {
    setNotice("");
    updateStatus.mutate(
      { id, status: newStatus },
      {
        onError: (err) => {
          console.error("Updating status failed:", err);
          setNotice(`Could not set status to ${newStatus}.`);
        },
      }
    );
  }

  // Refer: read the hospital typed for THIS row, POST the referral, clear the input.
  function handleRefer(id: number) {
    setNotice("");
    const hospital = (hospitals[id] || "").trim();
    if (!hospital) {
      setNotice("Enter a hospital name before referring.");
      return;
    }
    createReferral.mutate(
      { application_id: id, hospital },
      {
        onSuccess: () => {
          setNotice(`Referred application #${id} to ${hospital}.`);
          setHospitals((prev) => ({ ...prev, [id]: "" }));
        },
        onError: (err) => {
          // The backend returns 400 if the application isn't approved yet — the most
          // common reason this fails — so we hint at that.
          console.error("Referral failed:", err);
          setNotice("Could not refer. Approve the application first, then try again.");
        },
      }
    );
  }

  const applications = applicationsQuery.data ?? [];

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold text-on-surface">Coordinator dashboard</h2>
        <p className="text-sm text-on-surface-variant">
          Review applications, approve eligibility, and refer to a hospital.
        </p>
      </header>

      {applicationsQuery.isLoading && (
        <div className="flex items-center gap-2 text-on-surface-variant">
          <Spinner label="Loading applications" />
          <span>Loading applications…</span>
        </div>
      )}

      {applicationsQuery.isError && (
        <p className="text-sm text-error">Could not load applications. Try refreshing.</p>
      )}

      {/* A short status line after an action. */}
      {notice && <p className="text-sm text-on-surface-variant">{notice}</p>}

      {!applicationsQuery.isLoading &&
        !applicationsQuery.isError &&
        applications.length === 0 && (
          <p className="text-sm text-on-surface-variant">No applications yet.</p>
        )}

      <div className="space-y-4">
        {applications.map((appn) => (
          <Card key={appn.id} className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-on-surface">
                <span className="font-semibold">
                  #{appn.id} — {appn.patient_name}
                </span>{" "}
                <span className="text-on-surface-variant">
                  ({appn.email}, {appn.contact})
                </span>
              </p>
              <StatusBadge status={appn.status} />
            </div>

            {/* The eligibility answers the patient submitted. */}
            {appn.answers.length > 0 && (
              <ul className="space-y-1 text-sm text-on-surface-variant">
                {appn.answers.map((a) => (
                  <li key={a.id}>
                    {a.question} — <em className="text-on-surface">{a.answer}</em>
                  </li>
                ))}
              </ul>
            )}

            {/* Approve / reject buttons. */}
            <div className="flex gap-2">
              <Button
                onClick={() => handleSetStatus(appn.id, "approved")}
                disabled={updateStatus.isPending}
              >
                Approve
              </Button>
              <Button
                variant="danger"
                onClick={() => handleSetStatus(appn.id, "rejected")}
                disabled={updateStatus.isPending}
              >
                Reject
              </Button>
            </div>

            {/* Refer: a hospital input + button, scoped to this row. */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Hospital name"
                value={hospitals[appn.id] || ""}
                onChange={(e) =>
                  setHospitals((prev) => ({ ...prev, [appn.id]: e.target.value }))
                }
                className="flex-1 rounded-card border border-outline px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <Button
                variant="secondary"
                onClick={() => handleRefer(appn.id)}
                disabled={createReferral.isPending}
              >
                Refer
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

export default CoordinatorDashboard;
