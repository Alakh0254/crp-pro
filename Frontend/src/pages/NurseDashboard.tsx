// The nurse's workspace (Phase 5). It does two jobs:
//   - Follow up: lists referred patients (with their details) and lets the nurse move
//     each referral forward — Contacted / Enrolled / Declined (PATCH /referrals/{id}).
//   - Trials: a small form to create a trial (POST /trials), plus the list of trials.
//
// Server state now comes from TanStack Query hooks (../hooks/queries): `useReferrals`
// and `useTrials` cache the two lists and track loading/error, and the mutations
// invalidate those caches on success so the screen refetches itself. The new-trial
// form fields stay in local useState. This replaces the old useEffect + refresh().

import { useState } from "react";
import {
  useReferrals,
  useTrials,
  useUpdateReferralStatus,
  useCreateTrial,
} from "../hooks/queries";
import { Button, Card, Spinner, StatusBadge } from "../ui";

// `token` is the logged-in nurse's JWT, passed down from StaffHome.
interface NurseDashboardProps {
  token: string | null;
}

function NurseDashboard({ token }: NurseDashboardProps) {
  // The two cached lists + their loading/error flags, from Query.
  const referralsQuery = useReferrals(token);
  const trialsQuery = useTrials(token);
  // The two writes. Each invalidates its list on success so it refetches.
  const updateReferral = useUpdateReferralStatus(token);
  const createTrial = useCreateTrial(token);

  // A short message shown after an action (success or error). Cleared on each new action.
  const [notice, setNotice] = useState("");
  // The new-trial form fields.
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Record follow-up: PATCH the referral's status; Query refetches on success.
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

  const referrals = referralsQuery.data ?? [];
  const trials = trialsQuery.data ?? [];
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

      {/* A short status line after an action. */}
      {notice && <p className="text-sm text-on-surface-variant">{notice}</p>}

      {!isLoading && !isError && (
        <>
          {/* --- Referred patients ------------------------------------------- */}
          <h3 className="text-lg font-semibold text-on-surface">Referred patients</h3>
          {referrals.length === 0 && (
            <p className="text-sm text-on-surface-variant">No referrals yet.</p>
          )}

          <div className="space-y-4">
            {referrals.map((ref) => (
              <Card key={ref.id} className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-on-surface">
                    <span className="font-semibold">
                      #{ref.id} — {ref.application.patient_name}
                    </span>{" "}
                    <span className="text-on-surface-variant">
                      ({ref.application.email}, {ref.application.contact})
                    </span>
                  </p>
                  <StatusBadge status={ref.status} />
                </div>
                <p className="text-sm text-on-surface-variant">
                  Hospital: <strong className="text-on-surface">{ref.hospital}</strong>
                </p>

                {/* The eligibility answers, for follow-up context. */}
                {ref.application.answers.length > 0 && (
                  <ul className="space-y-1 text-sm text-on-surface-variant">
                    {ref.application.answers.map((a) => (
                      <li key={a.id}>
                        {a.question} — <em className="text-on-surface">{a.answer}</em>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Follow-up buttons: move the referral along its lifecycle. */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => handleFollowUp(ref.id, "contacted")}
                    disabled={updateReferral.isPending}
                  >
                    Mark contacted
                  </Button>
                  <Button
                    onClick={() => handleFollowUp(ref.id, "enrolled")}
                    disabled={updateReferral.isPending}
                  >
                    Mark enrolled
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => handleFollowUp(ref.id, "declined")}
                    disabled={updateReferral.isPending}
                  >
                    Mark declined
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* --- Create a trial ---------------------------------------------- */}
          <h3 className="text-lg font-semibold text-on-surface">Create a trial</h3>
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
    </section>
  );
}

export default NurseDashboard;
