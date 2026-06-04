---
name: implement
description: Stage 3 of the build workflow (Explore → Plan → Implement → Review → Test). Writes the actual code for a module from the agreed plan, following the repo's conventions, then summarizes what changed. Invoke as `/implement <module>` (e.g. `/implement auth`) after `/plan`, when the design is agreed and you want the code written. This stage DOES write app code.
---

# Implement — Stage 3 of 5 (Explore → Plan → Implement → Review → Test)

The module/feature to implement is: **$ARGUMENTS**
(If empty, ask which module. If there's no agreed plan yet, do a quick
`/plan $ARGUMENTS` first — don't build without a plan.)

You are in the **Implement** stage. Unlike the other stages, this one **writes
the real code**.

## What to do

1. **Work from the agreed plan.** Implement exactly what `/plan $ARGUMENTS` laid
   out — same files, same scope. If you must deviate (the plan missed something),
   say so and why before you write it. Don't pull in unrelated work.

2. **Write the code, following the repo's conventions.**
   - Match the existing structure, naming, idioms, and comment density of the
     surrounding code — new code should read like it belongs.
   - Follow the project's instruction files (`CLAUDE.md` etc.) and its established
     patterns (architecture, error handling, data access, security).
   - Respect non-functional requirements already in force (auth, input
     validation, no secrets hardcoded, no sensitive data exposed).

3. **Build the whole slice so it runs.** Don't leave half-wired code — implement
   every piece the plan calls for so the module works end-to-end and is ready for
   `/test`.

4. **Then summarize what changed.** After writing, briefly explain each new
   file/function, anything non-obvious in the approach, and how the new code
   connects to what already existed.

## Output
- The implemented files (written to disk).
- A short **"What I wrote and why"** summary keyed to `file:line`.
- **Next:** "Run `/review $ARGUMENTS` to double-check it, then `/test $ARGUMENTS`."

## Rules
- This stage may write app code — that's intended here, and only here among the
  build stages. (Explore/Plan/Review stay hands-off by default.)
- **Correctness first, cleverness never.** Write the simplest code that satisfies
  the plan.
- Stay scoped to **$ARGUMENTS**. Note anything else that looks broken, but don't
  fix unrelated code here.
- **Confirm before touching sensitive code.** Before writing or changing any code
  that touches authentication, consent, audit logging, RBAC/org-scoping, or
  database migrations, show the diff and ask for explicit confirmation before
  applying it.
