# Admin Dashboard — End-to-End Functional Test & Fix Plan (Playwright)

Status: ready to execute · Created: 2026-09-25 · Owner: any coding agent on branch `fred`

This document is the single source of truth for the phase that follows the Model-B
reconciliation. It is written so that **no guesswork is required**: every block names the
exact files, the exact commands, the exact assertions, and the exact commit message.

---

## 0. Non-negotiables (read before every block)

1. **Do NOT change the design.** No new colours, fonts, spacing, radii, shadows, icon
   styles, animation classes, layout structure, or component look-and-feel. If a fix
   needs a UI element, reuse the existing primitives and utility classes:
   `components/ui/Modal.jsx`, `TableCard.jsx`, `FilterTabs.jsx`, `KpiCard.jsx`,
   `StatusPill.jsx`, `EmptyState.jsx`, `Avatar.jsx`, `components/CustomSelect.jsx`,
   `components/ExportButton.jsx`, and the Tailwind patterns already in use
   (`bg-primary`, `rounded-xl`/`rounded-2xl`, `border-slate-200 dark:border-slate-800`,
   `text-xs font-bold`, `focus-visible:ring-2 focus-visible:ring-teal-600`).
2. **Functionality only.** The target is behaviour: *"if I click this, do I get that"*,
   *"if I download, do I get the right file, and where is it stored"*.
3. **NO ACKNOWLEDGEMENTS IN COMMITS OR PUSHES.** Every commit message in every block must
   end without any attribution line. Never include `🤖 Generated with Codebuff`,
   `Co-Authored-By: Codebuff <noreply@codebuff.com>`, or any equivalent. When you finish a
   block, state in your reply: *"no acknowledgements included, as required."*
4. **One block = one working tree change = one test run = one commit = one push.**
   Do not batch blocks. Do not commit a block whose tests are red unless the block's own
   deliverable is "record the defect and mark it expected-fail" (never the case here —
   every block ends green).
5. **Verify before committing:** backend `cd backend && ./start.sh test` (41/41) and
   frontend `cd frontend1/ims && npx react-scripts build` must still pass if the block
   touched them. Playwright specs live under `e2e/` and do not affect those builds.
6. **Never delete or mutate seed data that later tests depend on.** Use throwaway records
   you create, then delete them inside the same spec.

---

## 1. Scope — what "the admin dashboard" means here

Everything an `ADMIN` can reach, plus the shell that hosts it.

### 1.1 Routes (from `frontend1/ims/src/App.js`)

| Route | Component | Guard | Reachable from sidebar? |
|---|---|---|---|
| `/admin/dashboard` | `dashboards/AdminDashboard.js` | `ADMIN` | yes (Dashboards ▸ Admin Dashboard) |
| `/admin/users` | `dashboards/AdminUsersPage.js` | `ADMIN` | yes (User Management) |
| `/admin/audit-logs` | `dashboards/AuditLogs.jsx` | `ADMIN` | yes (Audit Logs) |
| `/admin/universities` | `UniversitiesManagement.jsx` (wrapped) | `ADMIN` | yes (Universities) |
| `/admin/placements` | `PlacementMatching.jsx` (wrapped) | `ADMIN`, `SUPERVISOR` | yes (Placement & Supervisors) |
| `/admin/vacancies` | `VacanciesManagement.jsx` | `ADMIN` | **no — URL only** |
| `/company` | `CompanyPage.js` (wrapped) | `ADMIN`, `SUPERVISOR` | yes (Companies) |
| `/company/:id` | `CompanyProfilePage.js` | `ADMIN`,`SUPERVISOR`,`COMPANY` | via Companies list |
| `/file-management` | `FileManagement.jsx` | all roles | yes (File Management) |
| `/student/*` | student area pages | `ADMIN`,`STUDENT` | yes (8 links shown to ADMIN) |
| `/university/dashboard`, `/university/students` | `UniversityDashboard`, `UniversityStudents` | `ADMIN`,`SUPERVISOR` | yes (Dashboards ▸ University Area) |
| `/company/dashboard` | `CompanyDashboard` | `ADMIN`,`COMPANY` | yes (Dashboards ▸ Company Area) |

### 1.2 APIs the admin UI calls (from `frontend1/ims/src/services/api.js`)

```
POST   {API_ROOT}/api/login                                    (form-urlencoded)
GET    {API_ROOT}/api/me
POST   {API_ROOT}/logout
GET    {API_ROOT}/api/students
PUT    {API_ROOT}/api/students/{id}
DELETE {API_ROOT}/api/students/{id}
GET    {API_ROOT}/api/students/export/csv
GET    {API_ROOT}/api/diaries
POST   {API_ROOT}/api/diaries/{id}/feedback
GET    {API_ROOT}/api/diaries/export/csv
GET    {API_ROOT}/api/admin/users
POST   {API_ROOT}/api/admin/users
PUT    {API_ROOT}/api/admin/users/{id}
DELETE {API_ROOT}/api/admin/users/{id}
GET    {API_ROOT}/api/audit-logs[?action=&target=&start=&end=]
GET    {API_ROOT}/api/universities
POST   {API_ROOT}/api/universities
PUT    {API_ROOT}/api/universities/{id}
DELETE {API_ROOT}/api/universities/{id}
GET    {API_ROOT}/api/universities/export/csv
GET    {API_ROOT}/api/placements
POST   {API_ROOT}/api/placements
PUT    {API_ROOT}/api/placements/{id}
DELETE {API_ROOT}/api/placements/{id}
GET    {API_ROOT}/api/placements/export/csv
GET    {API_ROOT}/api/vacancies
POST   {API_ROOT}/api/vacancies
PUT    {API_ROOT}/api/vacancies/{id}
DELETE {API_ROOT}/api/vacancies/{id}
GET    {API_ROOT}/api/companies
POST   {API_ROOT}/api/companies
PUT    {API_ROOT}/api/companies/{id}
DELETE {API_ROOT}/api/companies/{id}
GET    {API_ROOT}/api/companies/export/csv
GET    {API_ROOT}/api/supervisors?type=UNIVERSITY|COMPANY
GET    {API_ROOT}/api/evaluations ...
```

