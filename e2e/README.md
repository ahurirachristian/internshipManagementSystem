# IMS end-to-end tests

Playwright suite for the Internship Management System. Scope for this phase is the
**admin dashboard**, tested for behaviour only — the design is not touched.

## Prerequisites

- Java is not on `PATH`; always reach the backend through `backend/start.sh`.
- Backend: `http://localhost:8082` (profile `dev`, H2 in-memory, `create-drop`).
- Frontend: `http://localhost:3000` (`frontend1/ims`, `REACT_APP_API_ROOT=http://localhost:8082`).
- No system browser is required — Playwright installs its own Chromium.

## Install

```bash
cd e2e
npm install
npm run install:browser      # downloads Chromium (first run only)
```

## Run

The Playwright config starts both servers itself and reuses them if they are already up.

```bash
cd e2e
npm test                                      # everything, headless
npx playwright test tests/01-auth.spec.ts     # one suite
npm run test:headed                           # watch it happen
npm run report                                # open the last HTML report
```

To avoid the webServer startup cost during iterative work, start the stack in two terminals:

```bash
cd backend && ./start.sh spring-boot:run
cd frontend1/ims && BROWSER=none npm start
```

## Deterministic data

The dev backend uses H2 in memory with `create-drop`, so **restarting the backend restores
pristine seed data** (Nkumba `universityId=19`, Airtel `companyId=1`, `admin/admin123`, …).
Restart it between full runs if a spec left data behind:

```bash
pkill -f "spring-boot:run"; pkill -f DemoApplication   # wait for port 8082 to die
cd backend && ./start.sh spring-boot:run               # fresh H2 re-seeds on boot
```

Playwright's `webServer` boots it automatically if the port is down (`reuseExistingServer: true`).
Every spec also cleans its own throwaway records inside `beforeAll`/`afterAll` (exact-name
matches), so a healthy run needs no manual reset.

Tests must never mutate or delete seed records that later specs depend on (`admin`,
university 19, company 1, the three seeded students). Create a uniquely named throwaway
record, assert against it, then delete it inside the same spec.

## Conventions

- Selectors prefer roles and labels. The role pickers (`#login-role`, `#add-role`, …) are
  `CustomSelect` components — a `button[aria-haspopup="listbox"]`, not a `<select>`.
- `window.confirm` prompts need `page.on('dialog', d => d.accept())` registered **before**
  the click.
- Downloads: `page.waitForEvent('download')`, then assert `suggestedFilename()` and read the
  saved file — a CSV download must never contain HTML.
- `expectAppShell(page, title)` asserts the sidebar, topbar and page title are present.

## Suites

| File | Covers |
|---|---|
| `00-smoke.spec.ts` | stack reachability, login page renders |
| `01-auth.spec.ts` | login, redirects, app shell on every protected route, sidebar toggle, notifications, logout |
| `02-admin-dashboard.spec.ts` | KPIs, tab switching, header search, view/edit/delete, empty states |
| `03-admin-users.spec.ts` | user CRUD, role tabs, default password sign-in |
| `04-audit-logs.spec.ts` | audit log list, action filters, ISO date-time filters |
| `05-universities.spec.ts` | university CRUD, pagination, native validation, export |
| `06-companies.spec.ts` | company CRUD (legacy modal, force clicks) |
| `07-placements-vacancies.spec.ts` | placement tabs/search/modals, vacancy CRUD, deadline field |
| `08-file-management.spec.ts` | file management placeholder behaviour, disabled dead controls |
| `09-diary-review.spec.ts` | admin diary review, feedback persistence, student view (H6/H14/H15) |
| `10-admin-student-crud.spec.ts` | 4-step student edit, validation gates, H5/H8, confirmed delete |
| `11-csv-downloads.spec.ts` | CSV contract: filenames, headers, row counts, server vs client export (H1/H2/H3) |
| `12-admin-cross-area.spec.ts` | cross-area routes as ADMIN, university-dashboard degradation, sidebar Vacancies entry |
| `14-modal-audit.spec.ts` | dialog integrity: containment at 720p/800x600 for all admin modals + company/vacancy field round-trips |
| `15-dashboard-welcome.spec.ts` | dashboard greeting names the signed-in user (student/admin/company) |
| `16-dashboard-theme-colors.spec.ts` | dashboard hero/KPI/chart/To-Do colours follow the RIHO theme, not indigo |
| `17-dashboard-responsive.spec.ts` | dashboard fits 1440/1024/768/390 without horizontal scroll or clipped text |
| `18-dashboard-todo.spec.ts` | redesigned To-Do List: summary ring, filter tabs, card meta, progress bars |
| `19-dashboard-chart-palette.spec.ts` | all four chart sections use the emerald/teal ramp, no legacy green/amber/red |
| `20-status-by-day-layout.spec.ts` | Status by Day spans the grid; day columns and their values never overlap |
| `21-profile-settings.spec.ts` | Profile Settings uses the design-system dropdown and switches, no native controls |
| `99-sweep.spec.ts` | final gate: routes silent, modal gauntlet, logout |

## Recorded dead code (H12) — not deleted during this phase

These files are unreachable from the live tree (zero importers) and are kept until a
dedicated cleanup commit re-runs `routes.test.js` after the phase:

- `frontend1/ims/src/components/layout/*` — `nav.jsx`, `Sidebar.jsx`, `Header.jsx`,
  `Breadcrumb.jsx`, `FloatingToolbar.jsx` (the live sidebar is `DashboardLayout.js`)
- `frontend1/ims/src/components/dashboards/AdminStudentArea.jsx`
- `frontend1/ims/src/components/dashboards/AcademicUnitsManagement.jsx`
- `frontend1/ims/src/components/dashboards/CourseManagement.jsx`
- `frontend1/ims/src/components/dashboards/StaffManagement.jsx`
- `frontend1/ims/src/components/dashboards/UnitCoursesManagement.jsx`
- `frontend1/ims/src/components/dashboards/SchoolsManagement.jsx` /
  `DepartmentsManagement.jsx` / `ProgrammesManagement.jsx` are routed (supervisor
  area) but each passes an `onExport` prop the shared `ExportButton` does not
  implement, and supplies no `data` — so their export buttons render permanently
  disabled (plan defect H17).
