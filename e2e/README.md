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
Restart it between full runs if a spec left data behind.

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
| `02-admin-dashboard-students.spec.ts` | KPIs, students tab, search, view/edit/delete |
| `03-admin-dashboard-diaries.spec.ts` | diary logs, review modal, feedback persistence |
| `04-admin-dashboard-exports.spec.ts` | CSV download contract (filename, contents, source) |
| `05-admin-dashboard-system.spec.ts` | System tab tiles and navigation |
| `06-admin-users.spec.ts` | user CRUD, role tabs, default password |
| `07-admin-audit-logs.spec.ts` | audit log list and filters |
| `08-admin-universities.spec.ts` | university CRUD, pagination, export |
| `09-admin-placements.spec.ts` | placements, supervisors, evaluations |
| `10-admin-vacancies.spec.ts` | vacancy CRUD and export |
| `11-admin-companies.spec.ts` | company CRUD, export, profile drill-down |
| `12-file-management.spec.ts` | file management placeholder behaviour |
| `13-admin-cross-area.spec.ts` | student/university/company areas an admin can open |
| `99-sweep.spec.ts` | console-error and failed-request sweep |
