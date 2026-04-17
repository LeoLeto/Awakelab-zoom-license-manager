# Changelog

All notable changes to **Gestor de Licencias Zoom** are documented here.

## [1.6.8] – 2026-04-17

### Fixed
- La **Clave de anfitrión** ahora aparece en el email de confirmación incluso cuando las credenciales están pendientes (`credentialsPending: true`). Al ser un valor estático que nunca cambia, se muestra siempre junto al email Zoom; la contraseña sigue enviándose solo cuando está disponible.

## [1.6.7] – 2026-04-17

### Fixed
- `sendAssignmentConfirmation` ahora siempre envía copia `[COPIA ADMIN]` a los administradores, independientemente de si la contraseña está incluida o pendiente. Antes, cuando el inicio era más de 48 horas después (caso habitual), la condición `zoomPassword && !credentialsPending` impedía el envío de la copia.

## [1.6.6] – 2026-04-15

### Fixed
- `sendExtensionConfirmation` ahora envía copia `[COPIA ADMIN]` a los administradores configurados, igual que `sendAssignmentConfirmation`.

## [1.6.5] – 2026-04-15

### Fixed
- Tooltip del botón "Reenviar email" en el Historial ya no se recorta: se eliminó el tooltip redundante en botones con etiqueta de texto, y se añadió una regla CSS que ancla los tooltips dentro de `.table-actions` al borde derecho del botón en lugar de centrarlos, evitando que el `overflow-x: auto` del contenedor los corte.

## [1.6.4] – 2026-04-15

### Added
- **Historial**: las filas con acción "Asignación confirmada" ahora muestran un botón **Reenviar email** que reenvía el email de confirmación al docente con las credenciales actuales de la licencia. Funciona para asignaciones antiguas aunque no exista entrada en el log de emails. Las ampliaciones usan el template de ampliación; las nuevas asignaciones el de asignación.
- Backend: nuevo endpoint `POST /api/licenses/assignments/:id/resend-confirmation`.

## [1.6.3] – 2026-04-15

### Fixed
- Analytics y Configuración ya no tienen el padding superior extra que los diferenciaba del resto de secciones (`padding: 2rem` → `padding: 0` en `.analytics-dashboard` y `.settings-container`).

## [1.6.2] – 2026-04-15

### Fixed
- Uniformizados los encabezados de sección en todos los componentes principales:
  - `UserList`, `AdminManagement`, `HistoryViewer`, `AnalyticsDashboard` ahora usan `section-header` + `h2` con icono, igual que Resumen de Licencias y Solicitudes.
  - `AdminManagement`: eliminados estilos en línea, clases `btn btn-primary`/`btn btn-danger` reemplazadas por `btn-primary`/`btn-danger`, alertas cambiadas a clases `error`/`success`, tabla migrada a `table-container`.
- CSS: eliminadas las clases obsoletas `.history-viewer-header`, `.history-viewer-title`, `.analytics-header`, `.analytics-actions` y sus media queries.
- `.success` ahora tiene el mismo estilo de caja que `.error` y `.warning`.

## [1.6.1] – 2026-04-15

### Fixed
- EmailLogViewer ahora usa exclusivamente las clases CSS del sistema de diseño existente (misma apariencia que Resumen de Licencias y Solicitudes), sin estilos en línea ni clases ad-hoc.

## [1.6.0] – 2026-04-15

### Added
- **Log de Emails**: nueva pestaña "Emails" en el panel de administración con tabla completa de todos los emails enviados o fallidos.
  - Filtros por estado (enviado / fallido) y por tipo de email.
  - Vista previa del HTML del email en un modal.
  - Botón **Reenviar** para reenviar al destinatario original.
  - Botón **Solo admins** para reenviar únicamente a las direcciones de administrador configuradas.
  - Todos los envíos (incluidos emails de prueba y muestra) quedan registrados en la colección `email_logs` de MongoDB.
- Backend: nuevos endpoints `GET /api/email-logs`, `POST /api/email-logs/:id/resend`, `POST /api/email-logs/:id/resend-admins`.

### Fixed
- `sendPasswordChanged` y `sendPendingRequestNotification` ahora registran correctamente su `logType` en el log.
- `sendTestEmail` y `sendAssignmentSample` (que usan el transporter directamente) ahora también escriben entrada en el log.

## [1.5.2] – 2026-04-15

