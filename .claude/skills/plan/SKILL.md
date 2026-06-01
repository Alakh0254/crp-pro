---
name: plan
description: Stage 2 of the build workflow (Explore → Plan → Implement → Review → Test). Turns an exploration into a concrete implementation spec — a step-by-step plan, the files to touch, and the approach — but writes NO code itself. Invoke as `/plan <module>` (e.g. `/plan auth`) after `/explore`, when you know what a feature needs and want a build plan. Produces the plan, then hands off to `/implement` to write the code.
---

# Plan — Stage 2 of 5 (Explore → Plan → Implement → Review → Test)

The module/feature to plan is: **$ARGUMENTS**
(If empty, ask which module. If you haven't explored it yet this session, read
the relevant files first — or suggest `/explore $ARGUMENTS`.)

You are in the **Plan** stage. The goal is a clear, agreed build plan that the
next stage (`/implement`) will turn into code. **Plan only — write no code here.**

## What to produce

1. **Restate the goal & acceptance criteria** for **$ARGUMENTS** in one or two
   sentences — what "done" means, taken from the repo's roadmap/docs if defined.

2. **A step-by-step plan** — small, ordered, testable steps. For each step:
   - *What* to do and *which file* it lives in.
   - *Why* it's needed.
   - The **approach**: the function/type signatures, the libraries or modules
     involved, and the shape of the change — enough that `/implement` can write it
     and the user can follow it. Sketches and signatures are fine; full bodies are
     not (that's `/implement`'s job).

3. **New or non-obvious pieces flagged.** If a step introduces something new to
   this codebase (a dependency, a pattern, a config change), call it out briefly.

4. **Conventions to follow.** Point back at the patterns already in the repo and
   its instruction files — match the existing structure, naming, and idioms.

5. **How we'll verify it** — name the check the `/test` stage will run.

## Rules
- **Do NOT write the complete implementation here.** Specs, signatures, and
  approach only — `/implement` writes the actual code. Keeping plan and implement
  separate is what lets the user agree the design before code exists.
- Stay within **$ARGUMENTS** and its scope. Don't pull in unrelated work.
- Keep the plan runnable end-to-end — it should end in something you can start
  and see.

## Output
End with a numbered build checklist for **$ARGUMENTS** and:
"If this plan looks right, run `/implement $ARGUMENTS` and I'll write the code."
