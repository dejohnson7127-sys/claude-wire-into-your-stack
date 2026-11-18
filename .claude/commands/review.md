---
description: Review changes against this project's checklist (default: everything not yet on main)
argument-hint: "[optional: file, folder or git range — e.g. routes/users.js or HEAD~1]"
allowed-tools: Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(npm run lint), Bash(npm test), Read, Grep, Glob
---

Review the code changes in this repo against the project checklist below. Do not edit any files — report only.

**What to review:** $ARGUMENTS
If that is empty, review everything that differs from `main`: run `git diff main...HEAD` and also `git status` and `git diff` for uncommitted work.

Then run `npm run lint` and `npm test` and include the results.

## Project checklist (from CLAUDE.md)
1. One route file per resource in `routes/`, mounted in `server.js` under its base path.
2. All data access goes through `db/store.js` — no arrays or state kept inside route files.
3. Input is validated in the route: `400` for bad input, `404` when a record is missing.
4. Every error response is JSON shaped exactly `{ "error": "message" }`.
5. Every new or changed endpoint has tests (success and error cases) using `store.reset()` in `beforeEach`.
6. `docs/api.md` describes every new or changed endpoint and its status codes.
7. Lint and tests pass.

## Report format
A short table with one row per checklist item: ✅ pass, ❌ fail, or ➖ not applicable, plus a one-line reason.
Then list each problem as `file:line — what's wrong — suggested fix`. End with a one-sentence verdict: ready to merge, or what must change first.