### Fixed
- Las ampliaciones ahora se procesan correctamente como extensiones de la licencia original:
  - El formulario de ampliación almacena el ID de la asignación original (`originalAssignmentId`).
  - Al abrir "Asignar Ampliación" en Solicitudes Pendientes, el sistema recupera automáticamente la licencia del período anterior y la muestra pre-seleccionada, sin necesidad de elegir una licencia manualmente.
  - El administrador puede pulsar "Cambiar licencia" si excepcionalmente necesita asignar una diferente.

## [1.5.1] – 2026-04-15

### Fixed
- Las solicitudes de ampliación ya son distinguibles de las solicitudes nuevas en toda la cadena:
  - **Solicitudes Pendientes**: nueva columna "Tipo" con badges **Nueva** (azul) y **Ampliación** (amarillo).
  - Botón de acción cambia a **Asignar Ampliación** y el modal a **Asignar Licencia para Ampliación** / **Confirmar Ampliación** cuando corresponde.
  - Correo de notificación al administrador usa asunto y cuerpo diferenciados: «Solicitud de Ampliación de Licencia Pendiente» en lugar de «Nueva Solicitud».

## [1.5.0] – 2026-04-15

### Added
- Email de asignación/ampliación ahora incluye la **Clave de anfitrión** (host key) de Zoom cuando está disponible en la licencia.
- Sección **Historial**: cada fila ahora tiene un botón "Ver detalles" (icono de portapapeles) que abre el modal de detalles de la licencia asociada, sin necesidad de copiar el ID y buscarlo manualmente.

### Fixed
- Error 400 al ampliar una licencia con un valor heredado de `tipoUso`: el formulario de ampliación ahora muestra siempre un selector de Tipo de Uso, pre-rellenado con el valor existente si es válido o vacío si es un valor heredado, y exige seleccionar una opción válida antes de enviar.

## [1.4.25] – 2026-04-13

### Fixed
- History timestamps now include the timezone abbreviation (e.g. "CET", "CEST") so the displayed hour is unambiguous.

## [1.4.24] – 2026-04-13

### Fixed
- Assignment expiration now records a `status_change` history entry (actor: system, `estado: activo → expirado`), so expired assignments appear in the license history.
- `markExpiredAssignments` no longer re-processes all previously expired assignments on every cron run — it now scopes the license-status check only to the assignments just expired.

## [1.4.23] – 2026-04-13

### Fixed
- `fechaFinUso` is now stored as end-of-day (`23:59:59.999Z`) instead of midnight UTC, so the final day of an assignment is fully included in active-assignment queries and not treated as already expired.

## [1.4.22] – 2026-03-30

### Changed
- Made tab icons bigger (20px → 24px) and h2 heading icons bigger (20px → 28px) via contextual CSS.
- Bumped `.icon-inline-lg` from 28px to 32px for consistency.

## [1.4.21] – 2026-03-30

### Fixed
- **Historial**: The Actor column now shows the logged-in admin's username instead of always displaying "system".
- Admin-only routes (create/update/delete license, update/cancel assignment) now require authentication and extract the actor from the JWT token.
- Teacher assignment requests use the teacher's corporate email (`correocorporativo`) as the actor in history entries.

## [1.4.20] – 2026-03-30

### Changed
- **Historial**: Replaced card/timeline grid with a sortable table (columns: Fecha, Tipo, Acción, Entidad, Cambios, Actor).
- Action and entity-type badges now use the app colour palette.
- Removed inline `<style>` block from HistoryViewer; all styles moved to App.css.
- Simplified HistoryDashboard wrapper (removed redundant dashboard-header).

## [1.4.19] – 2026-03-30

### Changed
- Removed "Inicio" link from the navbar (irrelevant for logged-in users).
- Remaining nav links (Panel de Administración, Portal de asignaciones) are now left-aligned next to the logo.
- Auth section (username + logout button) pushed to the right with `margin-left: auto`.
- Removed redundant `dashboard-header` from AdminDashboard and TeacherPortal.

## [1.4.18] – 2026-03-30

### Changed
- Version badge repositioned to `position: absolute` at the top-right corner of the navbar logo.

## [1.4.17] – 2026-03-30

### Fixed
- Icons inside action buttons no longer inherit `margin-right: 6px`, which was off-centering them.

## [1.4.16] – 2026-03-30

