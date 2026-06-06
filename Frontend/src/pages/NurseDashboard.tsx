// The nurse's workspace (Phase 5), now built like the coordinator inbox (UI_SPEC §4
// pattern): a referral INBOX whose rows carry no action buttons, plus a right-side
// PATIENT DETAIL DRAWER that opens on a row click and is the only place the follow-up
// actions live (Mark contacted / enrolled / declined). The list is minimized — it nests
// only the patient's name + status — so the bulk PHI (email, contact, eligibility
// answers) is fetched one referral at a time when the drawer opens (useReferral), and
// the backend audits each such read. The create-a-trial section is unchanged.
//
// Note the PHI here is nested under the referral: detail.application.email/.contact/
// .answers (a referral wraps an application), NOT flat on detail.* like the coordinator's
// application drawer.
//
// Server state comes from TanStack Query hooks (../hooks/queries): `useReferrals` (the
// minimized inbox), `useReferral` (one full record, gated on the open row), and `useTrials`,
// plus the mutations that invalidate their lists on success so the screen refetches itself.

import { useState } from "react";
import {
  useReferrals,
  useReferral,
  useUpdateReferralStatus,
  useTrials,
  useCreateTrial,
} from "../hooks/queries";
import { Button, Card, Drawer, Spinner, StatusBadge } from "../ui";

// `token` is the logged-in nurse's JWT, passed down from StaffHome.
interface NurseDashboardProps {
  token: string | null;
}

