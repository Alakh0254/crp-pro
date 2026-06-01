---
name: project
description: Load full context for the current repository — what it is, its stack, structure, and current build state — by reading the repo's own docs and source. Invoke at the start of a working session so the architecture never has to be re-explained.
---

# Project Context Loader

When this skill runs, build an accurate picture of the repository you are working
in by reading its actual files — never rely on memory or a stale summary. The
goal is to load enough context that the user doesn't have to re-explain the
architecture, stack, or where things stand.

## What to read (in priority order, whatever exists)
1. **Instruction / convention files** — `CLAUDE.md`, `AGENTS.md`, `.cursorrules`,
   `CONTRIBUTING.md`. These override defaults; follow them exactly.
2. **Overview docs** — `README.md`, `docs/`, any architecture or design doc, and
   any roadmap/plan file (e.g. `*PLAN*.md`, `ROADMAP.md`, `TODO.md`). A roadmap,
   if present, is the source of truth for what to build next.
3. **Manifests** — `package.json`, `pyproject.toml`, `requirements.txt`,
   `go.mod`, `Cargo.toml`, etc. — to learn the stack, scripts, and dependencies.
4. **Entry points & structure** — the main app entry, the top-level source dirs,
   and how the pieces are wired together.
5. **Git state** — recent commits and `git status` to see what's in flight.

## What to produce
A short, accurate briefing:
- **What it is** — one or two sentences on the project's purpose.
- **Stack** — languages, frameworks, datastore, build tooling (from manifests).
- **Structure** — the top-level layout and where the important code lives.
- **Current state** — which features/phases are done vs. in progress vs. not
  started, grounded in the code and git history (not assumptions).
- **How to run it** — the actual commands from the manifests/docs.

## Rules
- Ground every claim in a file you read; cite `file:line` where useful.
- If a doc contradicts the code, trust the code and say so.
- Don't guess at unstated intent — note open questions instead.

## At the start of a session
1. Briefly confirm the current state from the files above.
2. Ask what the user wants to work on, or suggest the next step from the roadmap.