### Changed
- Navbar logo height increased from 40px to 54px.

## [1.4.15] – 2026-03-30

### Changed
- Action buttons in license table now left-align with the cell edge (removed centering).
- Replaced native `title` tooltips on action buttons with instant CSS `data-tooltip` (no delay).

## [1.4.14] – 2026-03-30

### Changed
- Navbar buttons (logout) now use `#35B3BA` as background color.
- Active nav link underline changed from white to `#35B3BA`.

## [1.4.13] – 2026-03-30

### Changed
- **Homepage**: Moved "sobre el sistema" into its own separate card below the main card.
- Replaced the features grid with a carousel slider — one feature per slide with prev/next arrow navigation.

## [1.4.12] – 2026-03-30

### Changed
- Increased homepage logo size from 50px to 90px.

## [1.4.11] – 2026-03-30

### Changed
- Removed logo-blue.png from the login card (Inicio de sesión).
- Restored logo-blue.png on the homepage card.

## [1.4.10] – 2026-03-30

### Removed
- Removed logo-blue.png from the homepage card.

## [1.4.9] – 2026-03-29

### Changed
- **Mis Asignaciones**: Redesigned to match Solicitar Licencia styling — uses `.card` wrapper, `.form-section` / `.form-group` layout, and clean tables instead of card grids and gradient banners.

### Removed
- Removed unused CSS: `.email-filter-required`, `.info-message`, `.assignments-grid`, `.assignment-card`, `.status-badge`, `.warning-badge`, `.btn-search`, `.assignments-section`.

## [1.4.8] – 2026-03-29

