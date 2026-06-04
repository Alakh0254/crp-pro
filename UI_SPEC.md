# UI Specification — CRP-Pro

> Full UI spec: public patient site, the three staff dashboards, login pages, every
> button, and which fields are mandatory. Pairs with **ARCHITECTURE.md** (system/data/
> security) and **CLAUDE.md** (rules/conventions). Replace `CRP-Pro` / sample copy.
>
> **Multi-trial note:** the platform hosts many trials. The landing page is a **reusable
> template** rendered per trial from the trial's data — never hardcode one trial's copy.

---

## 1. Design system

### 1.1 Color tokens
| Token | Hex | Usage |
|---|---|---|
| Primary Blue | `#1A5276` | Nav bar, hero overlay, headings, primary buttons |
| Primary Blue Light | `#D6EAF8` | Card backgrounds, hover, info highlights |
| Teal Green | `#148F77` | Subheadings, success icons, timeline nodes |
| Teal Green Light | `#D1F2EB` | Eligibility "inclusion" card background |
| CTA Orange | `#E67E22` | Primary call-to-action buttons, map pins |
| CTA Orange Light | `#FDEBD0` | Button hover, form highlight |
| Alert Red | `#CB4335` | Required asterisks, errors, exclusion icons |
| Alert Red Light | `#FADBD8` | Error backgrounds, exclusion cards |
| Success Green | `#27AE60` | Checkmarks, form success, status badges |
| Success Green Light | `#D5F5E3` | Success notification background |
| Dark Text | `#1C2833` | Page title, footer background |
| Body Text | `#2C3E50` | Paragraphs, form labels |
| Muted Gray | `#7F8C8D` | Captions, disclaimers, timestamps |
| Border Gray | `#BDC3C7` | Card borders, input outlines, table lines |
| Light Background | `#F8F9FA` | Alternating section backgrounds |
| White | `#FFFFFF` | Default background, card surfaces |

### 1.2 Typography & layout
- Sans-serif system stack; H1 ~32–40px, H2 ~24–28px, body 16px, caption 13–14px.
- 12-column responsive grid; breakpoints: mobile ≤640, tablet 641–1024, desktop >1024.
- Spacing scale: 4 / 8 / 16 / 24 / 32 / 48 / 64.
- Buttons: primary = CTA Orange, secondary = Primary Blue outline, destructive = Alert Red, disabled = Border Gray. Min touch target 44px.

### 1.3 Status badge colors (applications)
`submitted` = Muted Gray · `approved` = Teal Green · `rejected` = Alert Red ·
`referred` = Primary Blue · `in_follow_up` = CTA Orange · `enrolled` = Success Green ·
`declined` / `lost` = Muted Gray (outlined).

### 1.4 Accessibility (mandatory)
WCAG 2.1 AA contrast; visible focus rings; full keyboard nav; labels tied to inputs;
errors announced via `aria-live`; alt text on imagery. Applies to public + dashboards.

---

## 2. Public site (`patient-web`) — no login

### 2.1 Trials listing page (home)  `/`
The entry for direct/organic visitors (ads usually deep-link to a trial page).

- **Header bar:** logo (left); links — *Browse Trials*, *How It Works*, *FAQ*, *Contact*.
- **Hero strip:** headline + one-line value prop + search field.
- **Filters row:** Condition, Location (ZIP + radius), Trial status (recruiting). Filters are optional.
- **Trial cards grid** — one card per active trial, each showing:
  - Trial title, short description, condition tag, location(s), status badge ("Recruiting").
  - Button: **"View Trial"** → trial detail page.
- **Empty state:** "No trials match your filters" + clear-filters button.
- **Footer:** see §2.6.

### 2.2 Trial detail / landing page template  `/trials/{slug}`
This is the ad destination. All content is rendered from trial data. Sections top→bottom:

