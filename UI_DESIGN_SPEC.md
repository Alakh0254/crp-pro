# UI Design Spec — Clinical Trial Platform

> A screen-by-screen layout guide for **CRP-Pro**, written to hand to an AI UI
> tool (e.g. **Stitch**). Each screen has: its purpose, a text wireframe, the
> components it needs, its states, and a **ready-to-paste prompt**.
>
> Order matches the build roadmap (`SDLC_PLAN.md`): Patient → Login →
> Coordinator → Nurse → Admin. Design the shared **style system first**, then
> generate screens so they all match.

---

## 0. Shared style system (paste this FIRST in Stitch)

Set the visual language once, then ask for each screen "in the same style".

> **App:** A clinical trial platform connecting patients to medical trials.
> Two audiences: **patients** (public, anxious, non-technical) and **clinical
> staff** (coordinators, nurses, admins working all day in dashboards).
>
> **Tone:** Calm, trustworthy, clinical, reassuring. Healthcare-grade. Never
> playful or flashy. Privacy-respecting (this is sensitive medical data).
>
> **Visual style:**
> - Clean, lots of whitespace, uncluttered.
> - Primary color: medical teal `#0E7C86` (calm, clinical). Accent: blue `#2563EB`.
> - Neutrals: white background `#FFFFFF`, surfaces `#F8FAFC`, text `#0F172A`, muted `#64748B`.
> - Status colors: new = blue, eligible/approved = green `#16A34A`, rejected = red `#DC2626`, referred = purple `#7C3AED`, pending = amber `#D97706`.
> - Typography: Inter (or system sans-serif). Large readable body text. Clear hierarchy.
> - Components: rounded cards (8px radius), soft shadows, pill-shaped status badges, generous touch targets.
> - Accessibility: WCAG AA contrast, visible focus states, labels on every field.
> - Responsive: patient pages mobile-first; staff dashboards desktop-first (work on a table/grid layout).

**Status badge legend (reused everywhere):**

| Status | Color | Meaning |
|---|---|---|
| `new` | blue | Just submitted, not yet reviewed |
| `eligible` / `approved` | green | Passed coordinator review |
| `rejected` | red | Did not qualify |
| `referred` | purple | Sent to a hospital |
| `pending` | amber | Awaiting action |

---

## SCREEN 1 — Patient Application Form  *(public, Phase 2 — already built)*

**Purpose:** A member of the public applies to a trial. Two steps (a wizard):
basic info, then an eligibility questionnaire. One submit at the end.

**Wireframe**
```
┌───────────────────────────────────────────┐
│            Clinical Trial Application       │   ← centered, max-width ~520px
│            ● ─── ○   Step 1 of 2            │   ← progress indicator
├───────────────────────────────────────────┤
│  STEP 1: Your details                       │
│   Full name      [____________________]     │
│   Email          [____________________]     │
│   Contact number [____________________]     │
│                                             │
│   (inline error text if incomplete)         │
│                          [   Next →   ]     │
└───────────────────────────────────────────┘

STEP 2 (same card, after Next):
┌───────────────────────────────────────────┐
│  ● ─── ●   Step 2 of 2                       │
│  Eligibility questions                       │
│   What is your age?            [_________]   │
│   Any chronic conditions?      [_________]   │
│   Currently taking meds?       [_________]   │
│                                              │
│   [ ← Back ]            [ Submit application ]│
└───────────────────────────────────────────┘

SUCCESS state (replaces form):
┌───────────────────────────────────────────┐
│   ✓  Thank you!                              │
│   Your application was submitted.            │
│   Reference #1042                            │
└───────────────────────────────────────────┘
```

**Components:** centered card, 2-step progress indicator, labeled text inputs,
primary/secondary buttons, inline validation message, success panel with
reference number, error banner.

**States:** step 1, step 2, submitting (button shows "Submitting…", disabled),
success, error.

