---
name: add-api-route
description: Use when adding or changing an HTTP endpoint in this Express API — a new route (e.g. "add DELETE /users/:id", "add a GET /users?email= filter") or a whole new resource (e.g. "add a /products resource"). Covers the route file, store helper, validation, error shape, tests and docs/api.md. Not for config, tooling or non-route refactors.
---

# Adding an API route in this project

Follow these steps in order. They are this project's conventions (see CLAUDE.md); every endpoint is built the same way.

## 1. Data access goes through `db/store.js`
- Routes never hold state. If the endpoint needs data the store can't give yet, add a small helper function to `db/store.js` (e.g. `deleteUser(id)`, `listProducts()`), and export it.
- A new resource gets its own array and seed data inside `seed()`, so `store.reset()` keeps resetting everything for tests.
- Helpers return `undefined` when a record isn't found; they never send responses.

## 2. The route lives in `routes/<resource>.js`
- One file per resource, exporting an `express.Router()`.
- Above each handler, a one-line comment: `// METHOD /path — what it does.`
- Convert ids with `Number(req.params.id)`.
- Validate input first, then call the store, then respond:
  - bad or missing input → `res.status(400).json({ error: '<field> is required' })`
  - record missing → `res.status(404).json({ error: '<Resource> not found' })`
  - created → `201` with the new record; deleted → `204` with no body; otherwise `200` with JSON.
- Always `return` the response call so a handler never sends twice.
- Errors are **always** `{ "error": "message" }` — no other keys, no plain text.

## 3. A new resource is mounted in `server.js`
- `const productsRouter = require('./routes/products');`
- `app.use('/products', productsRouter);` next to the existing `app.use` lines.

## 4. Tests in `tests/<resource>.test.js`
- Use Node's built-in runner and supertest, like `tests/users.test.js`:
  `node:test`, `node:assert`, `supertest`, `require('../server')`, `require('../db/store')`.
- `test.beforeEach(() => store.reset());`
- Cover the success case **and** each error case you added (400 and/or 404).

## 5. Document it in `docs/api.md`
- Add a `### METHOD /path` section under the resource's heading, saying what the body needs and every status code it can return.

## 6. Check
- Run `npm run lint` and `npm test`; both must pass before you say you're done.