| # | Section | Contents | Button(s) |
|---|---|---|---|
| 1 | **Hero** | Background image + blue→teal gradient overlay, headline, subheadline | **"Check Your Eligibility"** (scrolls to screener) |
| 2 | **Study Overview** | What the study is, purpose, what participation involves | — |
| 3 | **Quick Stats** | Phase, duration, # visits, compensation (if any) as stat tiles | — |
| 4 | **Eligibility** | Two cards: *You may qualify if…* (Teal Light) and *You may not qualify if…* (Red Light) | **"Check Your Eligibility"** |
| 5 | **Treatment / Study Arms** | Plain-language description of arms | — |
| 6 | **Visit Schedule** | Timeline of visits | — |
| 7 | **Investigators / Site Team** | Names, credentials, photos | — |
| 8 | **Site Locations** | Map + list of participating sites | **"Find a Site Near You"** |
| 9 | **FAQ** | Accordion (expand/collapse) | — |
| 10 | **Enrollment / Application** | The form (§2.4) preceded by the eligibility screener (§2.3) | **"Submit My Information"** |
| 11 | **Footer** | §2.6 | — |

Sticky secondary CTA ("Check Your Eligibility") on scroll for mobile.

### 2.3 Eligibility pre-screener (in-page, before the form)
- Rendered from the trial's **data-driven** `eligibility_schema` (no hardcoding).
- Question types: single-select, multi-select, yes/no, number (e.g. age/BMI), date.
- Logic: each answer maps to pass / fail / neutral; conditional follow-ups allowed.
- **Outcomes:**
  - *Likely eligible* → reveal/enable the application form (§2.4).
  - *Likely not eligible* → polite message; do **not** force a contact capture. Offer "browse other trials". (Do not store health answers if no consent/contact follows — see CLAUDE.md PHI rules.)
  - *Needs review* → allow them to submit; coordinator decides.
- Progress indicator; Back/Next buttons; one question or short group per step.

### 2.4 Application form
**Field table (this is the mandatory-options source of truth for the public form):**

| Field | Type | Validation | Required |
|---|---|---|---|
| Full Name | Text | Min 2 characters | **Yes** |
| Email Address | Email | Valid email format | **Yes** |
| Phone Number | Tel | E.164 with country code | **Yes** |
| Date of Birth | Date picker | Age range check (per trial, e.g. 18–75) | **Yes** |
| ZIP / Postal Code | Text | Used for site matching | **Yes** |
| Preferred Contact Method | Radio | Phone / Email / Either | **Yes** |
| (Trial-specific) e.g. Current Medications | Multi-select | Pre-populated list | No |
| How Did You Hear About Us? | Single-select | Referral-source tracking | No |
| **Consent Checkbox** | Checkbox | **Must be checked to submit** | **Yes** |

- **Consent checkbox label (template):** confirms the person is of eligible age, consents
  to being contacted by the study team about this trial, and understands that submitting
  does **not** enroll them. Store the exact version shown (see ARCHITECTURE.md consent rules).
- **Submit button:** **"Submit My Information"** (CTA Orange). Disabled until all required
  fields valid + consent checked.
- **Disclaimer below form:** IRB approval / protocol #, voluntary participation, not medical
  advice, ClinicalTrials.gov identifier — all pulled from trial data.
- **Inline validation:** required fields marked with a red asterisk; errors shown per-field
  with `aria-live`; no PHI echoed in error text.

### 2.5 Confirmation state  `/trials/{slug}/thank-you`
- Success panel (Success Green): "Thank you — the study team will contact you via {method}."
- No account, no login. Optional: link back to browse other trials.

### 2.6 Footer (all public pages)
Four columns: **About** · **Quick Links** (About the Study, Eligibility, Study Locations,
FAQ, Contact) · **Legal** (Privacy Policy, Terms, Cookie Preferences, Accessibility,
**HIPAA Notice**) · **Contact** (phone, email, hours). Bottom bar: copyright + ClinicalTrials.gov ID.

---

## 3. Login page (`dashboard-web`) — one, shared by all staff roles

A single route: `/login`. The account's role (from the DB, verified server-side) decides which dashboard the user lands on after authentication — not which URL they used.

**The login page contains:**
- Heading (e.g. "Staff Login").
- **Email** field — required, valid email.
- **Password** field — required, masked, show/hide toggle.
- (If MFA enabled) **MFA code** step after password — 6-digit, required.
- **Button: "Log In"** (primary). Disabled until both fields filled.
- "Forgot password?" link → reset flow.
- **No "Sign up" / "Create account"** — staff accounts are created by an Admin only.

