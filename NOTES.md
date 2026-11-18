# NOTES — wiring Claude into the course API

Where it says "on my laptop", the check ran in Claude Code on my Windows laptop, signed in, in a fresh clone of this branch with project settings loaded. `git status` was clean afterwards.

## Server (MCP)
I connected the official **filesystem server** (`@modelcontextprotocol/server-filesystem`) at project scope in `.mcp.json`, pointed only at `./docs`. It needs no key or credentials. It's useful here because `docs/api.md` is the API reference that has to stay in sync with `routes/`, so Claude can read and search the docs directly whenever it adds or reviews an endpoint. My permission rule in `.claude/settings.json` allows only the three read-only tools I actually use: `mcp__docs__read_text_file`, `mcp__docs__list_directory` and `mcp__docs__search_files`. The server's write tools (`write_file`, `edit_file`, `move_file`, …) are deliberately **not** allowed, so they still ask first. `enabledMcpjsonServers` turns the server on for teammates who clone the repo.

**Outcome:** On my laptop the `docs` server connected from the committed `.mcp.json` with no changes (`npx` worked on Windows), and a call to `mcp__docs__search_files` answered. Before that, I had also started the server directly and called it over MCP: `tools/list` confirmed the three allowed tool names, and `read_text_file` returned `api.md`, which I used to check that all five endpoints are documented. Paths are resolved inside `docs/`, so you ask for `api.md`, not `docs/api.md`.

## Skill — `add-api-route`
Every endpoint in this repo is built the same way: a helper in `db/store.js`, a handler in `routes/<resource>.js` that validates first, returns `400`/`404` with the `{ "error": "message" }` shape, gets mounted in `server.js`, gets supertest tests with `store.reset()`, and gets an entry in `docs/api.md`. The skill writes that down as a checklist. The description starts with "Use when adding or changing an HTTP endpoint in this Express API" and gives real example requests ("add DELETE /users/:id", "add a /products resource"), so it matches how people actually ask. It ends with "Not for config, tooling or non-route refactors" so it stays quiet for other work.

**Outcome:** On my laptop, for the request "Add a DELETE /users/:id endpoint" (the skill wasn't named), the transcript showed `Skill(add-api-route)` before any code was written. Following it produced a `deleteUser()` store helper, the route (`204` on success, `404 { "error": "User not found" }` when missing), two tests and a `docs/api.md` entry. Lint was clean and tests passed **7/7**, and then I reverted all four files so this branch only holds the Claude wiring.
**Caveat:** in that session the request went to Claude as part of a test run, and Claude chose the skill from the request on its own. I haven't yet typed the request myself into a brand-new `claude` session.

## Command — `/review`
`/review [file, folder or git range]` reviews changes against the project's 7-point checklist from CLAUDE.md, runs lint and tests, and reports a pass/fail table plus `file:line` fixes. It takes `$ARGUMENTS`, and with no argument it reviews everything that differs from `main` plus uncommitted work. Its `allowed-tools` let it read, diff and run lint/tests only, never edit. It's worth a shortcut because I'd otherwise retype the same long checklist before every PR.

**Outcome:** On my laptop the command's prompt was followed step by step on this branch (Claude in that session can't type a slash command itself). It gave the table it should: items 1–6 came out ➖ not applicable, because the branch changes no routes (it also confirmed the docs match all 5 existing routes), and item 7 came out ✅ (ESLint clean, `npm test` 5/5). It found no problems, and the verdict was "ready to merge once NOTES.md results are filled in", which this update does. Earlier I had also followed it on the DELETE change, where every item came out ✅.
**Caveat:** this was the prompt run step by step. I haven't yet typed `/review` myself in `claude`.

## Hook — lint after every edit
A **PostToolUse** hook with matcher `Edit|Write|MultiEdit` runs `.claude/hooks/lint-fix.js`. It *reacts*: because PostToolUse runs **after** the tool, the edit has already been saved, and the hook cannot block or undo it. For `.js` files in the project it runs ESLint with `--fix`, so anything fixable is fixed in place right away. If real errors remain, the script exits with code 2 and prints the ESLint output to stderr. Claude Code passes that back to Claude as feedback, so Claude sees the lint errors straight after its edit and can fix them, instead of finding out later in CI. Non-JS files and `node_modules` are skipped. It runs ESLint's script through `node` rather than `npx`, so it also works on Windows. (If I wanted to *prevent* something, that would be a PreToolUse hook.)

**Outcome:** On my laptop I asked Claude to add `undefinedThing();` to the end of `routes/health.js`. Right after the edit, Claude Code showed:

```
PostToolUse:Edit hook blocking error from command: "node "$CLAUDE_PROJECT_DIR"/.claude/hooks/lint-fix.js":
ESLint found problems in routes\health.js that it could not auto-fix. Please fix them:
  11:1  error  'undefinedThing' is not defined  no-undef
```

Claude Code calls this a "blocking error". That means the error was fed back to Claude, not that the edit was stopped: the line had already been saved. I then had Claude remove it.

## Headless run
Task: check that the API docs match the routes, without changing anything.

```bash
claude -p "Compare every endpoint in routes/ with docs/api.md (read the docs through the docs MCP server). List any endpoint that is missing from the docs or documented wrongly. Do not edit any files." --allowedTools "Read" "Grep" "Glob" "mcp__docs__read_text_file" "mcp__docs__search_files"
```

I allowed only read and search tools: the built-in Read/Grep/Glob for `routes/`, and the two read-only docs-server tools. There's no Bash, no Edit/Write and no MCP write tools, so with nobody watching the worst it can do is read files. Anything else it tries is refused instead of waiting for approval.

**Outcome:** I ran it on my laptop from the repo folder (an earlier attempt in a hosted environment had stopped with `Authentication error` because that environment wasn't signed in). It read the docs through the docs server and edited nothing. It reported that all 5 endpoints (GET /health, GET /users, GET /users/:id, POST /users, PUT /users/:id) are present in `docs/api.md` and described correctly. It also pointed out two wording gaps:
- `POST /users` also returns `400` for empty strings, not only for missing fields.
- `PUT /users/:id` accepts an empty `name` or `email`.

Both are about app validation and docs wording, not the Claude setup, so I left them out of this PR as follow-ups.
