# NOTES — wiring Claude into the course API

## Server (MCP)
I connected the official **filesystem server** (`@modelcontextprotocol/server-filesystem`) at project scope in `.mcp.json`, pointed only at `./docs`. It needs no key or credentials. It's useful here because `docs/api.md` is the API reference that has to stay in sync with `routes/`, so Claude can read and search the docs directly whenever it adds or reviews an endpoint. My permission rule in `.claude/settings.json` allows only the three read-only tools I actually use: `mcp__docs__read_text_file`, `mcp__docs__list_directory` and `mcp__docs__search_files`. The server's write tools (`write_file`, `edit_file`, `move_file`, …) are deliberately **not** allowed, so they still ask first. `enabledMcpjsonServers` turns the server on for teammates who clone the repo.

**Run and outcome:** I started the server with the exact command from `.mcp.json` and called it over MCP (JSON-RPC). `tools/list` returned 14 tools, which confirmed the three allowed names exist. `list_directory` returned `[FILE] api.md`, and `read_text_file` on `api.md` returned the full reference. I used that to check that every endpoint in `routes/users.js` and `routes/health.js` is documented (GET /health, GET /users, GET /users/:id, POST /users, PUT /users/:id). All five are. One thing I learned: paths are resolved inside `docs/`, so you ask for `api.md`, not `docs/api.md`.

## Skill — `add-api-route`
Every endpoint in this repo is built the same way: a helper in `db/store.js`, a handler in `routes/<resource>.js` that validates first, returns `400`/`404` with the `{ "error": "message" }` shape, gets mounted in `server.js`, gets supertest tests with `store.reset()`, and gets an entry in `docs/api.md`. The skill writes that down as a checklist. The description starts with "Use when adding or changing an HTTP endpoint in this Express API" and gives real example requests ("add DELETE /users/:id", "add a /products resource"), so it matches how people actually ask. It ends with "Not for config, tooling or non-route refactors" so it stays quiet for other work.

**Run and outcome:** After the repo was opened in a Claude Code session, Claude Code discovered the skill on its own and listed it as available, with this description. I then used it for "Add a DELETE /users/:id endpoint" in a throwaway copy of the repo. Following its steps produced `deleteUser()` in the store, the route (204 on success, `404 { "error": "User not found" }` when missing), two new tests and a `docs/api.md` entry. `npm run lint` was clean and `npm test` passed **7/7**. That test change was not committed, because this branch only adds Claude wiring.
**Still to confirm:** that it loads *by itself* from an unnamed request. In a fresh `claude` session in this repo, type `Add a DELETE /users/:id endpoint` and check that Claude loads `add-api-route` before writing code. Result: _(fill in)_

## Command — `/review`
`/review [file, folder or git range]` reviews changes against the project's 7-point checklist from CLAUDE.md, runs lint and tests, and reports a pass/fail table plus `file:line` fixes. It takes `$ARGUMENTS`, and with no argument it reviews everything that differs from `main` plus uncommitted work. Its `allowed-tools` let it read, diff and run lint/tests only, never edit. It's worth a shortcut because I'd otherwise retype the same long checklist before every PR.

**Run and outcome:** I followed the command's prompt step by step on the DELETE change above (`git diff main...HEAD`, `git status`/`git diff`, lint, tests). That showed the prompt picks up both the committed branch changes and the uncommitted route change, and every checklist item came out ✅. This was the prompt's steps run by hand, not the `/review` slash command itself.
**Still to confirm:** in `claude`, type `/review` and check you get the table and a verdict. Result: _(fill in)_

## Hook — lint after every edit
A **PostToolUse** hook with matcher `Edit|Write|MultiEdit` runs `.claude/hooks/lint-fix.js`. It *reacts*: because PostToolUse runs **after** the tool, the edit has already been saved, and the hook cannot block or undo it. For `.js` files in the project it runs `eslint --fix`, so anything fixable is fixed in place right away. If real errors remain, the script exits with code 2 and prints the ESLint output to stderr. Claude Code passes that back to Claude as feedback, so Claude sees the lint errors straight after its edit and can fix them, instead of finding out later in CI. Non-JS files and `node_modules` are skipped. (If I wanted to *prevent* something, that would be a PreToolUse hook.)

**Run and outcome:** I ran the hook script with the same JSON input Claude Code sends it. On a file calling an undefined function, it exited 2 and reported `'undefinedThing' is not defined (no-undef)`. On `NOTES.md` it exited 0 and did nothing. I also tried it from a hosted Claude Code session, but that session doesn't load project hooks, so nothing fired. That doesn't count as a run inside Claude Code.
**Still to confirm:** in `claude`, ask it to add a line calling `undefinedThing()` to `routes/health.js` and check that the ESLint message comes back after the edit. Then ask it to revert. Result: _(fill in)_

## Headless run
Task: check that the API docs match the routes, without changing anything.

```bash
claude -p "Compare every endpoint in routes/ with docs/api.md (read the docs through the docs MCP server). List any endpoint that is missing from the docs or documented wrongly. Do not edit any files." --allowedTools "Read" "Grep" "Glob" "mcp__docs__read_text_file" "mcp__docs__search_files"
```

I allowed only read and search tools: the built-in Read/Grep/Glob for `routes/`, and the two read-only docs-server tools. There's no Bash, no Edit/Write and no MCP write tools, so with nobody watching the worst it can do is read files. Anything else it tries is refused instead of waiting for approval.

**Run and outcome:** Not run yet. In the hosted session where this branch was built, `claude -p` stopped with `Authentication error` because that environment isn't signed in to Claude Code. The run has to happen on a signed-in machine.
**Still to confirm:** run the command above from the repo folder. Expected result: no missing or wrong endpoints, matching the manual check in the Server section. Result: _(fill in)_