**Stitch prompt**
> A public, mobile-first **2-step patient application form** for a clinical
> trial platform, in the shared style. Centered card, max-width ~520px.
> **Step 1:** title "Your details", a 2-dot progress indicator showing "Step 1
> of 2", three labeled inputs (Full name, Email, Contact number), an inline
> red error line, and a primary "Next →" button bottom-right.
> **Step 2:** progress shows "Step 2 of 2", heading "Eligibility questions",
> three short-answer questions each with a text input, a secondary "← Back"
> button and a primary "Submit application" button.
> Also design a **success state**: a green check, "Thank you! Your application
> was submitted.", and a reference number like "#1042". And an **error state**:
> a red banner "Something went wrong. Please try again." Reassuring, clinical, calm.

---

## SCREEN 2 — Staff Login  *(Phase 3)*

**Purpose:** Coordinators, nurses, and admins sign in. Patients never see this.

**Wireframe**
```
┌─────────────────────────────────────┐
│              🏥  CRP-Pro              │
│           Staff sign in               │
├───────────────────────────────────────┤
│   Email     [____________________]    │
│   Password  [____________________] 👁  │
│                                       │
│   (error: "Invalid email or password")│
│              [   Sign in   ]          │
│                                       │
│   For staff only. Patients apply here →│
└───────────────────────────────────────┘
```

**Components:** logo/wordmark, centered login card, email + password inputs
(password show/hide toggle), primary "Sign in" button, error banner, small
link back to the public application page.

**States:** default, signing in (button loading), invalid credentials (error
banner), locked/inactive account message.

**Stitch prompt**
> A **staff login screen** for the clinical trial platform, in the shared
> style. Centered card on a calm `#F8FAFC` background, small hospital logo and
> "CRP-Pro" wordmark on top, subtitle "Staff sign in". Email field, password
> field with a show/hide eye toggle, a primary full-width "Sign in" button, an
> error banner state reading "Invalid email or password", and a small muted
> link "Patients apply here →". Trustworthy and secure feel.

---

## SHARED — Staff dashboard shell  *(used by Screens 3–8)*

All staff screens share one layout: a left sidebar + top bar + content area.
The sidebar's menu items change per role.

**Wireframe**
```
┌────────────┬──────────────────────────────────────────────┐
│  CRP-Pro   │  Top bar:  Page title        🔔   Jane (Coord) ▾│
│            ├──────────────────────────────────────────────┤
│ ▸ Nav item │                                                │
│ ▸ Nav item │            ← role's content goes here →         │
│ ▸ Nav item │                                                │
│            │                                                │
│  ───────── │                                                │
│  Sign out  │                                                │
└────────────┴──────────────────────────────────────────────┘
```

**Stitch prompt (shell)**
> A **dashboard shell** for clinical staff in the shared style: a fixed left
> sidebar (~240px) with the "CRP-Pro" logo, a vertical nav menu, and a "Sign
> out" item pinned at the bottom; a top bar with the current page title on the
> left and a user chip (name + role + avatar, dropdown) plus a notifications
> bell on the right; and a light content area. Desktop-first. Show the same
> shell for coordinator, nurse, and admin — only the nav items differ.

---

## SCREEN 3 — Coordinator Dashboard (applications list)  *(Phase 4)*

**Purpose:** The coordinator reviews incoming patient applications and acts on
them. This is their home screen.

**Sidebar nav:** Applications · Referrals · *(Sign out)*

**Wireframe**
```
 Top bar: "Applications"                         Jane (Coordinator) ▾
┌──────────────────────────────────────────────────────────────┐
│  Filter: [All ▾]  [New] [Eligible] [Rejected]    🔍 Search…    │
├──────────────────────────────────────────────────────────────┤
│  ID  │ Patient name │ Contact      │ Submitted   │ Status │ ▸ │
│ #104 │ R. Sharma    │ r@mail / 99..│ 2h ago      │ ●new   │ → │
│ #103 │ A. Khan      │ a@mail / 98..│ yesterday   │ ●elig. │ → │
│ #102 │ M. Patel     │ m@mail / 97..│ 2 days ago  │ ●refer.│ → │
│  …   │              │              │             │        │   │
├──────────────────────────────────────────────────────────────┤
│  Showing 12 of 12         ◂ 1 2 3 ▸                           │
└──────────────────────────────────────────────────────────────┘
   Empty state: "No applications yet."
```