`API_ROOT` = `process.env.REACT_APP_API_ROOT || 'http://localhost:8082'`; `frontend1/ims/.env`
sets `REACT_APP_API_ROOT=http://localhost:8082`. The SPA is served from `http://localhost:3000`.

---

## 2. Environment & prerequisites (verify once, before Block 0)

| Item | Value / command |
|---|---|
| Java | not on PATH — always go through `backend/start.sh` (sets `JAVA_HOME=$HOME/.local/jdks/jdk-17.0.13+11`) |
| Backend | `backend/start.sh spring-boot:run` → `http://localhost:8082`, profile `dev` (H2 in-memory, `create-drop`) |
| Frontend | `cd frontend1/ims && BROWSER=none npm start` → `http://localhost:3000` |
| Node | v26.x, npm 11.x |
| Browser | **none installed** — Playwright must download Chromium (Block 0) |
| Determinism | H2 is `create-drop`: **restarting the backend restores pristine seed data** (Nkumba `universityId=19`, Airtel `companyId=1`, users below) |

### 2.1 Seed credentials (must match `backend/.../DataSeeder` + seeders)

| Username | Password | Role | Notes |
|---|---|---|---|
| `admin` | `admin123` | ADMIN | the account under test |
| `university` | `university123` | SUPERVISOR | linked to Nkumba (19) |
| `airtel` | `company123` | COMPANY | linked to company 1 |
| `2400101003` | `Student@123` | STUDENT | |
| `STU-2026-001`, `STU-2026-002` | `Student@123` | STUDENT | |

Login screen: `#username`, `#password`, `#login-role` (a `CustomSelect` **button**, default
`STUDENT` → must be changed to `ADMIN`), submit button text `Sign In`/`Login` (confirm in
`LoginPage.js` and assert by role+name rather than hard-coding).

---

## 3. Block 0 — Playwright harness (infrastructure)

**Goal:** a runnable, headless, deterministic Playwright suite for the whole plan.

**Files to create**

```
e2e/package.json
e2e/playwright.config.ts
e2e/.gitignore                 (node_modules, test-results, playwright-report, .auth)
e2e/tests/.gitkeep
e2e/README.md                  (how to run)
```

**Implementation steps**

1. `mkdir -p e2e/tests` and create `e2e/package.json`:
   ```json
   {
     "name": "ims-e2e",
     "private": true,
     "devDependencies": { "@playwright/test": "^1.47.0" },
     "scripts": {
       "test": "playwright test",
       "test:headed": "playwright test --headed",
       "install:browser": "playwright install chromium"
     }
   }
   ```
2. `cd e2e && npm install && npx playwright install chromium`
   (downloads Chromium; no system Chrome exists on this machine — this is expected).
3. Create `e2e/playwright.config.ts`:
   - `testDir: './tests'`
   - `fullyParallel: false`, `workers: 1` (shared backend state, single H2 instance)
   - `retries: 0`, `reporter: [['list'], ['html', { open: 'never' }]]`
   - `use`: `baseURL: 'http://localhost:3000'`, `trace: 'retain-on-failure'`,
     `screenshot: 'only-on-failure'`, `video: 'off'`,
     `acceptDownloads: true`, `viewport: { width: 1440, height: 900 }`,
     `ignoreHTTPSErrors: true`
   - `webServer: [` an array of two entries, both `reuseExistingServer: true`,
     `timeout: 180_000`:
     ```ts
     { command: 'bash backend/start.sh spring-boot:run', cwd: '..', url: 'http://localhost:8082/actuator/health', reuseExistingServer: true, timeout: 180_000 },
     { command: 'npm start', cwd: '../frontend1/ims', env: { BROWSER: 'none', CI: 'false' }, url: 'http://localhost:3000', reuseExistingServer: true, timeout: 180_000 }
     ```
     (If `webServer` proves flaky, fall back to starting both in a `globalSetup` and
     documenting the two terminal commands in `e2e/README.md`.)
4. Create `e2e/tests/00-smoke.spec.ts` with one test:
   - `GET http://localhost:8082/actuator/health` via `request` fixture → `200`, `status: "UP"`.
   - `page.goto('/login')` → heading/username input visible.
5. Add `e2e/tests/helpers.ts` (created now, used by later blocks) exporting:
   ```ts
   export const API = 'http://localhost:8082';
   export async function login(page, username, password, role = 'ADMIN') { /* #username, #password, CustomSelect #login-role, submit */ }
   export async function loginAs(page, role: 'ADMIN'|'SUPERVISOR'|'COMPANY'|'STUDENT') { /* uses creds table */ }
   export function collectConsoleErrors(page): string[] { /* page.on('console', ...) filtering type==='error' */ }
   export function collectFailedRequests(page): string[] { /* page.on('response', r => { if (r.status() >= 400) ... }) */ }
   export async function pickCustomSelect(page, selectId: string, optionLabel: string) { /* click #id; click li[role=option] with text */ }
   export async function downloadFile(page, trigger: () => Promise<void>): Promise<{ name: string; path: string }> { /* page.waitForEvent('download') */ }
   ```