### Changed
- **Mis Asignaciones**: Applied consistent styling throughout the section:
  - Email filter gradient now uses app color scheme (#294560 → #35B3BA) instead of generic blue.
  - Info message matches the same gradient.
  - Search button uses the app’s dark blue (#294560) accent.
  - Assignment sections wrapped in white cards with shadows and bordered headers.
  - Added pending status styling (amber) for assignment cards, status badges, and table badges.

## [1.4.7] – 2026-03-29

### Fixed
- **Homepage layout**: Fixed content overflow — removed viewport lock and vertical centering so homepage scrolls naturally with no navbar.

## [1.4.6] – 2026-03-29

### Fixed
- **Homepage layout**: Fixed content overflow by enabling internal scrolling within the full-viewport homepage container.

## [1.4.5] – 2026-03-29

### Changed
- **Homepage**: Removed navbar from the homepage for a cleaner full-screen experience.

## [1.4.4] – 2026-03-29

### Fixed
- **Navbar background color**: Changed from #35B3BA (teal) to #294560 (dark blue).

## [1.4.3] – 2026-03-29

### Fixed
- **Login page scrollbar**: Eliminated unnecessary scrollbar by constraining the login page to the exact viewport height with reduced padding.

## [1.4.2] – 2026-03-29

### Added
- **Login page powered-by logo**: Added the "Powered by Awakelab" image at the bottom of the login page.

## [1.4.1] – 2026-03-29

### Changed
- **Login page background**: The admin login page now uses the same full-bleed background image as the homepage, with the form displayed in a centered translucent card.

## [1.4.0] – 2026-03-29

### Changed
- **Visual redesign**: New color palette (#35B3BA primary teal, #294560 dark blue, #999999 gray accents, #F0F2F2 backgrounds).
- **Navigation**: Teal (#35B3BA) background with white logo image replacing text brand.
- **Homepage**: Full-bleed background image, content wrapped in a translucent card, powered-by footer.
- **Icons**: All emojis across every component replaced with custom PNG icon set from assets/icons.
- **Buttons & tabs**: Updated active/hover states to match the new teal palette.
- **Feature cards**: Added subtle gray border for visual definition.

## [1.3.5] – 2026-03-29

### Changed
- **License search now includes assigned teacher**: The search bar in the license overview now matches against the assigned teacher's name (`nombreApellidos`) and corporate email (`correocorporativo`), in addition to the license email and Moodle username. Placeholder updated to "Buscar por email, usuario o asignado...".

## [1.3.4] – 2026-03-29

### Changed
- **Loading spinner on "Confirmar Asignación"**: The button now shows "⏳ Asignando..." and is disabled while the API call is in progress, preventing double-clicks and giving visual feedback.

## [1.3.3] – 2026-03-29

### Added
- **Admin credential copy email**: When a teacher receives their Zoom credentials (either immediately or via the 48h cron job), all configured admin notification email addresses now receive a copy of the same email. The admin copy is prefixed with `[COPIA ADMIN]` in the subject line. Only sent when actual credentials are included (not for the initial "credentials pending" confirmation).

## [1.3.2] – 2026-03-29

### Changed
- **48-hour credential lock**: Licenses assigned for a future date (>48h) now remain **libre** (available) until 48 hours before the start date. A daily cron job (7 AM) locks the license to "ocupado", generates a fresh Zoom password, and emails the teacher with working credentials. This avoids long idle periods where a license is blocked by a distant future reservation.
- **≤48h assignments**: Assignments starting within 48 hours behave as before — license is locked immediately and credentials are sent right away.
- **Email wording**: The "credentials pending" confirmation email now states credentials will arrive ~48h before the start date.

### Added
- **`credentialsSent` field** on Assignment model to track whether credential emails have been delivered, preventing duplicates and enabling retry on next cron run if the license is still occupied by another user.

## [1.3.1] – 2026-03-27

### Fixed
- **Stale password for future-start assignments**: When a license was assigned for a future date, the teacher immediately received an email with the current Zoom password. If the license was reused or the password was rotated before that date, the credentials would be invalid. The system now sends a confirmation-only email (without credentials) for future-start assignments, and a new daily cron job (7:00 AM) generates a fresh password and emails the actual credentials on the start date.

### Added
- **Start-date credentials cron job**: Runs daily at 7 AM, finds assignments starting today, generates a fresh Zoom password, sets it via the API, persists it, and emails the teacher with working credentials.
- **"Credentials pending" email template**: The assignment confirmation email now shows a clear message when credentials will be delivered later, instead of omitting the password silently.

## [1.3.0] – 2026-03-27

### Added
- **1-year maximum license period validation**: New and extension license requests are now limited to 365 days. Both the teacher request form and the backend API enforce this limit. A clear message informs the user that they can request an extension when their period is nearing its end.

## [1.2.9] – 2026-03-27

### Fixed
- **Extension check always failing with "ID de licencia inválido"**: The `GET /api/licenses/check-extension` route was defined *after* the `GET /api/licenses/:id` catch-all route, so Express matched `"check-extension"` as a `:id` parameter and tried to look up a license with that string — which failed ObjectId validation. Moved `/check-extension` above `/:id` so it matches first.

## [1.2.8] – 2026-03-27

### Fixed
- **Zoom password desync — teacher received wrong password on assignment**: The manual "Cambiar contraseña de Zoom" route changed the password in Zoom but never updated `passwordZoom`/`passwordEmail` in the database, causing stale credentials to be emailed. The route now syncs the new password to the DB after a successful Zoom API call.
- **Assignment email now guarantees a working password**: When a license is assigned (pending → active), the system generates a fresh password, sets it via the Zoom API, persists it to the DB, and emails that exact password to the teacher — eliminating any chance of a stale-password mismatch.

## [1.2.7] – 2026-03-19

### Fixed
- **Admin new-request notification always silently failing**: `adminNotificationEmails` is stored as an array in MongoDB, but the code called `.split(',')` on it assuming a string, throwing `adminEmails.split is not a function` and swallowing the error. The service now normalises the value — if it's already an array it's used directly; if it's a string it's split by comma. Empty entries are filtered out in both cases.

## [1.2.6] – 2026-03-19

### Fixed
- **Public request form could not load área/departamento options**: `GET /api/settings/:key` was gated behind `authenticateToken` via a global `router.use()`, causing 401 errors for unauthenticated users. The global middleware was removed and auth is now applied per-route. `acceptedDomains` and `areaDepartamento` are now readable without a token; all write routes (PUT, DELETE, POST) and the full-settings GET remain protected.

## [1.2.5] – 2026-03-19

### Fixed
- **Admin new-request email was silently dropped**: `sendEmail()` was gated on the `notifyOnExpiration` setting ("send expiry reminders on/off"), which is unrelated to transactional emails. Turning off expiry reminders inadvertently blocked the admin notification, the assignment confirmation, and the extension confirmation. The misplaced gate has been removed from `sendEmail`. Each caller now controls its own condition: the expiry cron already checks `notifyOnExpiration` before calling the email service; the admin notification checks `notifyOnNewRequest`; assignment/extension emails are always sent as transactional messages.

## [1.2.4] – 2026-03-12

### Added
- Extension confirmation email: when an assignment's end date is pushed forward, the teacher now receives the same credential email as on initial assignment, with the header and opening line changed to "Licencia de Zoom Ampliada" and subject `📅 Licencia de Zoom Ampliada - hasta <date>`. All Zoom and Moodle credentials are included so the teacher always has the current access information.

## [1.2.3] – 2026-03-11

### Changed
- **`TipoUso` type** added to `frontend/src/types/license.types.ts` as a string-literal union with the two canonical values. `Assignment.tipoUso` and `CreateAssignmentDto.tipoUso` now use it — TypeScript will catch wrong values at compile time.
- **`TIPO_USO_OPTIONS`** constant exported from the same file; all dropdowns (AssignmentManager, TeacherRequestForm) now map over it instead of hardcoding option strings.
- **`displayTipoUso()`** helper: renders the value as-is for known values; appends `⚠️ valor heredado` for unknown legacy values (e.g. "Both"). Used in the pending-requests table, the assign-license modal, and the teacher assignments cards.
- **Mongoose schema**: `tipoUso` field now has `enum` validation — the DB will reject any value that isn't one of the two valid options.
- **Route validation**: `POST /api/licenses/assignments` now returns HTTP 400 if `tipoUso` is missing or not one of the allowed values.
- **TeacherAssignments**: label renamed from `💻 Plataforma` to `💻 Tipo de Uso`.

## [1.2.2] – 2026-03-11

### Added
- After clicking **Enviar solicitud**, the app automatically switches to the **Mis Asignaciones** tab with the submitted email pre-filled, triggering an immediate search so the new request is visible right away.
- A dismissable green success banner appears at the top of the Mis Asignaciones tab confirming the request was received (auto-dismisses after 6 s).

## [1.2.1] – 2026-03-11

### Changed
- **Resumen de Licencias**: shows an amber warning banner when fewer than 10 licenses are available.
- **Solicitudes y Nuevas Asignaciones**: renamed the `Plataforma` column and modal label to `Tipo de Uso` to reflect the current data model.
- **Solicitar una Licencia de Zoom**: reordered the "Información Laboral" fields — *Comunidad Autónoma* now appears next to *Área/Departamento*, and *Tipo de Uso* is placed in the row below, left-aligned under the *Área/Departamento* column.

## [1.2.0] – 2026-03-11

### Added
- Assignment confirmation email now includes separate **Zoom credentials** section (email + password) and, when present, a **Moodle credentials** section (Moodle user + Moodle password).
- Warning block in the Zoom section explaining that the Zoom password will be changed automatically at license end, that an extension can be requested, and that a reminder email will be sent a few days before expiration.
- Prominent danger notice in the Moodle section instructing users **never to change the Moodle password**.
- New “📋 Enviar Muestra de Asignación” button in the “🧪 Probar Configuración de Correo” settings section, which sends a fully populated sample assignment email (bypassing the notifications-enabled gate).

## [1.1.8] – 2026-03-10

### Fixed
- Replaced the `Área/Departamento` free-text input in "Crear nueva asignación" with a `<select>` populated from the `areaDepartamento` settings (matching the teacher request form).
- Replaced the `Comunidad Autónoma` free-text input with the same `<select>` dropdown of Spanish autonomous communities used in the teacher request form (field is optional, as per reference).

## [1.1.7] – 2026-03-10

### Fixed
- Replaced the `Tipo de Plataforma` dropdown (with Zoom Meetings / Zoom Webinar / Ambos) in the "Crear nueva asignación" form with the correct `Tipo de Uso` field and the same two values used in the teacher request form.

## [1.1.6] – 2026-03-10

### Fixed
- Corrected the `Tipo de Uso *` dropdown options in the teacher request form: replaced legacy values with `Uso no asociado a plataforma` and `Uso para una plataforma Moodle de Grupo Aspasia` (proper sentence case instead of all-caps).

## [1.1.5] – 2026-03-05

### Fixed
- Styled the **Buscar** button in the "🔍 Ingresa tu Email Corporativo" field with a white background, primary-color text, and matching height/padding so it integrates correctly with the blue gradient card.

## [1.1.5] – 2026-03-05

### Changed
- Deleting a domain or an area/department in Settings now prompts for confirmation before removing the item.

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
