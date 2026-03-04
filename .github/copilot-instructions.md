# GitHub Copilot — Workspace Instructions

## Version management (MANDATORY on every code change)

Whenever you make **any** code change in this repository — no matter how small — you **must** also:

1. **Bump `APP_VERSION`** in [`frontend/src/version.ts`](../frontend/src/version.ts) following Semantic Versioning:
   - `PATCH` (1.0.x) — bug fix, copy tweak, UI adjustment, field removal
   - `MINOR` (1.x.0) — new feature, non-breaking addition
   - `MAJOR` (x.0.0) — breaking change, major redesign

2. **Match the version** in [`frontend/package.json`](../frontend/package.json) (`"version"` field).

3. **Prepend a new entry** to [`CHANGELOG.md`](../CHANGELOG.md) at the root using this format:
   ```
   ## [x.y.z] – YYYY-MM-DD

   ### <Added|Changed|Fixed|Removed>
   - Short description of what changed.
   ```

Do this **as part of the same edit batch** as the functional change — never skip it, never ask the user whether to do it.
