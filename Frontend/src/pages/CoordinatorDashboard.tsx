// The coordinator's workspace (Phase 4), now built to UI_SPEC §4: a lead INBOX whose
// rows carry no action buttons, plus a right-side PATIENT DETAIL DRAWER that opens on a
// row click and is the only place the actions live (approve / reject / refer). Hiding
// the actions until a patient is selected mirrors the spec — "actions are hidden until a
// patient is selected" — though the real security boundary is the API, not this UI.
//
// Server state still comes from the TanStack Query hooks (../hooks/queries): the list
// and the two mutations that invalidate it on success so the screen refetches. The only
// new state here is local UI: which row's drawer is open, the drawer's notice line, and
// the hospital typed for the selected patient.

import { useState } from "react";
import {
  useApplications,
  useApplication,
  useUpdateApplicationStatus,
  useCreateReferral,
} from "../hooks/queries";
import { Button, Card, Drawer, Spinner, StatusBadge } from "../ui";

// `token` is the logged-in coordinator's JWT, passed down from StaffHome.
interface CoordinatorDashboardProps {
  token: string | null;
}

function CoordinatorDashboard({ token }: CoordinatorDashboardProps) {
  // The cached applications list + its loading/error flags, straight from Query.
  const applicationsQuery = useApplications(token);
  // The two writes. Each invalidates ["applications"] on success (createReferral also
  // invalidates ["referrals"]), so the list refetches without us asking.
  const updateStatus = useUpdateApplicationStatus(token);
  const createReferral = useCreateReferral(token);

  // Which application's drawer is open (its id), or null when the drawer is closed.
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // A short message shown inside the drawer after an action (success or error).
  const [notice, setNotice] = useState("");
  // The hospital typed into the drawer's Refer box for the selected patient.
  const [hospital, setHospital] = useState("");

  const applications = applicationsQuery.data ?? [];
  // The selected application, looked up from the LIVE list so it reflects the latest
  // status after a mutation refetches (e.g. flips to "approved"/"referred"). Null when
  // nothing is selected or the selected row has vanished from the list.
  const selected = applications.find((a) => a.id === selectedId) ?? null;

  // The full record for the open patient — email, contact, eligibility answers — fetched
  // lazily when the drawer opens (selectedId non-null). The inbox list deliberately
  // doesn't carry this PHI; we pull it one patient at a time, and the backend audits each
  // such read. Closed drawer → selectedId null → useApplication stays disabled.
  const detailQuery = useApplication(token, selectedId);
  const detail = detailQuery.data;

  // Open a row's drawer: select it and clear any per-patient UI from a previous open.
  function openDrawer(id: number) {
    setSelectedId(id);
    setNotice("");
    setHospital("");
  }

  function closeDrawer() {
    setSelectedId(null);
  }

  // Approve or reject the selected application; Query refetches the list on success.
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

  // Refer the selected (approved) application to the typed hospital, then clear the box.
  function handleRefer(id: number) {
    setNotice("");
    const name = hospital.trim();
    if (!name) {
      setNotice("Enter a hospital name before referring.");
      return;
    }
    createReferral.mutate(
      { application_id: id, hospital: name },
      {
        onSuccess: () => {
          setNotice(`Referred application #${id} to ${name}.`);
          setHospital("");
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

      {!applicationsQuery.isLoading &&
        !applicationsQuery.isError &&
        applications.length === 0 && (
          <p className="text-sm text-on-surface-variant">No applications yet.</p>
        )}

      {/* The lead inbox: one clickable row per application, no action buttons (those
          live in the drawer). Each row is a button for keyboard + screen-reader use. */}
      <div className="space-y-3">
        {applications.map((appn) => (
          <Card
            key={appn.id}
            role="button"
            tabIndex={0}
            onClick={() => openDrawer(appn.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openDrawer(appn.id);
              }
            }}
            className="flex cursor-pointer items-center justify-between gap-3 p-4 transition-colors hover:bg-surface-container-low focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div>
              <p className="font-semibold text-on-surface">
                #{appn.id} — {appn.patient_name}
              </p>
              <p className="text-xs text-on-surface-variant">
                Submitted {new Date(appn.created_at).toLocaleDateString()}
              </p>
            </div>
            <StatusBadge status={appn.status} />
          </Card>
        ))}
      </div>

      {/* The patient detail drawer: opens on a row click, holds every action. Rendered
          once and driven by `selected` — it returns null while nothing is selected. */}
      <Drawer
        open={selected !== null}
        onClose={closeDrawer}
        title={
          selected && (
            <div className="flex items-center gap-2">
              <span className="font-semibold">{selected.patient_name}</span>
              <StatusBadge status={selected.status} />
            </div>
          )
        }
      >
        {selected && (
          <div className="space-y-5">
            {/* Messaging actions (UI_SPEC §4.2 "Send SMS"/"Contact Patient"). UI-only
                and disabled for now — there's no backend messaging worker wired yet, so
                these are placeholders that slot in once it exists. */}
            <div className="space-y-1">
              <div className="flex gap-2">
                <Button variant="secondary" disabled>
                  Mail
                </Button>
                <Button variant="secondary" disabled>
                  SMS
                </Button>
                <Button variant="secondary" disabled>
                  Call
                </Button>
              </div>
              <p className="text-xs text-on-surface-variant">Coming soon</p>
            </div>

            {/* Contact + eligibility answers are PHI, so they aren't in the inbox list —
                we fetch the full record when the drawer opens. Show the load state while
                that request is in flight, an error if it fails, and the data once here. */}
            {detailQuery.isLoading && (
              <div className="flex items-center gap-2 text-on-surface-variant">
                <Spinner label="Loading patient details" />
                <span>Loading patient details…</span>
              </div>
            )}

            {detailQuery.isError && (
              <p className="text-sm text-error">
                Could not load patient details. Close and reopen to try again.
              </p>
            )}

            {detail && (
              <>
                {/* Contact info (from the full record). */}
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-on-surface">Contact</h3>
                  <p className="text-sm text-on-surface-variant">{detail.email}</p>
                  <p className="text-sm text-on-surface-variant">{detail.contact}</p>
                  <p className="text-xs text-on-surface-variant">
                    {detail.trial_id ? `Trial #${detail.trial_id}` : "No trial linked"} ·
                    Submitted {new Date(detail.created_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Eligibility answers (read-only). */}
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-on-surface">
                    Eligibility answers
                  </h3>
                  {detail.answers.length > 0 ? (
                    <ul className="space-y-1 text-sm text-on-surface-variant">
                      {detail.answers.map((a) => (
                        <li key={a.id}>
                          {a.question} —{" "}
                          <em className="text-on-surface">{a.answer}</em>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-on-surface-variant">
                      No answers submitted.
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Consent record (UI_SPEC §4.2). The version/timestamp/IP aren't exposed by
                the current API, so this is a visible placeholder that keeps the §4.2
                layout — the real data slots into this box later, no relayout needed. */}
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-on-surface">Consent record</h3>
              <div className="rounded-card border border-dashed border-outline-variant bg-surface-container-low p-3">
                <p className="text-sm text-on-surface-variant">Not available yet.</p>
              </div>
            </div>

            {/* Activity / audit timeline (UI_SPEC §4.2). Same story as Consent: the
                audit feed isn't exposed to this client yet, so a placeholder holds the
                spot in the layout. */}
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-on-surface">Activity</h3>
              <div className="rounded-card border border-dashed border-outline-variant bg-surface-container-low p-3">
                <p className="text-sm text-on-surface-variant">Not available yet.</p>
              </div>
            </div>

            {/* A short status line after an action. */}
            {notice && <p className="text-sm text-on-surface-variant">{notice}</p>}

            {/* Actions — the only place they appear (UI_SPEC §4.2). */}
            <div className="space-y-3 border-t border-outline-variant pt-4">
              <div className="flex gap-2">
                <Button
                  onClick={() => handleSetStatus(selected.id, "approved")}
                  disabled={updateStatus.isPending}
                >
                  Approve
                </Button>
                <Button
                  variant="danger"
                  onClick={() => handleSetStatus(selected.id, "rejected")}
                  disabled={updateStatus.isPending}
                >
                  Reject
                </Button>
              </div>

              {/* Refer: a hospital input + button, scoped to the selected patient.
                  Gated on approval (UI_SPEC §4.2: "enabled only after approval") —
                  disabled until the application is approved. The backend also rejects
                  a premature refer with a 400; this just mirrors that in the UI. */}
              <div className="space-y-1">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Hospital name"
                    value={hospital}
                    onChange={(e) => setHospital(e.target.value)}
                    disabled={selected.status !== "approved" || createReferral.isPending}
                    className="flex-1 rounded-card border border-outline px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <Button
                    variant="secondary"
                    onClick={() => handleRefer(selected.id)}
                    disabled={selected.status !== "approved" || createReferral.isPending}
                  >
                    Refer
                  </Button>
                </div>
                {selected.status !== "approved" && (
                  <p className="text-xs text-on-surface-variant">
                    Approve the application before referring.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </section>
  );
}

export default CoordinatorDashboard;