6. `e2e/README.md`: list the exact commands (`npm test`, `npm run test:headed`,
   `npm run install:browser`) and note that the backend must be on 8082 and frontend on 3000.

**Test**

```bash
cd e2e && npm run install:browser && npm test
```

**Pass criteria:** `00-smoke.spec.ts` passes; Chromium downloaded; no console errors on `/login`.

**Commit message** (exact; no acknowledgements)

```
Add Playwright harness for end-to-end admin dashboard testing

Creates e2e/ with @playwright/test, a chromium-only headless config that
boots the dev backend and the CRA frontend, shared login/console/download
helpers, and a smoke spec proving the stack is reachable.

No acknowledgements.
```

> The trailing `No acknowledgements.` line is a statement of fact for this repo's policy —
> it is **not** an attribution. Do not add any Codebuff/co-author lines.

**Then:** `git push origin fred`.

---

## 4. Conventions used by every later block

- **Selectors:** prefer `getByRole('button', { name: ... })`, `getByLabel(...)`,
  `getByText(...)`, `data-*`/`id` attributes that already exist. Do **not** add
  `data-testid` to design markup unless a role/label selector is genuinely impossible;
  if you must, add the attribute only (no visual/semantic change).
- **CustomSelect is not a `<select>`.** Drive it as: `click(#<id>)` → `click(li[role="option"]:has-text("<label>"))`.
- **Modals:** `components/ui/Modal.jsx` renders on open; close via the header ✕ button
  (`getByRole('button')` in the header) or Escape. `StudentEditModal`, `UniversitiesManagement`
  modal and `DiaryReviewModal` are bespoke (`.modal-overlay` classes) — close by clicking the
  overlay or the `×` / `aria-label="Close modal"`.
- **`window.confirm`:** always register
  `page.on('dialog', d => d.accept())` (or `d.dismiss()` for the cancel path) **before** the click.
- **Downloads:** `const [download] = await Promise.all([page.waitForEvent('download'), click])`,
  then `expect(download.suggestedFilename()).toBe('<name>.csv')` and
  `await download.saveAs(someTmpPath)`; read the file and assert it is real CSV, not HTML.
- **State hygiene:** read current values, create unique records (`Date.now()` suffix), and
  delete them in `afterEach`/`afterAll`. Never delete `admin`, Nkumba (19) or Airtel (1).
- **Assert on behaviour, not pixels.** No snapshot tests. Do not assert Tailwind class names.
- **Record, don't hide, surprises:** if a spec fails, first decide whether the *app* is
  wrong or the *spec* is wrong. App defects get fixed in that block (functionality only);
  spec errors get corrected in the spec file.

---

## 5. Defect hypotheses register (confirm or dismiss in the blocks below)

These were found by static review. Each is a **hypothesis to verify**, not a pre-decided
fix. Blocks 1–13 must confirm each relevant one and act.

