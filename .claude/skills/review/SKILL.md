---
name: review
description: Stage 4 of the build workflow (Explore → Plan → Implement → Review → Test). Reviews the code written for a module — correctness, conventions, security, and simplicity — against the plan and the real codebase. Invoke as `/review <module>` (e.g. `/review auth`) after `/implement`, before testing it. Flags problems with explanations rather than silently rewriting.
---

# Review — Stage 4 of 5 (Explore → Plan → Implement → Review → Test)

The module/feature to review is: **$ARGUMENTS**
(If empty, ask which module, or review the current git diff.)

You are in the **Review** stage. The code for **$ARGUMENTS** has just been
written (by `/implement`, or by the user) and needs a second look before testing.
Review it as a fresh pair of eyes, against the plan and the repo's conventions.

## What to do

1. **See what changed.** Read the relevant files and/or the diff
   (`git diff`, `git status`). Compare against the plan from `/plan $ARGUMENTS`
   and the conventions in the existing code.

2. **Review across these lenses** (report only what actually applies):
   - **Correctness** — does it do what the plan said? Bugs, edge cases, wrong
     status/return values, missing commits/cleanup, resource leaks, type/null
     mismatches.
   - **Security / data safety** — auth and access control enforced where needed,
     no sensitive data exposed, inputs validated, no secrets hardcoded.
   - **Conventions** — matches the repo's structure, idioms, naming, and comment
     style; uses the established patterns rather than inventing new ones.
   - **Simplicity** — anything overcomplicated or duplicated that could be simpler.
   - **PHI & compliance** — no patient data leaks into logs, error messages, or
     analytics; consent is captured where required; every PHI read/write is
     audit-logged; RBAC and org-scoping are enforced on every query; cross-org
     and wrong-role access is rejected.

3. **For each finding** give: the location (`file:line`), what's wrong, *why* it
   matters, and a **hint toward the fix** — not the finished patch, unless the
   user asks you to apply it (confirm first).

## Output — a short review report
- ✅ **What's good** — reinforce the correct patterns.
- ⚠️ **Must fix** — correctness/security issues, ordered by importance.
- 💡 **Consider** — optional simplifications / style.
- **Verdict**: ready for `/test $ARGUMENTS`, or list what to fix and re-review.

## Rules
- Default to **feedback, not edits.** Point out the fix and explain it; only
  change files if the user asks (confirm first).
- Ground every claim in the actual code you read — no guessing. If something is
  fine, say so plainly rather than inventing issues.
