# Changelog

All notable changes to **Gestor de Licencias Zoom** are documented here.

## [1.1.4] – 2026-03-05

### Fixed
- Added `1.25rem 1.5rem` padding wrapper around the tag list and input row in the **Dominios Aceptados** and **Áreas / Departamentos** Settings cards so content no longer bleeds to the card edges.

## [1.1.3] – 2026-03-05

### Changed
- Email search in TeacherAssignments now requires an explicit button click (or pressing Enter) instead of triggering automatically while typing, preventing premature API calls for slow typers.

## [1.1.2] – 2026-03-05

### Added
- New **Dominios Aceptados** tag-list section in Settings: manage the whitelist of corporate email domains that may submit license requests.
- Backend `acceptedDomains` setting seeded with the nine initial domains (adalidinmark.com, adalidsc.com, awakelab.world, cntm.es, grupoaspasia.com, grupoinsem.com, hoppers.academy, ibecon.org, miformacion.org).
- Domain validation in `TeacherRequestForm`: both the “Nueva Aula” email field and the “Ampliación” lookup field now show an inline warning and block submission when the domain is not on the accepted list.

## [1.1.1] – 2026-03-05

### Fixed
- `adminNotificationEmails` setting now saves reliably via explicit API call instead of onBlur on a text input.

### Changed
- Replaced comma-separated text input for 👥 Correos Administradores with a tag-list UI (add/remove individual emails), matching the Áreas/Departamentos pattern.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html)  
(`MAJOR.MINOR.PATCH`):

| Bump | When to use |
|------|------------|
| `PATCH` (1.0.**x**) | Bug fixes, copy changes, small UI tweaks |
| `MINOR` (1.**x**.0) | New features, non-breaking API changes |
| `MAJOR` (**x**.0.0) | Breaking changes, major redesigns |

---

## How to release a new version

1. Update `APP_VERSION` in [`frontend/src/version.ts`](frontend/src/version.ts).
2. Update `"version"` in [`frontend/package.json`](frontend/package.json) to match.
3. Add a new `## [x.y.z] – YYYY-MM-DD` section **at the top** of this file.
4. Commit with message: `chore: bump version to x.y.z`.

---

## [1.1.0] – 2026-03-05

### Added
- **Dynamic Áreas/Departamentos**: The "Área/Departamento" dropdown in `TeacherRequestForm` now loads its options from the `areaDepartamento` setting stored in the database instead of a hardcoded list.
- **Areas management in Settings**: A new "Áreas / Departamentos" section in the Settings page lets administrators add or remove department values that appear in the request form.
- **`settingsApi`**: Added `getSetting` and `updateSetting` helpers to `api.service.ts` for reading and writing individual settings from the frontend.
- **Backend default**: `areaDepartamento` is now seeded via `initializeDefaults()` with the original list of 14 departments.

---

## [1.0.6] – 2026-03-05

### Fixed
- Debounced the email input in `TeacherAssignments`: API calls now fire 500 ms after the user stops typing instead of on every keystroke, preventing excessive re-renders and network requests.

---

## [1.0.5] – 2026-03-05

### Fixed
- Eliminated second N+1 query pattern in `LicenseService.getAvailableLicenses`: the previous `for...of` loop issued one sequential `Assignment.find()` per occupied license. Replaced with 3 parallel queries (free licenses, occupied licenses, all conflicting assignment IDs) and an in-memory `Set` lookup — reduces DB round-trips from `2 + N` to `3` regardless of how many occupied licenses exist. Also added `.lean()` and field projection (`{ licenseId: 1 }`) to minimise data transfer on the assignments query.

---

## [1.0.4] – 2026-03-05

### Fixed
- Replaced N+1 MongoDB queries in `LicenseService.getAllLicensesWithAssignments` with 2 parallel queries (1 for licenses, 1 for all active assignments), then join in memory — eliminates the per-license `Assignment.findOne` round-trips that caused slow loading in production.
- Added `.lean()` to all read queries in `getAllLicensesWithAssignments` and `getLicenseWithAssignment`; returns plain JS objects instead of full Mongoose Documents, removing unnecessary serialisation overhead.
- Parallelised `getLicenseWithAssignment` — `License.findById` and `Assignment.findOne` now run concurrently instead of sequentially.
- Tuned MongoDB connection options (`maxPoolSize: 10`, `serverSelectionTimeoutMS: 10000`, `connectTimeoutMS: 10000`, `socketTimeoutMS: 45000`) to prevent indefinite hangs on slow or cold Atlas clusters.
- Added `{ estado: 1, fechaFinUso: 1 }` compound index on `AssignmentSchema` to accelerate the new bulk active-assignment query.

---

## [1.0.3] – 2026-03-04

### Fixed
- Added missing `tipoUso` field to `TeacherRequestForm`: new `Tipo de Uso` select in the "Información Laboral" section satisfies the required `CreateAssignmentDto.tipoUso` field (TS2345).
- Extension branch now carries `tipoUso` from the selected assignment, resolving the second TS2345 error.

---

## [1.0.2] – 2026-03-04

### Fixed
- Guard against `undefined` `licenseId` on active assignments when building the license map in `LicenseService` (TS18048).

---

## [1.0.1] – 2026-03-04

### Removed
- "Uso de la licencia" field removed from the license form.

---

## [1.0.0] – 2026-03-04

### Added
- Initial release of Gestor de Licencias Zoom.
- Admin dashboard with license overview and assignment management.
- Teacher portal for requesting and viewing Zoom license assignments.
- Automated daily expiration of assignments via cron job.
- Password management with secure random generation and Zoom API integration.
- Conflict detection to prevent duplicate reservations.
- Analytics dashboard with real-time license usage statistics.
- History viewer for auditing past assignment events.
- Role-based authentication (superadmin / admin).
- Email notifications for assignment and expiration events.
- MongoDB persistence with full data-integrity scripts.
- REST API documented in [`backend/API_DOCS.md`](backend/API_DOCS.md).
