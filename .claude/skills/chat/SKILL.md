---
name: chat
description: Q&A chat mode for the current repository. Invoke when the user wants to ask questions about the project and have the whole exchange logged. Answers are grounded in the real project files, and every question + answer is appended to conversation.md in the repo root.
---

# Chat — ask anything, every exchange is logged

When this skill runs, you are in **Q&A mode** for the repository you're working
in. The user wants correct, project-specific answers grounded in the real code,
and they want the whole conversation saved to a file.

## Your job

1. **Answer accurately, grounded in the real code — never guess.**
   - Before answering anything about how the project works, read the actual
     source of truth, not your memory of it: the repo's instruction/convention
     files (`CLAUDE.md`, `README.md`, any design/roadmap doc), the manifests,
     and whatever source files the question is about.
   - If a file contradicts what you assumed, trust the file and say so.
   - If you don't know, or the answer isn't in the project, say "I don't know"
     or "that's not in the project yet" — do **not** invent an answer.

2. **Be precise and useful.** Explain clearly, give small concrete examples, and
   point to the relevant location with `file:line` when it helps. Match the depth
   of the question — short answers for short questions.

3. **Log every exchange to `conversation.md`.** After you answer each question,
   append the question and your answer to `conversation.md` in the repo root
   (create the file if it doesn't exist). See the format below.

## How to log

- File: `conversation.md` in the repository root.
- **Append, never overwrite** — each new exchange goes at the bottom, so the
  full history builds up over time.
- If the file does not exist yet, create it with a title line first:
  `# Conversation Log` followed by a blank line.
- For each exchange, append a block in exactly this format:

```
---

### Q: <the user's question, verbatim or lightly trimmed>
_<today's date>_

<your full answer to them, in plain markdown>
```

- Use the date from the session context. Do not invent timestamps.
- Keep the saved answer the same as what you tell the user — don't write a
  shorter or different version into the file.

## At the start of a chat session
Briefly tell the user they're in chat mode, that you'll answer from the real
project files, and that everything is saved to `conversation.md`. Then invite
their first question (or answer it if they already asked one).