**Behavior & states:**
- Correct credentials → go to the dashboard for that account's role.
- Wrong credentials → generic *"Invalid credentials"* (never reveal whether the account exists or its role).
- Rate-limited / locked out after N failures → "Too many attempts, try again later."
- Loading state on the button during submit.

---

## 4. Coordinator dashboard

**Layout:** left sidebar (nav) + top bar (org name, user menu, logout) + main content.
**Sidebar nav:** Leads (default), My Referrals, (optional) Trials (read-only), Profile.

### 4.1 Lead inbox (default screen)
- **Table of new/active leads** (org-scoped). Columns: Patient Name, Trial, Status badge,
  Submitted date, Eligibility result, Last action. Auto-updates as new submissions arrive.
- **Filters:** status, trial, date range. **Search** by name.
- **Row click → opens the detail drawer** (§4.2). The list view itself shows **no action
  buttons** — actions live in the drawer.
- States: empty ("No new leads"), loading skeleton, error retry.

### 4.2 Patient detail drawer (opens on row click)
Slides in from the right; the only place Coordinator actions appear.
- **Top:** patient name, status badge, trial.
- **Sections:** Contact info, Eligibility answers (read), Consent record (version + timestamp), Activity/audit timeline.
- **Action buttons (visible only here):**
  - **"Approve Eligibility"** (Success Green) → status `approved`.
  - **"Reject"** (Alert Red) → requires a reason; status `rejected`.
  - **"Refer to Nurse"** (Primary Blue) → opens nurse picker (§4.3); enabled only after approval.
  - **"Send SMS"** / **"Contact Patient"** (secondary) → opens compose modal (§4.4).
- Every open of this drawer = a PHI-access audit entry.