**Components:** filter tabs / status dropdown, search box, data table (ID,
patient, contact, submitted-time, status badge), row click → detail, pagination,
empty + loading (skeleton rows) states.

**Stitch prompt**
> A **coordinator dashboard** in the shared dashboard shell. Sidebar items:
> "Applications" (active), "Referrals". Main area: a heading "Applications", a
> row of status filter tabs (All / New / Eligible / Rejected) and a search box,
> then a data table with columns: ID, Patient name, Contact, Submitted (relative
> time), and a colored Status badge, with a chevron to open each row. Include
> pagination, a loading skeleton state, and an empty state "No applications yet."
> Clean, scannable, desktop-first.

---

## SCREEN 4 — Application Detail / Review  *(Phase 4)*

**Purpose:** Open one application, read the eligibility answers, then approve,
reject, or refer.

**Wireframe**
```
 ← Back to applications                           #104  ●new
┌──────────────────────────────────────────────────────────────┐
│  R. Sharma                                                     │
│  📧 r@mail.com    📞 9900112233    Submitted 2h ago            │
├──────────────────────────────────────────────────────────────┤
│  Eligibility answers                                           │
│   • What is your age?               → 34                       │
│   • Any chronic conditions?         → None                     │
│   • Currently taking medications?   → No                       │
├──────────────────────────────────────────────────────────────┤
│  Decision                                                      │
│   [ ✕ Reject ]   [ ✓ Approve eligible ]   [ → Refer to hosp. ] │
└──────────────────────────────────────────────────────────────┘
```

**Components:** back link, patient header (name + contact + status badge),
eligibility Q&A list, action bar (Reject / Approve / Refer), confirmation on
each action, success toast.

**States:** loading, loaded, action-in-progress, action-success (status badge
updates), already-decided (actions disabled with a note).

**Stitch prompt**
> An **application detail / review screen** for a coordinator, shared style.
> A back link to the list, a header with the patient's name, a colored status
> badge, email, phone, and submitted time. Below, a card "Eligibility answers"
> showing each question and the patient's answer as a clean Q→A list. At the
> bottom, a decision action bar with three buttons: a red "Reject", a green
> "Approve eligible", and a purple "Refer to hospital". Show a confirmation and
> a success toast. Calm, focused, clinical.

---

## SCREEN 5 — Refer to Hospital (modal/form)  *(Phase 4)*

**Purpose:** When referring an approved patient, pick the hospital and confirm.

**Wireframe**
```
        ┌─────────────────────────────────┐
        │  Refer R. Sharma (#104)       ✕ │
        │  Hospital   [ Select hospital ▾]│
        │  Note (opt) [_________________] │
        │                                 │
        │     [ Cancel ]   [ Confirm → ]  │
        └─────────────────────────────────┘
```

**Stitch prompt**
> A **"Refer to hospital" modal dialog** over the application detail screen,
> shared style. Title "Refer R. Sharma (#104)", a hospital dropdown, an optional
> note textarea, and Cancel / "Confirm referral" buttons. Compact and clear.

---

## SCREEN 6 — Nurse Dashboard (referrals + follow-up)  *(Phase 5)*

**Purpose:** A nurse sees patients referred to their hospital and records
follow-up.

**Sidebar nav:** Referrals · Trials · *(Sign out)*

**Wireframe**
```
 Top bar: "Referred patients"                       Sam (Nurse) ▾
┌──────────────────────────────────────────────────────────────┐
│  Patient    │ Hospital      │ Referred by │ Status   │ Action │
│  R. Sharma  │ City General  │ Jane        │ ●pending │ Follow │
│  A. Khan    │ St. Mary's    │ Jane        │ ●done    │ View   │
├──────────────────────────────────────────────────────────────┤
│  Empty: "No referrals assigned yet."                          │
└──────────────────────────────────────────────────────────────┘
  "Follow" opens a panel: contact log + [Mark followed up ✓]
```

