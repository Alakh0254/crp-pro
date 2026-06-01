---
name: test
description: Stage 5 of the build workflow (Explore → Plan → Implement → Review → Test). Verifies a finished module actually works — by running it and by automated tests where they exist. Invoke as `/test <module>` (e.g. `/test auth`) after `/review` passes, to confirm a feature is done. A feature is done when it runs correctly and rejects bad/unauthorized input.
---

# Test — Stage 5 of 5 (Explore → Plan → Implement → Review → Test)

The module/feature to test is: **$ARGUMENTS**
(If empty, ask which module.)

You are in the **Test** stage. The code for **$ARGUMENTS** is written and
reviewed; now prove it works using the project's own test approach and tooling.

## Definition of done
A feature is done when it: **runs and behaves correctly on the happy path**,
**works from any UI/entry point that exists for it**, and **rejects bad or
unauthorized input**. Test all three angles.

## What to do

1. **Run it for real first.**
   - Start the app/service using the project's documented run command, or invoke
     the function/CLI directly.
   - Exercise each entry point of **$ARGUMENTS**:
     - **Happy path** — valid input → expected result and side effects.
     - **Failure path(s)** — bad input (expect a validation error), and where
       access control applies, unauthorized access (expect rejection).
   - Confirm any side effects actually happened (data written, state changed).

2. **Automated tests.** Use the project's existing test framework and run the
   relevant tests. If the project has a test suite and this module lacks
   coverage, add focused tests — one per behavior: a happy path plus at least one
   failure. Show the user how to run them and how to read a failure.

3. **Report results honestly.** State what passed, what failed (with the actual
   output/exit code/status), and anything skipped. Never claim green if it isn't.

## Output
- A short checklist: each case tested → pass/fail with evidence.
- If all pass: "✅ **$ARGUMENTS** meets its acceptance criteria. Consider
  committing this work, then `/explore` the next module."
- If anything fails: list the failures and route back to `/review $ARGUMENTS`.

## Rules
- Run/verify real behavior — don't assert it works without evidence.
- Stay scoped to **$ARGUMENTS**; note unrelated breakage but don't fix it here.
