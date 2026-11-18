# NOTES — wiring Claude into the course API

## Server (MCP)
I connected the official **filesystem server** (`@modelcontextprotocol/server-filesystem`) at project scope in `.mcp.json`, pointed only at `./docs`. It needs no key or credentials. It's useful here because `docs/api.md` is the API reference that has to stay in sync with `routes/`, so Claude can read and search the docs directly whenever it adds or reviews an endpoint. My permission rule in `.claude/settings.json` allows only the three read-only tools I actually use: `mcp__docs__read_text_file`, `mcp__docs__list_directory` and `mcp__docs__search_files`. The server's write tools (`write_file`, `edit_file`, `move_file`, …) are deliberately **not** allowed, so they still ask first. `enabledMcpjsonServers` turns the server on for teammates who clone the repo. I used it once to list `docs/` and read `api.md`, then checked that every endpoint in `routes/users.js` (GET /users, GET /users/:id, POST, PUT, GET /health) is documented. All five are.

## Skill — `add-api-route`
Every endpoint in this repo is built the same way: a helper in `db/store.js`, a handler in `routes/<resource>.js` that validates first, returns `400`/`404` with the `{ "error": "message" }` shape, gets mounted in `server.js`, gets supertest tests with `store.reset()`, and gets an entry in `docs/api.md`. The skill writes that down as a checklist. The description starts with "Use when adding or changing an HTTP endpoint in this Express API" and gives real example requests ("add DELETE /users/:id", "add a /products resource"), so it matches how people actually ask. It ends with "Not for config, tooling or non-route refactors" so it stays quiet for other work. Test prompt (doesn't name the skill): *"Add a DELETE /users/:id endpoint."*

## Command — `/review`
`/review [file, folder or git range]` reviews changes against the project's 7-point checklist from CLAUDE.md, runs lint and tests, and reports a pass/fail table plus `file:line` fixes. It takes `$ARGUMENTS`, and with no argument it reviews everything that differs from `main`. Its `allowed-tools` let it read, diff and run lint/tests only, never edit. It's worth a shortcut because I'd otherwise retype the same long checklist before every PR.

## Hook — lint after every edit
A **PostToolUse** hook (so it *reacts*) with matcher `Edit|Write|MultiEdit` runs `.claude/hooks/lint-fix.js` after Claude changes a file. For `.js` files in the project it runs `eslint --fix`. Anything fixable is fixed automatically. If real errors remain, the hook exits with code 2, so Claude is shown the ESLint errors and has to fix them right away instead of finding out later in CI. Non-JS files and `node_modules` are skipped. I triggered it on purpose with a file calling an undefined function, and it blocked with `'undefinedThing' is not defined (no-undef)`.

## Headless run
Task: check that the API docs match the routes, without changing anything.

```bash
claude -p "Compare every endpoint in routes/ with docs/api.md (read the docs through the docs MCP server). List any endpoint that is missing from the docs or documented wrongly. Do not edit any files." \
  --allowedTools "Read" "Grep" "Glob" "mcp__docs__read_text_file" "mcp__docs__search_files"
```

I allowed only read and search tools: the built-in Read/Grep/Glob for `routes/`, and the two read-only docs-server tools. There's no Bash, no Edit/Write and no MCP write tools, so with nobody watching the worst it can do is read files. Anything else it tries is refused instead of waiting for approval.