**Components:** referrals table, follow-up side panel/drawer (notes + "mark
followed up"), status badges, empty/loading states.

**Stitch prompt**
> A **nurse dashboard** in the shared shell. Sidebar: "Referrals" (active),
> "Trials". A table of referred patients with columns Patient, Hospital,
> Referred by, Status badge (pending/done), and a "Follow up" action that opens
> a side drawer with a notes textarea and a "Mark followed up" button. Include
> an empty state "No referrals assigned yet." Practical and efficient.

---

## SCREEN 7 — Create Trial (form)  *(Phase 5)*

**Purpose:** A nurse (or admin) creates a new clinical trial.

**Wireframe**
```
 Top bar: "New trial"
┌──────────────────────────────────────────────┐
│  Title        [______________________________]│
│  Description  [                              ] │
│               [                              ] │
│  Status       [ Draft ▾ ]                      │
│                                                │
│                       [ Cancel ]  [ Create ]   │
└──────────────────────────────────────────────┘
```

**Stitch prompt**
> A **"Create trial" form** in the shared dashboard shell. Fields: Title (text),
> Description (multiline), Status (dropdown: Draft / Recruiting / Closed). Cancel
> and "Create trial" buttons. Below the form, optionally a list/table of existing
> trials with their status badges. Clean and simple.

---

## SCREEN 8 — Admin Dashboard + Manage Accounts  *(Phase 6)*

**Purpose:** An admin oversees the system and creates coordinator/nurse accounts.

**Sidebar nav:** Overview · Staff accounts · Trials · *(Sign out)*

**Wireframe**
```
 Top bar: "Overview"                                Admin ▾
┌──────────────────────────────────────────────────────────────┐
│  [ 128 applications ] [ 14 referrals ] [ 6 trials ] [ 9 staff ]│  ← stat cards
├──────────────────────────────────────────────────────────────┤
│  Staff accounts                          [ + New account ]    │
│   Name      │ Email          │ Role        │ Active │ Action  │
│   Jane D.   │ jane@clinic    │ Coordinator │  ✓     │ Disable │
│   Sam P.    │ sam@clinic     │ Nurse       │  ✓     │ Disable │
└──────────────────────────────────────────────────────────────┘

 + New account modal:
   Name [____]  Email [____]  Role [ Coordinator ▾ ]
   Temp password [____]            [ Cancel ] [ Create ]
```

**Components:** stat/summary cards row, staff table (name, email, role badge,
active toggle, enable/disable), "New account" modal (name, email, role select,
temp password), trials oversight link.

**Stitch prompt**
> An **admin dashboard** in the shared shell. Sidebar: "Overview" (active),
> "Staff accounts", "Trials". Top: a row of four summary stat cards
> (Applications, Referrals, Trials, Staff). Below: a "Staff accounts" section
> with a "+ New account" button and a table (Name, Email, Role badge, Active
> status, Enable/Disable action). Also design a **"New account" modal** with
> Name, Email, Role dropdown (Coordinator/Nurse), and a temporary password
> field. Authoritative but clean.

---

## Cross-cutting states to ask Stitch for (every screen)

When generating any screen, also request these — they're where real apps live:
- **Loading** — skeleton rows / spinners, not a blank page.
- **Empty** — a friendly line + (where useful) a call to action.
- **Error** — a red banner with a retry, not a crash.
- **Disabled / no-permission** — greyed actions a role isn't allowed to take.
- **Mobile** — at least the patient form must work well on a phone.

---

## Suggested order to generate in Stitch

1. Paste the **style system** (Section 0) so everything matches.
2. Screen 1 (Patient form) — you can compare it to what's already built.
3. Screen 2 (Login).
4. The **dashboard shell**, then Screens 3–4–5 (Coordinator).
5. Screens 6–7 (Nurse).
6. Screen 8 (Admin).

Keep the generated designs as a reference; we then build each one in React,
phase by phase, matching the layout here.
```