| ID | Where | Hypothesis | Expected handling |
|---|---|---|---|
| **H1** | `ExportButton` + every call site | `exportUrl` values are **relative** (`/api/...`) while the SPA runs on `:3000`. The request hits the CRA dev server, so the backend CSV is never fetched and the download always comes from the **client-side** `exportToCSV` fallback. | Wire `exportUrl` through `API_ROOT` (functionality fix, no design change) so the server CSV is actually downloaded; keep the client fallback for offline. Block 4/6/7/8/9/10. |
| **H2** | `AdminDashboard.js` diaries export | Passes `data={filteredDiaries}` → downloading exports only the **filtered** subset, not all diaries. | Decide and assert intended behaviour (export what's shown); make it explicit/tested. Block 4. |
| **H3** | `VacanciesManagement.jsx` | `exportUrl="/api/vacancies"` — a JSON endpoint downloaded as `.csv`. | Point at a real CSV source or client-only export; assert content. Block 9. |
| **H4** | `AuditLogs.jsx` | Sends `startDate`/`endDate`; backend `AuditLogController` expects `start`/`end` as ISO **date-time**. So date filters are silently ignored (and would 400 if renamed without format change). | Fix param names **and** serialise `YYYY-MM-DD` to ISO date-time (or relax backend `@DateTimeFormat`); assert filtering works. Block 6. |
| **H5** | `AdminDashboard.js` students table | `<thead>` has 7 `<th>` but rows render 8 `<td>` (actions column has no header); empty state uses `colSpan={7}`. | Add the missing header cell (design-consistent) / fix `colSpan`. Block 3. |
| **H6** | `AdminDashboard.js` + `DiaryReviewModal` | `onSaved` only closes the modal; the diaries list is not refreshed, so status/feedback changes don't show until reload. | Refresh the affected row on save. Block 4. |
| **H7** | `FileManagement.jsx` | Entirely static mock: hardcoded folders/files, storage 25/100; **Preview / Download / More do nothing**, Quick Access only toggles a highlight, nothing is stored anywhere. | Decide scope with the design owner's pattern: at minimum make dead controls non-deceptive (disabled with tooltip) or implement real upload/download following the existing panel design. Block 11. |
| **H8** | `AdminDashboard.js` edit | `<StudentEditModal … companies={[]} supervisors={[]} />` → Field Supervisor falls back to a raw numeric input instead of the existing picker. | Pass the real lists (`fetchCompanies`, `fetchIndustrialSupervisors`) and assert the picker renders. Block 3. |
| **H9** | sidebar | `/admin/vacancies` exists but is not in `navLinks`; users can only reach it by URL. | Confirm; if unintended, add the nav entry **using the existing nav item markup** (functionality, not redesign) or delete the route. Block 9. |
| **H10** | `DashboardLayout` + student pages | ADMIN sees all 8 `/student/*` links; the pages fetch student-scoped data (`/api/students/me`, `/api/diaries/me`) which an ADMIN account does not own. | Observe which pages error/empty for ADMIN; record and fix only if it's a broken promise of the nav. Block 12. |

---

## 6. Execution blocks

> Each block below is self-contained: **implement → test → commit → push**. Do them in order.
> Every commit message ends with the two-word policy line and **no attribution**.

---

### Block 1 — Access control, session lifecycle, shell

**Goal:** prove who can reach what, and that the admin shell works.

**Files:** `e2e/tests/01-auth.spec.ts` (new). No app changes expected; if a real guard gap
is found, fix it in `App.js`/`ProtectedRoute.js` (no design change).

**Implement (spec):**
1. `admin can log in and lands on the admin dashboard`:
   - `loginAs(page,'ADMIN')`; expect URL `/admin/dashboard`;
     expect sidebar brand "IMS Portal"; user chip shows `admin` + `Admin`.
2. `unauthenticated visits to admin routes redirect to /login`:
   - fresh context; `page.goto('/admin/users')` → URL contains `/login`.
3. `non-admin roles cannot open admin routes` (loop over `SUPERVISOR`, `COMPANY`, `STUDENT`):
   - log in, then `page.goto('/admin/dashboard')` → redirected to that role's home
     (`/university/dashboard`, `/company/dashboard`, `/student/dashboard`).
   - also assert `/admin/users`, `/admin/audit-logs`, `/admin/universities`, `/admin/vacancies`
     are unreachable for a STUDENT.
4. `admin can open every admin route` (loop): goto each of `/admin/dashboard`,
   `/admin/users`, `/admin/audit-logs`, `/admin/universities`, `/admin/placements`,
   `/admin/vacancies`, `/company`, `/file-management` → HTTP-rendered page,
   correct `h1.page-title`, no console errors, no failed API responses.
5. `sidebar toggle collapses and expands the shell`: click `[aria-label="Hide sidebar"]`,
   assert `.dashboard-shell` gets `sidebar-collapsed`; toggle back.
6. `notifications panel opens, lists items, and Clear all empties it`: click the bell
   (`title="Notifications"`), assert panel; click `Clear all`; assert "No new notifications".
7. `logout returns to /login and the session is dead`: click sidebar Logout; expect `/login`;
   then `page.goto('/admin/dashboard')` → back to `/login`.
8. `direct URL /admin/vacancies loads` (guards the H9 route).

**Test:** `cd e2e && npx playwright test tests/01-auth.spec.ts`

**Pass criteria:** all pass; zero console errors; the only expected failed requests are the
404s for `/api/...` relative export probes if any are triggered (none in this block).

**Commit**
```
Add E2E coverage for admin access control and dashboard shell

Verifies admin login and landing route, unauthenticated and non-admin
redirects for every admin route, the sidebar collapse toggle, the
notifications panel and clear-all, and logout ending the session.

No acknowledgements.
```

---

### Block 2 — Admin Dashboard: KPI header and Students tab

**Goal:** the default tab renders correct, reconcilable data and per-row actions work.

**Files:** `e2e/tests/02-admin-dashboard-students.spec.ts` (new).
App fixes if H5/H8 confirmed: `AdminDashboard.js`.

**Implement (spec):**
1. `KPI cards match the loaded table`:
   - read the 4 KPI values (`Registered Students`, `Day Diary Logs Submitted`,
     `Active Students`, `Avg Logs per Student`).
   - assert `Registered Students` equals the number of rows in the students table
     (and equals `GET /api/students` length via the `request` fixture with the admin cookie).
   - assert `Day Diary Logs Submitted` equals `GET /api/diaries` length.
   - assert `Avg Logs per Student` equals `(diaries/students).toFixed(1)`.
2. `tab counts` — the `Students` tab badge equals the KPI student count; `Day Diary Logs`
   badge equals the diary count.
3. `search narrows the student rows` — type a known student number
   (e.g. `2400101003`) into the topbar search; assert exactly the matching row(s) remain and
   the empty state appears for a nonsense query (`zzzz-no-match`); clearing restores all rows.
4. `table column integrity (H5)` — assert `<thead>` cell count === each row's cell count.
5. `View opens the Student Details modal with the row's data` — click `View` on a known
   student; assert the modal shows the same student number, email, program; close it.
6. `Edit opens the 4-step modal and saves`:
   - click `Edit`; assert "Step 1 of 4" and heading `Edit Student: <first> <last>`.
   - change `#edit-phoneNumber` to a unique value; Next ×3 (Step 2 validates intake/degree/year
     — they already exist; if validation blocks, fill them); on Step 4 click `Save Student`.
   - assert the modal closes and `GET /api/students/{id}` reflects the new phone number.
   - restore the original phone number afterwards.
7. `Edit shows the Field Supervisor picker, not a raw number input (H8)`:
   - open Edit → Next to Step 3 → assert `#edit-indSupervisorId` is the CustomSelect button
     (`aria-haspopup="listbox"`), not a number input.
   - If H8 is confirmed, the fix is: in `AdminDashboard.js` load
     `fetchCompanies()` and `fetchIndustrialSupervisors()` and pass them to
     `StudentEditModal` as `companies`/`industrialSupervisors` (the prop already exists;
     no design change).
8. `Delete asks for confirmation and removes the row`:
   - create a throwaway student first via `POST /api/students` (so seed data is safe),
     reload, register `page.on('dialog', accept)`, click that row's `Delete`.
   - assert the row is gone and `GET /api/students/{id}` returns 404.
   - a second run asserting `dismiss()` leaves the row intact.

**Test:** `cd e2e && npx playwright test tests/02-admin-dashboard-students.spec.ts`

**Pass criteria:** all pass. Any app change is limited to the students table header/colSpan
and passing the supervisor/company lists.

**Commit**
```
Fix and cover the admin dashboard Students tab

Reconciles KPI values with the loaded table, exercises search, view, the
four-step edit flow and confirmed delete, and passes real company and
industrial-supervisor lists to the edit modal so field-supervisor
assignment uses the existing picker instead of a raw id input.

No acknowledgements.
```

---

### Block 3 — Admin Dashboard: Day Diary Logs tab and review flow

**Goal:** diary list, review modal, and persistence of feedback/comments/status.

**Files:** `e2e/tests/03-admin-dashboard-diaries.spec.ts` (new).
App fix if H6 confirmed: `AdminDashboard.js` (refresh the row on save).

**Implement (spec):**
1. `logs table lists every diary entry` — compare row count with `GET /api/diaries` length;
   assert Date, Student, Daily Activities, Skills Gained, Accomplishments headers exist.
2. `search filters within diaries` — search a known student number; assert only their rows.
3. `Review modal shows the full entry` — click the per-row `Review diary entry` button
   (`aria-label="Review diary entry"`); assert Date, Student, Daily Activities,
   Knowledge & Skills Gained, Accomplishments, Account Number, Action, Technology/Tools fields
   are present (blank renders `—`).
4. `saving feedback persists and is reflected without a reload (H6)`:
   - set Feedback / Industrial Supervisor Comment / University Supervisor Comment to unique
     `e2e-…` values, set Status to `APPROVED`, click `Save Feedback`.
   - assert the modal closes, then `GET /api/diaries/{id}` returns the new values/status.
   - assert the table's Status/row reflects the change **without** `page.reload()`
     (this is the H6 assertion). If it fails, fix `AdminDashboard.js` so `onSaved`
     refreshes state (e.g. re-fetch diaries or patch the saved row in place).
   - restore the original values at the end.
5. `Cancel does not persist` — open, change a field, click `Cancel`, re-open, assert unchanged.

**Test:** `cd e2e && npx playwright test tests/03-admin-dashboard-diaries.spec.ts`

**Commit**
```
Fix and cover the admin dashboard Day Diary review flow

Confirms the diary table and filters, verifies the review modal shows every
entry field, and makes a saved review refresh the list in place instead of
requiring a manual reload.

No acknowledgements.
```

---

### Block 4 — CSV download contract (Admin Dashboard exports)

**Goal:** answer *"if I download, what do I get and where is it stored"* for the two
Admin-Dashboard exports.

**Files:** `e2e/tests/04-admin-dashboard-exports.spec.ts` (new).
App fix if H1/H2 confirmed: `components/ExportButton.jsx` and/or `utils/csvExport.js`
(functionality only — no markup/style change beyond an existing button).

**Implement (spec):**
1. `Students → Export CSV downloads students.csv`:
   - with no active search, trigger the Students export
     (`getByRole('button', { name: /Export CSV/ })` inside the students card).
   - assert `suggestedFilename() === 'students.csv'`.
   - `saveAs()` to `test-results/`, read the file, assert:
     the first line is a header row, the row count equals the students row count on screen,
     and the content is **not** HTML (`!content.trimStart().startsWith('<')`).
   - record where the browser stored it (`download.path()` is the temp location Playwright
     controls; note in the spec comment that the real browser saves to the OS Downloads dir
     and the app stores nothing server-side).
2. `Diaries → Export CSV honours the filtered set (H2)`:
   - apply a search that reduces the diary rows; trigger the diary export; assert the CSV
     row count equals the **filtered** row count and note the behaviour explicitly in a
     comment. (If the intended behaviour is "always export all", change the prop to
     `data={diaries}` and assert full count instead.)
3. `server-side export is actually used (H1)`:
   - before the click, `page.route('**/api/students/export/csv', ...)` is **not** how to
     prove it — instead capture `page.on('request')`; assert a request to
     `http://localhost:8082/api/students/export/csv` (absolute, with credentials) was issued.
   - If H1 is confirmed, the fix is: build the URL from `API_ROOT`
     (`ExportButton` should prefix relative `exportUrl`s with `API_ROOT` from `services/api.js`)
     so the backend CSV is fetched; keep the client-side fallback for offline use.
4. `response Content-Disposition/filename consistency`: assert the downloaded name matches the
   server's filename for the server path, and the prop `fileName` for the fallback path.

**Test:** `cd e2e && npx playwright test tests/04-admin-dashboard-exports.spec.ts`

**Pass criteria:** both exports produce a valid CSV whose filename and row count match a
documented, asserted rule; a comment in the spec states the storage location.

**Commit**
```
Make admin dashboard CSV exports fetch the backend export

The export buttons passed relative URLs, so every download silently fell
back to client-side CSV generation. Exports now address API_ROOT, and the
E2E spec asserts the downloaded filename, that the payload is real CSV and
that the backend export endpoint is actually called.

No acknowledgements.
```

---

### Block 5 — Admin Dashboard: System tab

**Goal:** the five system tiles are present and navigate correctly.

**Files:** `e2e/tests/05-admin-dashboard-system.spec.ts` (new).

**Implement (spec):** open the System tab, then for each tile assert label+description and
click-through:
- `Company Management` → `/company`
- `University Settings` → `/admin/universities`
- `Placement Approvals` → `/admin/placements`
- `Audit Logs` → `/admin/audit-logs`
- `User Management` → `/admin/users`
Assert each destination's `h1.page-title` matches the wrapper in `App.js`
(Company Management / University Management / Placement & Supervisor Management /
Audit Logs / User Management).

**Test:** `cd e2e && npx playwright test tests/05-admin-dashboard-system.spec.ts`

**Commit**
```
Add E2E coverage for the admin dashboard System tab

Asserts the five system tiles and that each one navigates to its page.

No acknowledgements.
```

---

### Block 6 — User Management (`/admin/users`)

**Goal:** full CRUD + role filtering + default-password contract.

**Files:** `e2e/tests/06-admin-users.spec.ts` (new).

**Implement (spec):**
1. `list loads` — row count equals `GET /api/admin/users` length; footer `Total` matches.
2. `role tabs show correct counts` — for each of All/STUDENT/SUPERVISOR/COMPANY/ADMIN the
   tab badge equals the count of that role in the API payload; clicking a tab filters rows.
3. `search filters by username or role`; nonsense query shows `No users found` + `Clear Filter`.
4. `Add User creates an account with password username+123`:
   - click `Add User`; fill `#add-username` with `e2e-<timestamp>`; pick role `STUDENT` in
     the CustomSelect `#add-role`; click `Create User`.
   - assert the success banner `User created successfully.` and the new row appears.
   - **new separate browser context**: log in as that username with password
     `<username>123` and role `STUDENT`; assert it lands on `/student/dashboard`.
   - clean up: delete the user via the UI (or `DELETE /api/admin/users/{id}`).
5. `duplicate username is rejected` — try to create `admin` again; assert an error banner
   (message from `API` `Username already exists.`) and no new row.
6. `Edit changes the role` — edit the throwaway user, switch role to `COMPANY`, `Save Changes`;
   assert banner `User updated successfully.` and the row badge updates and the API reflects it.
7. `Delete confirms and removes` — `page.on('dialog', accept)`; assert the row disappears and
   `GET /api/admin/users/{id}` is 404 (via `request` fixture).
8. `empty state` — filter to a role with zero users (create none) and assert the `EmptyState`.

**Test:** `cd e2e && npx playwright test tests/06-admin-users.spec.ts`

**Commit**
```
Add E2E coverage for admin User Management

Covers role tabs and counts, search, add-with-default-password verified by
a real login in a fresh browser context, duplicate-username rejection, role
edit, confirmed delete and the empty state.

No acknowledgements.
```

---

### Block 7 — Audit Logs (`/admin/audit-logs`)

**Goal:** the log list and every filter actually work, and actions produce entries.

**Files:** `e2e/tests/07-admin-audit-logs.spec.ts` (new).
App fix if H4 confirmed: `AuditLogs.jsx` (param names + date serialisation) and, only if
genuinely mismatched, `AuditLogController` (`@DateTimeFormat`).

**Implement (spec):**
1. `list loads` — rows equal `GET /api/audit-logs` length; headers
   Timestamp/User/Role/Action/Target Entity/Details/IP Address present.
2. `an admin action creates a log row` — create+delete a throwaway user (Block 6 helpers),
   reload the page, assert new rows whose `Details` mention the username and whose `Action`
   badge is `CREATE`/`DELETE`.
3. `action filter works` — select `DELETE` in the Action `CustomSelect`; assert every visible
   row badge is `DELETE`; assert the underlying request URL contained `action=DELETE`.
4. `date filter works (H4)`:
   - set Start Date = today, End Date = today; assert the page filters (rows all dated today)
     **and** assert the request went out with the names the backend expects.
   - If H4 is confirmed the fix is: send `start`/`end` (not `startDate`/`endDate`) and
     convert the `YYYY-MM-DD` input to an ISO-8601 date-time (e.g. `T00:00:00` /
     `T23:59:59`), matching `@DateTimeFormat(iso = DATE_TIME)`; assert 200 and filtered rows.
5. `search box filters client-side` — type a username seen in the table; assert only matching
   rows; nonsense → `No audit logs match your search criteria.`
6. `no console errors / no 4xx` during the whole block (the H4 failure surfaces as a 400).

**Test:** `cd e2e && npx playwright test tests/07-admin-audit-logs.spec.ts`

**Commit**
```
Fix and cover the admin audit log filters

The date inputs were sent as startDate/endDate in YYYY-MM-DD form while the
API expects start/end ISO date-times, so date filtering was silently a
no-op. The page now sends the correct parameters, and the E2E spec asserts
the action filter, the date filter, search and that admin actions produce
log rows.

No acknowledgements.
```

---

### Block 8 — University Management (`/admin/universities`)

**Files:** `e2e/tests/08-admin-universities.spec.ts` (new).

**Implement (spec):**
1. `list + pagination` — with 50 universities, page size is 10 → assert 10 rows and
   `Showing 1–10 of 50`; click Next → `Showing 11–20 of 50`; assert page-number buttons and
   ellipsis behaviour.
2. `search` — search `Nkumba` → the row with id 19 remains; nonsense → `No results found`.
3. `Add University` — open modal (`Add University`), fill `#uni-fullName`, `#uni-shortForm`,
   `#uni-country`, `#uni-establishedYear` with unique values, submit; assert the modal closes
   and the new row is listed; assert `GET /api/universities` contains it.
4. `duplicate name/short form is rejected` — re-add the same name; assert an error banner
   (`{"error": ...}` from `UniversityService` uniqueness check) and the modal stays open.
5. `Edit University` — edit the created row, change country, `Save Changes`; assert persisted.
6. `Delete University` — confirm dialog accepted; assert row gone and `GET /api/universities/{id}`
   404. Confirm the `DELETE` also writes an audit log (cross-check in Block 7 later).
7. `Export CSV` — assert `universities.csv`, header
   `ID,ShortForm,FullName,Country,EstablishedYear`, row count = total universities. Includes
   the H1 check (backend endpoint actually called).

**Test:** `cd e2e && npx playwright test tests/08-admin-universities.spec.ts`

**Commit**
```
Add E2E coverage for admin University Management

Covers pagination, search, create with uniqueness rejection, edit,
confirmed delete and the CSV export contract.

No acknowledgements.
```

---

### Block 9 — Placements (`/admin/placements`)

**Files:** `e2e/tests/09-admin-placements.spec.ts` (new).

**Implement (spec):**
1. `KPIs` — Active / Pending / Total match the loaded placement statuses.
2. `status tabs` — All/PENDING/ASSIGNED/ACTIVE/COMPLETED/CANCELLED counts match; selecting a
   tab filters rows; empty status shows `EmptyState` with `Clear Filter`.
3. `search` — by student name, company name, supervisor username and status.
4. `create placement` — `Assign Supervisors` → pick Student (CustomSelect `#pl-student`),
   Company (`#pl-company`), University Supervisor (`#pl-uni-sup`), Company Supervisor
   (`#pl-co-sup`), Status `PENDING` → `Create Placement`; assert the row appears and
   `GET /api/placements` contains it.
5. `validation` — submit with no student/company → inline error `Student and Company are required.`
6. `view details` — `View placement details` eye button opens the modal with Student, Company,
   both supervisors and Current Status matching the row.
7. `edit` — change Status to `ACTIVE`; assert the row badge updates and API reflects it.
8. `evaluate` — `Evaluate placement` opens `EvaluationForm`; assert it renders; submit a
   minimal valid evaluation; assert it saves (`GET /api/evaluations` grows) — if the form is
   complex, at minimum assert open/close and one successful save.
9. `delete` — confirm dialog; row removed; API 404.
10. `export` — `placements.csv` with header from `PlacementController` and correct row count.

**Test:** `cd e2e && npx playwright test tests/09-admin-placements.spec.ts`

**Commit**
```
Add E2E coverage for admin Placement management

Covers KPIs, status tabs, search, create with validation, detail modal,
edit, evaluation entry, confirmed delete and the CSV export.

No acknowledgements.
```

---

### Block 10 — Vacancies (`/admin/vacancies`) and Companies (`/company`)

**Files:** `e2e/tests/10-admin-vacancies.spec.ts`, `e2e/tests/11-admin-companies.spec.ts`.
App fix if H9 confirmed: sidebar entry, and H3 for the vacancies export.

**Implement — vacancies**
1. `the page is reachable` — `goto('/admin/vacancies')` renders the Vacancies card + table;
   assert the UI uses only existing components/styles (H9 note: it currently uses legacy
   `.card`/`.modal-overlay` classes — **do not redesign**; only report).
2. `create/edit/delete` a vacancy with a unique title (company id 1 = Airtel); assert each
   state via `GET /api/vacancies`.
3. `required fields` — submit without title/company → `Title and company are required.`
4. `export (H3)` — assert the downloaded content is CSV, not JSON; if H3 is confirmed, either
   add a real `/api/vacancies/export/csv` endpoint (following the pattern of
   `AdminUniversityController.exportUniversitiesCsv`) or drop the `exportUrl` so the client-side
   export is used deliberately. Assert filename + header + row count.
5. `nav reachability (H9)` — if confirmed and intended, add a `Vacancies` entry to
   `DashboardLayout.navLinks` for `ADMIN` using the existing `<Link className="nav-link">`
   markup (no new styling) and assert it navigates.

**Implement — companies (`/company`)**
6. `list loads`, `search`, `Add Company`, `Edit Company`, `Delete Company` (confirmed),
   `Export CSV` → `companies.csv` with `CompanyController`'s header.
7. `open a company profile` — click through to `/company/{id}` and assert
   `CompanyProfilePage` shows the company's fields.

**Test:** `cd e2e && npx playwright test tests/10-admin-vacancies.spec.ts tests/11-admin-companies.spec.ts`

**Commit**
```
Cover admin Vacancies and Company management

Exercises vacancy CRUD and its export contract, company CRUD, search,
export and profile drill-down, and records the vacancies page's route
reachability.

No acknowledgements.
```

---

### Block 11 — File Management (`/file-management`)

**Goal:** resolve the honest-behaviour question for a page whose buttons currently do nothing.

**Files:** `e2e/tests/12-file-management.spec.ts` (new); app change **only** if the agreed
outcome is a real implementation (see below).

**Decision required (ask the repo owner in the PR/commit body, default to option A):**
- **Option A (default, no new UI):** make the dead controls honest — disable
  Preview/Download/More for the mock rows and stop implying storage that does not exist
  (e.g. the storage bar/plan remains illustrative but the ✕ behaviour is removed). Any change
  uses existing classes; no visual redesign.
- **Option B (real storage):** implement upload/download via a new backend endpoint, wiring the
  existing buttons. This is a feature, must follow the existing card/list design, and belongs
  in its own follow-up plan block — **not** this phase unless the owner asks.

**Implement (spec, Option A):**
1. `page renders` — plan card, storage bar, Quick Access, Folders, Files, search.
2. `quick access selection highlights` — clicking `Videos` moves the `.active` state; assert
   no crash and that (documented) the file list does not change.
3. `search filters folders and files` — type a folder name; assert non-matching rows hide and
   `No folders/files match "…".` shows.
4. `file action buttons are disabled and explain themselves` — assert Preview/Download/More are
   `disabled` (or removed), so a user cannot believe a download happened.
5. `nothing is written to the backend` — assert no request to the API was issued from this page.

**Test:** `cd e2e && npx playwright test tests/12-file-management.spec.ts`

**Commit**
```
Make the File Management placeholder buttons honest

The page is a static mock whose Preview, Download and More buttons did
nothing, implying storage that does not exist. The controls are disabled
and the E2E spec documents and asserts that no download or upload occurs.

No acknowledgements.
```

---

### Block 12 — Admin-reachable student and university areas

**Goal:** verify the sidebar promises (H10) do not lead to broken pages for an ADMIN.

**Files:** `e2e/tests/13-admin-cross-area.spec.ts` (new).
App change only if a page hard-errors for ADMIN (functional fix; no redesign).

**Implement (spec):** as ADMIN, visit and assert "renders without a fatal error":
- `/student/dashboard`, `/student/progress`, `/student/tasks`, `/student/day-diaries`,
  `/student/learning-institute`, `/student/companies`, `/student/profile-settings`,
  `/student/supervisor`
- `/university/dashboard`, `/university/students`
- `/company/dashboard`
For each: assert the `h1.page-title` renders, no unhandled exception overlay, and record
whether the page is empty/errored for an ADMIN (H10). Where a page 4xx/5xxes for ADMIN because
it calls `/api/students/me` (which an ADMIN has no row for), decide: either the page should
handle the "no student profile" case gracefully (preferred functional fix) or the sidebar
should not link it for ADMIN. Implement the chosen fix in that page/sidebar using existing
patterns, and assert the final behaviour.

**Test:** `cd e2e && npx playwright test tests/13-admin-cross-area.spec.ts`

**Commit**
```
Cover the student and university areas an admin can open

Walks every sidebar destination an ADMIN can reach and makes the pages that
depend on a student profile degrade gracefully instead of erroring when the
viewer has none.

No acknowledgements.
```

---

### Block 13 — Cross-cutting sweep + full-suite gate

**Goal:** one green end-to-end run, no console errors, no unexpected failed requests.

**Files:** `e2e/tests/99-sweep.spec.ts` (new); `e2e/README.md` (update).

**Implement (spec):**
1. `no console errors across the admin surface` — attach `collectConsoleErrors` in `beforeEach`,
   visit every admin route, login/logout, open each modal type, and assert the array is empty.
2. `no unexpected 4xx/5xx` — attach `collectFailedRequests`; allowlist only deliberately
   probed endpoints (document them); assert the rest is empty.
3. `clean boot replay` — restart the backend (H2 `create-drop`) and re-run the whole suite;
   assert deterministic results. Document the restart command in `e2e/README.md`.
4. Update `e2e/README.md` with: prerequisites, run commands, data-reset note, and a table of
   the 13 blocks and their spec files.

**Test:**
```bash
cd backend && ./start.sh test                  # 41/41
cd frontend1/ims && npx react-scripts build    # succeeds
cd e2e && npx playwright test                  # all specs
```

**Commit**
```
Add a cross-cutting admin sweep and finish the E2E suite

Runs every admin route and modal with console-error and failed-request
capture, documents the deliberate export probes, and records the run
book in e2e/README.md.

No acknowledgements.
```

---

## 7. Order, checkpoints, and definition of done

1. Blocks run strictly in order 0 → 13.
2. After **every** block: the block's spec is green, the full backend test suite is 41/41,
   the frontend build succeeds, the commit is pushed, and the commit contains no attribution.
3. Definition of done for the phase:
   - `e2e/tests` contains the 13 suites; `cd e2e && npx playwright test` is green from a cold
     backend.
   - Every row of the defect register (§5) is either fixed and asserted, or explicitly
     dismissed with a one-line justification committed next to the relevant spec.
   - No file under `frontend1/ims/src` changed in a way that alters appearance: no new colours,
     spacing, radii, shadows, fonts, icon choices, or layout. Only behaviour, data wiring,
     disabled/aria state and copy that is factually wrong.
   - Every commit message in the phase contains **no** acknowledgement/attribution lines.
4. If a block's scope turns out to be too large in practice (e.g. a real File-Management
   implementation), split it into two commits within the same block and keep both green;
   do not defer the tests.

---

## 8. Quick reference — commands

```bash
# backend
cd backend && ./start.sh test                     # unit/integration tests (41)
cd backend && ./start.sh spring-boot:run          # dev profile on :8082 (H2, create-drop)

# frontend
cd frontend1/ims && BROWSER=none npm start        # :3000
cd frontend1/ims && npx react-scripts build       # production build
cd frontend1/ims && CI=true npx react-scripts test --watchAll=false   # 7 unit tests

# e2e
cd e2e && npm install && npx playwright install chromium
cd e2e && npx playwright test
cd e2e && npx playwright test tests/04-admin-dashboard-exports.spec.ts
cd e2e && npx playwright show-report
```

## 9. Commit/push policy (repeat, because it matters)

For every commit and every push in this phase:

- Commit body may describe what changed and why.
- The commit **must not** contain `🤖 Generated with Codebuff`,
  `Co-Authored-By: Codebuff <noreply@codebuff.com>`, or any other tool attribution.
- After pushing a block, state in the work log: *"pushed without acknowledgements."*
