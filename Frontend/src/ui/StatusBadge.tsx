// A colored pill that shows the state of an application, referral, or trial. The
// dashboards print a raw status string today (e.g. "Status: approved"); this turns
// that string into a readable, color-coded badge so a coordinator/nurse/admin can
// scan a list at a glance.
//
// IMPORTANT: the keys below are the ACTUAL status strings the backend stores, taken
// straight from Backend/models.py (the `default=` values) and Backend/schemas.py
// (the Literal[...] sets a coordinator/nurse/admin may set). If the backend adds a
// new status, add it here too. Anything we don't recognise falls back to a neutral
// grey pill (see `FALLBACK`) rather than crashing.
//
//   Applications: new → reviewed → approved | rejected → referred
//   Referrals:    referred → contacted → enrolled | declined
//   Trials:       draft → open | closed
//
// Colors come from the design tokens in tailwind.config.js. The palette has no green
// or amber, so we map by meaning onto the four it does have:
//   primary (teal)   = a positive/active end state (approved, enrolled, open)
//   error   (red)    = a negative/terminal state   (rejected, declined, closed)
//   secondary (blue) = in-progress                  (reviewed, contacted)
//   tertiary (purple)= handed off                   (referred)
//   neutral (grey)   = brand-new / not-yet-started  (new, draft)

import type { ReactNode } from "react";

// One pill style = a Tailwind background + readable text color, plus the human label
// we print (capitalised, since the stored strings are lowercase).
interface Tone {
  label: string;
  classes: string;
}

const NEUTRAL = "bg-surface-container-highest text-on-surface-variant";
const INFO = "bg-secondary-container text-on-secondary";
const HANDOFF = "bg-tertiary-container text-on-tertiary";
const POSITIVE = "bg-primary text-on-primary";
const NEGATIVE = "bg-error text-on-error";

// The exact-string lookup. Keys MUST match the backend's stored values verbatim.
const STATUS_TONES: Record<string, Tone> = {
  // --- Application lifecycle ---
  new: { label: "New", classes: NEUTRAL },
  reviewed: { label: "Reviewed", classes: INFO },
  approved: { label: "Approved", classes: POSITIVE },
  rejected: { label: "Rejected", classes: NEGATIVE },
  // --- Referral lifecycle ("referred" is also the application state after referral) ---
  referred: { label: "Referred", classes: HANDOFF },
  contacted: { label: "Contacted", classes: INFO },
  enrolled: { label: "Enrolled", classes: POSITIVE },
  declined: { label: "Declined", classes: NEGATIVE },
  // --- Trial lifecycle ---
  draft: { label: "Draft", classes: NEUTRAL },
  open: { label: "Open", classes: POSITIVE },
  closed: { label: "Closed", classes: NEGATIVE },
};

// Shown for any status not in the table above — we still render something readable
// (the raw value, neutral grey) instead of breaking the page on an unexpected string.
function fallbackTone(status: string): Tone {
  return { label: status, classes: NEUTRAL };
}

interface StatusBadgeProps {
  // The raw status string from an ApplicationRead / ReferralRead / TrialRead. Typed
  // as `string` (not a union) because the backend's *Read schemas type status as a
  // plain str, and a record can carry any of the three lifecycles' values.
  status: string;
}

function StatusBadge({ status }: StatusBadgeProps): ReactNode {
  const tone = STATUS_TONES[status] ?? fallbackTone(status);
  return (
    <span
      className={
        "inline-flex items-center rounded-pill px-2.5 py-0.5 " +
        "text-xs font-medium " +
        tone.classes
      }
    >
      {tone.label}
    </span>
  );
}

export default StatusBadge;