### 4.3 Refer-to-Nurse modal
- **Nurse select** (dropdown of org's nurses) — **required**.
- Optional note to nurse.
- Buttons: **"Refer"** (primary) · **"Cancel"**. On confirm → status `referred`, nurse notified.

### 4.4 Send-message / contact modal
- **Channel** radio: SMS / Email — required.
- **Message** textarea — required; template picker optional.
- Buttons: **"Send"** (primary) · **"Cancel"**. Send is queued (worker), logged, audited. Keep PHI out of message bodies where possible.

---

## 5. Nurse dashboard

**Layout:** same shell. **Sidebar nav:** Referred Patients (default), Trials, Create Trial, Profile.

### 5.1 Referred patients queue (default)
- **Table** of patients referred to this nurse. Columns: Name, Trial, Status, Referred date, Last follow-up, Next action.
- Filters (status, trial), search by name.
- **Row click → patient detail panel** (§5.2).

### 5.2 Patient detail + follow-up panel
- Same read sections as §4.2 (contact, eligibility, consent, audit timeline).
- **Follow-up log:** list of prior contacts (channel, outcome, date, by whom).
- **Action buttons:**
  - **"Log Follow-up"** → modal (§5.3).
  - **"Send SMS"** / **"Call"** / **"Email"** (logs the outreach).
  - **"Mark Enrolled"** (Success Green) → status `enrolled`.
  - **"Mark Declined" / "Mark Lost"** (secondary/destructive) with reason.

### 5.3 Log follow-up modal
| Field | Type | Required |
|---|---|---|
| Channel | Radio (Call / SMS / Email) | **Yes** |
| Outcome | Select (Reached / No answer / Left message / Scheduled / Other) | **Yes** |
| Notes | Textarea | No (⚠️ treated as PHI) |
| Next follow-up date | Date | No |

Buttons: **"Save"** · **"Cancel"**.

### 5.4 Create trial (shared form — see §7)

---

## 6. Admin dashboard

**Layout:** same shell. **Sidebar nav:** Overview (default), Users, Trials, Coordinators view, Nurses view, Profile.

### 6.1 Overview
- **Metric tiles:** active trials, new leads (period), approved, referred, enrolled, conversion rate.
- **Funnel chart:** views → submitted → approved → referred → enrolled.
- Recent-activity feed (org-scoped).

### 6.2 User management  `/admin/users`
- **Table:** Name, Email, Role, Status (active/disabled), Last login.
- Button: **"Add User"** → create-user modal (§6.3).
- Row actions: **"Edit"**, **"Disable"/"Enable"**, **"Reset Password"**. (No hard delete — disable instead, for audit integrity.)

### 6.3 Create / edit user modal
| Field | Type | Required |
|---|---|---|
| Full Name | Text | **Yes** |
| Email | Email (unique in org) | **Yes** |
| Role | Select (Coordinator / Nurse) | **Yes** |
| Temporary password / invite | Auto-generate or email invite | **Yes (one of)** |
| MFA required | Toggle | default on |

Buttons: **"Create User"** · **"Cancel"**. Admin cannot create another Admin from here unless explicitly allowed — `TODO: confirm who creates Admins`.

### 6.4 Oversight views (Coordinators / Nurses)
- Read access to the org's lead and referral data as those roles see it.
- **Minimum-necessary:** default to an overview without individual PHI; drilling into a
  specific patient reveals PHI **and writes an audit entry**. (See ARCHITECTURE.md §6.)

### 6.5 Trials management (shared list + create form §7).

---

## 7. Trial creation form (Nurse & Admin)

| Field | Type | Required |
|---|---|---|
| Trial title | Text | **Yes** |
| Condition / therapeutic area | Select/tags | **Yes** |
| Short description (card) | Text | **Yes** |
| Full description / overview | Rich text | **Yes** |
| Status | Select (Draft / Recruiting / Paused / Closed) | **Yes** |
| Site location(s) | Repeatable (name, address) | **Yes (≥1)** |
| Age range | Number min/max | **Yes** |
| **Eligibility questionnaire** | Question builder → `eligibility_schema` JSONB | **Yes (≥1 question)** |
| IRB protocol # | Text | **Yes** |
| ClinicalTrials.gov ID | Text | No |
| Compensation details | Text | No |
| Hero image | Upload | No |

- **Eligibility builder:** add questions (type, options, pass/fail/neutral mapping, conditional logic). This drives the public screener (§2.3) directly.
- Buttons: **"Save Draft"** · **"Publish"** (sets Recruiting) · **"Cancel"**.
- A trial cannot be published without ≥1 site, an age range, ≥1 eligibility question, and an IRB protocol #. Optionally gate publish behind an **"IRB-approved ad creative"** confirmation.

---

## 8. Mandatory fields — consolidated reference

- **Public application:** Full Name, Email, Phone, Date of Birth, ZIP, Preferred Contact Method, **Consent checkbox**. (Trial-specific medical questions and "how did you hear" are optional.)
- **Eligibility screener:** every question marked required in the trial's schema must be answered before submit.
- **Login:** Email, Password (+ MFA code if enabled).
- **Refer to Nurse:** Nurse selection.
- **Send message:** Channel, Message.
- **Log follow-up:** Channel, Outcome.
- **Create user:** Full Name, Email, Role, password/invite.
- **Create trial:** Title, Condition, Short + Full description, Status, ≥1 Site, Age range, ≥1 Eligibility question, IRB protocol #.

---

## 9. Shared UI patterns (all dashboards)

- **App shell:** persistent sidebar + top bar (org name, role label, user menu w/ Logout).
- **Tables:** sortable headers, pagination, per-row status badge, empty/loading/error states.
- **Drawers vs modals:** record detail = right-side drawer; quick actions/forms = centered modal.
- **Destructive actions** (reject, disable, mark lost) require confirmation + reason.
- **Toasts** for success/error after an action; never include PHI in toast text.
- **Loading:** skeletons for lists, spinners on buttons during async.
- **Session:** idle timeout → auto-logout (PHI screens); re-auth prompt.
- **Responsive:** sidebar collapses to a drawer on mobile; tables become stacked cards.

---

## 10. Open UI decisions (`TODO`)
- MFA in MVP or later (affects login flow §3).
- Who can create Admin accounts (§6.3).
- How much PHI Admin oversight shows by default (§6.4).
- Exact landing-page sections that are mandatory vs optional per trial.
- Branding (logo, font choice) and whether each org can theme its trial pages.