function NurseDashboard({ token }: NurseDashboardProps) {
  // The two cached lists + their loading/error flags, from Query.
  const referralsQuery = useReferrals(token);
  const trialsQuery = useTrials(token);
  // The follow-up write. Invalidates ["referrals"] on success so the inbox refetches.
  const updateReferral = useUpdateReferralStatus(token);
  const createTrial = useCreateTrial(token);

  // Which referral's drawer is open (its id), or null when the drawer is closed.
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // A short message shown inside the drawer after an action (success or error).
  const [notice, setNotice] = useState("");
  // The new-trial form fields.
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const referrals = referralsQuery.data ?? [];
  const trials = trialsQuery.data ?? [];

  // The selected referral, looked up from the LIVE list so it reflects the latest status
  // after a follow-up refetches (e.g. flips to "contacted"). Null when nothing is
  // selected or the selected row has vanished from the list.
  const selected = referrals.find((r) => r.id === selectedId) ?? null;

  // The full record for the open referral — the nested patient's email, contact, and
  // eligibility answers — fetched lazily when the drawer opens (selectedId non-null). The
  // inbox list deliberately doesn't carry this PHI; we pull it one referral at a time, and
  // the backend audits each such read. Closed drawer → selectedId null → useReferral stays
  // disabled. PHI lives under detail.application.* here, not flat on detail.
  const detailQuery = useReferral(token, selectedId);
  const detail = detailQuery.data;

  // Open a row's drawer: select it and clear any per-patient notice from a previous open.
  function openDrawer(id: number) {
    setSelectedId(id);
    setNotice("");
  }

  function closeDrawer() {
    setSelectedId(null);
  }

  // Record follow-up: PATCH the referral's status; Query refetches the inbox on success.
  function handleFollowUp(
    id: number,
    newStatus: "contacted" | "enrolled" | "declined"
  ) {
    setNotice("");
    updateReferral.mutate(
      { id, status: newStatus },
      {
        onSuccess: () => setNotice(`Referral #${id} marked "${newStatus}".`),
        onError: (err) => {
          console.error("Updating referral failed:", err);
          setNotice(`Could not set referral #${id} to ${newStatus}.`);
        },
      }
    );
  }

  // Create a trial: validate the fields, POST it, then clear the form. Query refetches
  // the trials list on success.
  function handleCreateTrial(e: React.FormEvent) {
    // The form's onSubmit fires on Enter too; stop the browser from reloading the page.
    e.preventDefault();
    setNotice("");
    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    if (!cleanTitle || !cleanDescription) {
      setNotice("Enter both a title and a description to create a trial.");
      return;
    }
    createTrial.mutate(
      { title: cleanTitle, description: cleanDescription },
      {
        onSuccess: (trial) => {
          setNotice(`Created trial #${trial.id}: ${trial.title}.`);
          setTitle("");
          setDescription("");
        },
        onError: (err) => {
          console.error("Creating trial failed:", err);
          setNotice("Could not create the trial. Try again.");
        },
      }
    );
  }

  // One combined "is anything still loading / did anything fail" flag, since the two
  // lists load together and the screen has nothing useful to show until both are in.
  const isLoading = referralsQuery.isLoading || trialsQuery.isLoading;
  const isError = referralsQuery.isError || trialsQuery.isError;

  // Shared classes for the text inputs/textarea (matches the patient form's fields).
  const inputClasses =
    "w-full rounded-card border border-outline px-3 py-2 text-sm outline-none " +
    "transition-colors focus:border-primary focus:ring-1 focus:ring-primary";

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold text-on-surface">Nurse dashboard</h2>
        <p className="text-sm text-on-surface-variant">
          Follow up with referred patients and create clinical trials.
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

      {!isLoading && !isError && (
        <>
          {/* --- Referred patients ------------------------------------------- */}
          <h3 className="text-lg font-semibold text-on-surface">Referred patients</h3>
          {referrals.length === 0 && (
            <p className="text-sm text-on-surface-variant">No referrals yet.</p>
          )}

          {/* The follow-up inbox: one clickable row per referral, no action buttons
              (those live in the drawer). Each row is a button for keyboard + screen-reader
              use. Rows show only the minimized patient (name) + hospital + status. */}
          <div className="space-y-3">
            {referrals.map((ref) => (
              <Card
                key={ref.id}
                role="button"
                tabIndex={0}
                onClick={() => openDrawer(ref.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openDrawer(ref.id);
                  }
                }}
                className="flex cursor-pointer items-center justify-between gap-3 p-4 transition-colors hover:bg-surface-container-low focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div>
                  <p className="font-semibold text-on-surface">
                    #{ref.id} — {ref.application.patient_name}
                  </p>
                  <p className="text-xs text-on-surface-variant">{ref.hospital}</p>
                </div>
                <StatusBadge status={ref.status} />
              </Card>
            ))}
          </div>

          {/* --- Create a trial ---------------------------------------------- */}
          <h3 className="text-lg font-semibold text-on-surface">Create a trial</h3>
          {/* The create-trial notice shows here (the drawer has its own). */}
          {notice && selectedId === null && (
            <p className="text-sm text-on-surface-variant">{notice}</p>
          )}
          <Card>
            <form onSubmit={handleCreateTrial} className="space-y-3">
              <input
                type="text"
                placeholder="Trial title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputClasses}
              />
              <textarea
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={inputClasses}
              />
              <Button type="submit" disabled={createTrial.isPending}>
                {createTrial.isPending ? "Creating…" : "Create trial"}
              </Button>
            </form>
          </Card>

          {/* --- Existing trials --------------------------------------------- */}
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
              </Card>
            ))}
          </div>
        </>
      )}

      {/* The patient detail drawer: opens on a row click, holds the follow-up actions.
          Rendered once and driven by `selected` — it returns null while nothing is
          selected. The PHI shown here is nested under detail.application.*. */}
      <Drawer
        open={selected !== null}
        onClose={closeDrawer}
        title={
          selected && (
            <div className="flex items-center gap-2">
              <span className="font-semibold">{selected.application.patient_name}</span>
              <StatusBadge status={selected.status} />
            </div>
          )
        }
      >
        {selected && (
          <div className="space-y-5">
            {/* Hospital comes from the minimized summary, so it's available immediately. */}
            <p className="text-sm text-on-surface-variant">
              Hospital: <strong className="text-on-surface">{selected.hospital}</strong>
            </p>

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
                {/* Contact info (from the full record — nested under .application). */}
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-on-surface">Contact</h3>
                  <p className="text-sm text-on-surface-variant">
                    {detail.application.email}
                  </p>
                  <p className="text-sm text-on-surface-variant">
                    {detail.application.contact}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {detail.application.trial_id
                      ? `Trial #${detail.application.trial_id}`
                      : "No trial linked"}{" "}
                    · Submitted{" "}
                    {new Date(detail.application.created_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Eligibility answers (read-only, nested under .application). */}
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-on-surface">
                    Eligibility answers
                  </h3>
                  {detail.application.answers.length > 0 ? (
                    <ul className="space-y-1 text-sm text-on-surface-variant">
                      {detail.application.answers.map((a) => (
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

            {/* A short status line after an action. */}
            {notice && <p className="text-sm text-on-surface-variant">{notice}</p>}

            {/* Follow-up actions — the only place they appear: move the referral along
                its lifecycle (Contacted / Enrolled / Declined). */}
            <div className="space-y-3 border-t border-outline-variant pt-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() => handleFollowUp(selected.id, "contacted")}
                  disabled={updateReferral.isPending}
                >
                  Mark contacted
                </Button>
                <Button
                  onClick={() => handleFollowUp(selected.id, "enrolled")}
                  disabled={updateReferral.isPending}
                >
                  Mark enrolled
                </Button>
                <Button
                  variant="danger"
                  onClick={() => handleFollowUp(selected.id, "declined")}
                  disabled={updateReferral.isPending}
                >
                  Mark declined
                </Button>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </section>
  );
}

export default NurseDashboard;
