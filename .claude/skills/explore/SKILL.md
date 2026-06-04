---
name: explore
description: Stage 1 of the build workflow (Explore → Plan → Implement → Review → Test). Investigates a feature/module BEFORE any code is written — reads the real project files, locates where the work fits, and produces a short findings brief. Invoke as `/explore <module>` (e.g. `/explore auth`) when starting work on a new feature, route, or area. Read-only: it never writes app code.
---

# Explore — Stage 1 of 5 (Explore → Plan → Implement → Review → Test)

The module/feature to explore is: **$ARGUMENTS**
(If that's empty, ask the user which module/area they want to explore.)

You are in the **Explore** stage. The goal is to *understand before building* —
gather ground truth so the next stage (`/plan`) rests on facts, not assumptions.
**Write no app code in this stage.**

## What to do

1. **Read the source of truth — never trust summaries or memory.**
   - The repo's instruction/convention files (`CLAUDE.md`, `README.md`,
     `ARCHITECTURE.md`, `UI_SPEC.md`) and any roadmap/design doc — to find where
     **$ARGUMENTS** fits and its acceptance criteria (a "done when…" if one is
     defined).
   - The existing code this module touches: entry points, the relevant modules,
     data models, configuration, and any tests already covering the area.
   - Whatever **$ARGUMENTS** depends on, and what depends on it.

2. **Locate the module precisely.** Answer, with `file:line` references:
   - What already exists for this module vs. what's missing?
   - What are its dependencies and dependents?
   - Are there prerequisites that must be in place first?

3. **Surface constraints & unknowns.** Conventions to follow (from the repo's
   instruction files and the patterns already in the code), non-functional
   requirements (security, auth, data handling), and any open questions the user
   must decide before planning.

## Output — a short "Exploration Brief"

Keep it tight (not an essay). End your message with:

- **Module & scope**: what this work covers, and any prerequisite readiness.
- **What exists**: relevant files/modules/routes already present (`file:line`).
- **What's missing**: the gap this module must fill.
- **Constraints & conventions**: rules the plan must respect.
- **Open questions**: anything to confirm with the user before `/plan`.
- **Next**: "Ready for `/plan $ARGUMENTS`."

## Rules
- Read-only. Ground every finding in a file you actually read — no guessing.
- Stay scoped to **$ARGUMENTS**; note adjacent issues but don't chase them here.
