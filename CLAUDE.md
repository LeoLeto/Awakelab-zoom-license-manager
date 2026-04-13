# Claude Code — Workspace Instructions

## Version management (MANDATORY on every code change)

Whenever you make **any** code change in this repository — no matter how small — you **must** also:

1. **Bump `APP_VERSION`** in [`frontend/src/version.ts`](frontend/src/version.ts) following Semantic Versioning:
   - `PATCH` (1.0.x) — bug fix, copy tweak, UI adjustment, field removal
   - `MINOR` (1.x.0) — new feature, non-breaking addition
   - `MAJOR` (x.0.0) — breaking change, major redesign

2. **Match the version** in [`frontend/package.json`](frontend/package.json) (`"version"` field).

3. **Prepend a new entry** to [`CHANGELOG.md`](CHANGELOG.md) at the root using this format:
   ```
   ## [x.y.z] – YYYY-MM-DD

   ### <Added|Changed|Fixed|Removed>
   - Short description of what changed.
   ```

Do this **as part of the same edit batch** as the functional change — never skip it, never ask the user whether to do it.

## Project structure

- `frontend/` — React + TypeScript (Vite). Main entry: `src/main.tsx`.
- `backend/` — Node.js + Express + TypeScript. Main entry: `src/server.ts`.
- Shared types live in `frontend/src/types/` and are mirrored where needed in `backend/src/`.

## Key domain rules

- Assignment end dates (`fechaFinUso`) are stored as **end-of-day UTC** (`23:59:59.999Z`) so the final day is fully included in active-assignment queries.
- Assignment start dates (`fechaInicioUso`) are stored as **start-of-day UTC** (`00:00:00.000Z`).
- The `by-email` extension endpoint returns both `activo` and `expirado` assignments — extension requests are allowed even after expiry.
- Max assignment period is 365 days; validated on both frontend and backend.

## Date handling

When saving any date that comes in as a `YYYY-MM-DD` string:
- `fechaInicioUso` → leave as midnight UTC (default JS/MongoDB behavior).
- `fechaFinUso` → normalise to `23:59:59.999Z` via `setUTCHours(23, 59, 59, 999)`.

## Language

All UI copy, error messages, email content, and comments visible to end-users are in **Spanish**. Code identifiers and internal comments may be in English.
