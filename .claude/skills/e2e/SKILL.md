---
name: e2e
description: Stage 6 of the build workflow (Explore → Plan → Implement → Review → Test → E2E). Verifies a whole user flow works wired together across modules — frontend, backend, and datastore — not just one module in isolation. Invoke as `/e2e <flow>` (e.g. `/e2e patient-application`) once the modules a flow crosses are each individually done. Runs the real app end-to-end and asserts the seams the per-module tests skip.
---

# E2E — Stage 6 of 6 (Explore → Plan → Implement → Review → Test → E2E)

The user flow to verify end-to-end is: **$ARGUMENTS**
(If empty, ask which flow — or pick the next completed user story from the repo's
roadmap/docs.)

You are in the **E2E** stage. The earlier stages each work on ONE module in
isolation (`/test` even says "stay scoped to `$ARGUMENTS`"). This stage does the
opposite: it proves a **whole user flow works wired together** across every
module it touches. The bugs this stage catches live in the *seams between*
modules — exactly where the per-module stages don't look.

**Write no app code in this stage.** If the flow is broken, report it and route
back to `/review` or `/implement` for the module at fault.

## What to do

1. **Derive the flow from the repo's source of truth — don't invent it.**
   - Read the repo's user stories / acceptance criteria (`CLAUDE.md`, the
     roadmap/design doc, README). A user story *is* an end-to-end flow.
   - For **$ARGUMENTS**, write down the chain of modules it crosses, in order
     (e.g. UI page → API client → route → model → datastore), with `file:line`.

2. **Run the real app — reuse what already launches it.** Don't reinvent launch
   commands. Use the project's documented run command, and lean on the built-in
   `run` / `verify` skills to start the backend, the frontend, and anything else
   the flow needs, the way this project actually starts them.

3. **Drive the flow as a real user would, through the real entry point** (the UI
   if one exists, otherwise the public API). Walk the whole chain once,
   end-to-end.

4. **Assert the seams the per-module tests skip.** These are the point of this
   stage — check whichever apply to this flow:
   - **Cross-origin / transport**: the frontend can actually reach the backend
     (CORS, ports, base URL), not just an in-process test client.
   - **Contract match**: the shape the client sends matches what the server
     expects (field names, encoding — e.g. form vs JSON — auth headers).
   - **Identity carried across calls**: a token/session obtained in one step is
     accepted by the next.
   - **State really changed**: the side effect landed in the datastore and reads
     back correctly.

5. **Test the unhappy path too.** Bad input is rejected with a sensible error the
   user can see, and — where access control applies — an unauthorized actor is
   blocked across the full stack (not just at the route).

## Output — a short end-to-end report
- **Flow & chain**: the user story and the modules it crossed (`file:line`).
- **Walked**: each step → pass/fail with evidence (what you sent, what came back,
  what changed in the datastore).
- **Seams checked**: which cross-module seams held and which broke.
- **Verdict**: ✅ flow works end-to-end and meets its acceptance criteria — or a
  list of what broke, naming the module at fault, routed back to
  `/review <module>` or `/implement <module>`.

## Rules
- **Generic by design.** Discover the stack, run command, and flow from the
  repo's own docs and the `run`/`verify` skills — never hardcode a framework,
  port, or command. This skill must work on any project, like the other stages.
- Verify **real behavior across modules** — don't assert it works without
  running it. In-process unit tests don't count here; the seams are the job.
- Don't fix code in this stage. Report the break and hand off.
