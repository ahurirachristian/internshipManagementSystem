# Dashboards, Charts & File Management — Integration Plan (PC1–PC5)

**Goal**: capture Chris's chart work and the File Management design from `origin/Chris` and
`origin/developer` into `fred` — without breaking `fred` and without modifying her branches —
then go beyond a straight port: correct chart-to-data pairings, on-palette colors, real domain
data, and role dashboards that answer what each user actually needs to know.

**Discipline (identical to the P0–P9 port)**: one branch per phase (`port/pcN-…`) off `fred` →
implement → `backend/start.sh clean test` all green → `cd frontend1/ims && npm run build` green
with ≤9 warnings (current baseline) → commit with a clean conventional message and **no
acknowledgements/footers of any kind** → verify with
`git cat-file commit HEAD | grep -ci codebuff || echo "no codebuff"` →
`git checkout fred && git merge --ff-only port/pcN-…`. Never stack phases. Never check out or
modify `origin/Chris` / `origin/developer`; read them only through `git show origin/…:path`.

---

## 0. Findings inventory (verified, read-only)

### 0.1 What fred ALREADY has (do not re-port)

| Artifact | Evidence |
|---|---|
| `OverviewSection.js` incl. `StackedBarChart`, `GroupedBarChart`, `DonutChart`, `LineChart`, `Legend` (hand-rolled SVG/CSS) | byte-identical (`md5 27f84df9…`) on `origin/Chris` and fred |
| `UniversityDashboard.js` recharts kit (`BarChart` byYear, `PieChart` byGender, `RadarChart`, `CHART_COLORS`) fed by **real** `/api/university/dashboard/analytics` | byte-identical (`md5 b405daf5…`) on all three branches |
| `recharts@^3.10.1` dependency (newer than Chris's conflicted `^2.15.0`) | fred `package.json` line 15 |
| `StudentDataContext` exposing `dailyProgress` + `statusTotals` | fred `src/context/StudentDataContext.js` |

### 0.2 What is MISSING on fred (the actual gaps)

1. **Chart CSS** — the ~50 rules the Overview/Student charts need (`.progress-chart*`,
   `.donut-*`, `.grouped-bar*`, `.swatch*`, `.card-panel`) exist only in
   `origin/Chris:frontend1/ims/src/App.css` (≈ lines 396–940) and
   `origin/developer:…/App.css` (same 50 hits, conflict-free context). **fred has 0.**
   → Charts currently render unstyled → the "out of the design system" look.
2. **Conflict-free chart component source** — `origin/Chris:…/StudentDashboard.js` contains
   committed merge-conflict markers (`<<<<<<< HEAD` at lines 5/13/…) and **cannot build**.
   `origin/developer:…/StudentDashboard.js` has **0 conflict markers** and the same chart
   functions → it is the reference source for any missing chart pieces.
3. **Real data for the student charts** — both branches feed them from
   `src/data/tasksData.js → generateTasks(1000, 2026)` (1,000 random fake "tasks" with no IMS
   meaning). This must be replaced with real diary aggregation (PC2).
4. **File Management design** — `origin/Chris:…/FileManagement.jsx` (157 lines) is a beautiful
   but **static mockup** (hardcoded `FOLDERS`/`FILES`/`STORAGE`/`PLAN`, zero API calls). fred's
   `FileManagement.jsx` (1,189 lines) is the **real engine** (upload with progress, categories,
   audiences, download counts, share links, search). → Take her layout, keep fred's engine (PC3).
5. **Company analytics + parallel company-supervisor backend on `origin/developer`** (Marion,
   commit `76f3dd7`):
   - `CompanySupervisorController.java` (206 lines): `/api/company-supervisors` CRUD — GET
     list (ADMIN/SUPERVISOR/COMPANY), `/departments` (ADMIN/COMPANY), POST/PUT/`/{id}` DELETE
     (ADMIN/COMPANY).
   - `IndustrialSupervisorController.java` (176 lines) + repository additions.
   - `CompanySupervisorModal.js` (226 lines) UI.
   - `CompanyDashboard.js` (+1,066 lines): KPI cards, **per-intern progress rows** with
     evaluation averages, field-supervisor management, `renderProgress()`.
   - `SupervisorController.java` (+108) — likely a by-company filtering endpoint.
   - ⚠️ **Overlap with our P6** (`/api/companies/me/supervisors`, company-scoped, L7/L21
     compliant, tested by `CompanySupervisorCreationTest`). Merge strategy in PC4 below.

### 0.3 Explicit DO-NOT-PORT list

| Item | Reason |
|---|---|
| `origin/Chris:frontend1/ims/package.json` | committed conflict markers; fred already has newer `recharts` |
| `origin/Chris:…/DashboardLayout.js` (260-line monolith) | fred's composed layout (Sidebar/Header/Breadcrumb/FloatingToolbar, theme, mobile) supersedes it |
| `src/data/tasksData.js` (mock generator) | fake data undermines every chart; deleted in PC2 |
| Duplicate chart function definitions | Chris duplicates the 4 charts in both `OverviewSection.js` and `StudentDashboard.js`; PC1 extracts one shared module |
| `origin/developer`'s `CompanyDashboard.js` wholesale | would overwrite our P6 tabs (Offers, Field Supervisors) and its scoping model; cherry-pick concepts instead |

---

## 1. Chart-to-data correctness (the "is it the best chart?" audit)

Her charts encode task-board semantics (Completed / In Progress / Uncompleted per weekday) — a
vocabulary **that does not exist in IMS**. Remap each chart to what the domain actually measures
(day diaries, placements, students, offers, files):

| Chart | Verdict | New meaning on fred |
|---|---|---|
| `StackedBarChart` (weekly totals + composition per day) | ✅ keep, remap | **Diary entries per weekday (last 7 days)**, stacked by review state: Reviewed (has university-supervisor comment) vs Awaiting review |
| `GroupedBarChart` (same dataset side-by-side) | ❌ drop | Redundant with the stacked chart on the same screen; no student question needs exact per-status bars |
| `DonutChart` (3-status share, center total) | ✅ keep, remap | **Diary review status**: center = total entries, segments = reviewed vs pending (2–3 segments) |
| `LineChart` (trend across the week) | ✅ keep, fix | **Diary consistency trend**; make width responsive (she hardcodes 560px) |
| Recharts set (University) | ✅ already real | Keep; PC5 adds a **placement-status donut** (`PlacementRepository.countByStatusGrouped` already exists) |
| Per-intern progress rows (developer `renderProgress`) | ✅ adopt concept | Company sees each intern's onboarding progress (start date set / evaluation recorded) — list-first, not chart-first |
| Offers funnel (new) | ➕ add | Company: OFFERED → ASSIGNED → ACTIVE donut — answers "what have I offered and where does it stand?" |

**Color system**: all charts (hand-rolled + recharts) move to shared tokens so nothing sits
outside the palette:

```
--chart-1: #0d9488 (teal-600, primary)   --chart-2: #f59e0b (amber-500)
--chart-3: #059669 (emerald-600)         --chart-4: #e11d48 (rose-600)
--chart-5: #0284c7 (sky-600)             --chart-6: #7c3aed (violet-600)
track/borders: slate-200/slate-700 (light/dark) · text: slate-900/slate-100
```
Dark-mode variants via the existing `.dark` selector pattern; JS mirror in
`src/charts/colors.js` so recharts `Cell fill=` and SVG `stroke=` read the same palette.
Reviewed-vs-pending semantic pair: emerald-600 = reviewed, amber-500 = awaiting review.

---

## 2. Phase plan (execute in order; each phase = branch → gates → footer-free commit → ff-merge)

### PC1 — Chart foundations (tokens + CSS + shared components)  ·  branch `port/pc1-chart-foundations`
1. Add the `--chart-*` token block to `App.css` (light + `.dark` variants) and create
   `src/charts/colors.js` exporting `CHART`, `STATUS_COLORS` (reviewed/pending), `TRACK`, `TEXT`.
2. Port Chris's chart CSS from `origin/Chris:App.css` (≈ lines 396–940: `.card-panel`,
   `.progress-chart*`, `.grouped-bar*` if kept, `.donut-*`) **rewritten** onto the tokens —
   replace every hardcoded hex (`#e2e8f0`, `#0f172a`, `#16a34a`, …) and add dark-mode rules.
   Exclude `.file-management*` / `.storage-bar` (PC3 scope).
3. Create `src/charts/ProgressCharts.jsx` exporting `StackedBarChart`, `DonutChart`, `LineChart`,
   `Legend` — bodies from `origin/developer:…/StudentDashboard.js` (conflict-free reference),
   minus `GroupedBarChart`, with: responsive `LineChart` width (ResizeObserver or
   container-measured state), `aria-label`s on SVGs, token-driven colors, number formatting.
4. Rewire `OverviewSection.js` and `StudentDashboard.js` to import from `src/charts/` and delete
   their local duplicate definitions ( fred's copies are the identical port — safe swap).
5. Keep `tasksData` feeding untouched in this phase (data swap is PC2) — purely visual + structure.
6. **Gates**: build ≤9 warnings; suite untouched-green; visual check 390/768/1920 (charts now
   styled, legend readable, donut center legible in dark mode).
   **Commit**: `fix(dashboards): style progress charts with shared design tokens (PC1)`

### PC2 — Real data behind the student charts  ·  branch `port/pc2-real-chart-data`
1. Rewrite `StudentDataContext` to aggregate **real diary data**:
   - load via existing `fetchMyDiaries()` (student) — no backend change;
   - `dailyProgress`: buckets Mon–Sun of the current week from `entry.date`, two segments
     (`reviewed` = has `universitySupervisorComment`, `pending` otherwise); keep the
     `{ day, completed, inProgress, uncompleted }` shape only as a compat shim if needed,
     otherwise update the charts' prop names in the same commit;
   - `statusTotals`: `{ Reviewed, Awaiting review }` totals;
   - expose `loading` + `error` so charts render skeletons instead of zeros.
2. Update `OverviewSection.js` card titles/subtitles to describe the real meaning
   ("Level of Progress — diary entries this week by review status").
3. **Delete `src/data/tasksData.js`** and any remaining imports (grep to confirm zero refs).
4. Student placement card (P7) stays; charts complement it.
5. **Gates**: suite green (no backend change expected), build ≤9 warnings, visual: charts change
   with real diary activity (seeded students have entries).
   **Commit**: `feat(student): drive progress charts from real day-diary data (PC2)`

### PC3 — File Management redesign (her shell, fred's engine)  ·  branch `port/pc3-file-management`
1. Port the layout CSS from `origin/Chris:App.css` (`.file-management*`, `.storage-bar`,
   `.card-panel` remainder) onto tokens + dark mode.
2. Rebuild `FileManagement.jsx` structure: left rail = **real** storage/usage card (document
   count + aggregate size from the existing documents API — never a fake "100 GB plan"),
   Quick Access → fred's real categories with live counts (fred already computes them, lines
   ~413–429), folder rail → categories; main panel → fred's existing document table with
   upload+progress, share, download, search **unchanged in behavior**.
3. Replace FontAwesome (`fa-*`) icons with `lucide-react` equivalents; icon-tile colors from
   `CHART` tokens; keep all existing aria/toast behavior.
4. Delete the old single-column JSX; verify every previous feature still reachable
   (upload, download count bump, share-link copy, search, category filter, audience badges).
5. **Gates**: build ≤9 warnings; suite green; manual smoke: upload → progress → appears in
   category; download bumps count; share copies link.
   **Commit**: `feat(files): redesign file management with sidebar layout on real data (PC3)`

### PC4 — Company dashboard analytics + company-supervisor convergence  ·  branch `port/pc4-company-analytics`
**Decision (recommended)**: fred's P6 `/api/companies/me/supervisors` stays the canonical
supervisor API (company-scoped by construction, L7/L21-tested). From `origin/developer`
cherry-pick **concepts and missing pieces**, not the whole parallel backend:
1. Port `CompanySupervisorModal.js` (226 lines) adapted to our P6 endpoint + field set
   (firstName/lastName/email/phone/department); wire as the create/edit dialog in the Field
   Supervisors tab (replacing the inline form, keeping behavior).
2. If useful, adopt the **departments dropdown** idea: tiny company-scoped
   `GET /api/companies/me/departments` derived from our `industrial_supervisors` rows (or accept
   free text as today — recommended for now; skip the endpoint).
3. New tiny backend endpoint `GET /api/companies/me/analytics` (COMPANY own scope):
   `{ offers: {OFFERED, ASSIGNED, ACTIVE, COMPLETED, CANCELLED}, interns, avgEvaluation }` from
   existing repositories (`PlacementRepository.findByCompanyId`, evaluations) — audited, tested
   in `CompanyAnalyticsTest` (scope: company A cannot read B → 404/empty-by-construction).
4. Company dashboard new **Overview tab** (first tab): KPI cards (interns, open offers, active
   placements, field supervisors) + **Offers funnel donut** from `src/charts/` (reuse DonutChart
   generalized to N segments) + per-intern progress rows (developer's `renderProgress` concept:
   start-date set / evaluation recorded / avg score) — list-first, chart-second.
5. **Gates**: suite green incl. new `CompanyAnalyticsTest`; build ≤9 warnings; smoke as company
   user (seeded `airtel`): overview renders with seeded placements.
   **Commit**: `feat(company): overview analytics tab and supervisor modal (PC4)`

### PC5 — Role dashboards that answer real questions  ·  branch `port/pc5-role-dashboards`
1. **University dashboard**: add **placement-status donut** from existing
   `countByStatusGrouped` analytics (no backend change); keep recharts colors via `CHART` tokens.
2. **Supervisor attention list** (University dashboard or UniversityStudents): students with no
   diary entry in 48h — list-first card, derived from existing diary endpoints.
3. **Admin dashboard**: students-per-university bar (existing analytics) — Marketplace/System
   tabs from P6 unchanged.
4. **Accessibility pass** on all charts: `role="img"` + descriptive `aria-label`, text contrast
   in dark mode, keyboard-reachable tab panels; remove `title`-only tooltips.
5. **Gates**: full backend suite green; build ≤9 warnings; visual matrix 390/768/1920 for each
   role's dashboard.
   **Commit**: `feat(dashboards): role-specific analytics and accessibility pass (PC5)`

### Final — full verification on `fred`
`backend/start.sh clean test` (expect 125+new green) · `npm run build` (≤9 warnings) ·
`git log --oneline` review · footer sweep across all new commits:
`for c in $(git rev-list origin/fred..fred); do git cat-file commit $c | grep -ci codebuff; done`
(all zeros). Push only on request.

---

## 3. Risk register

| Risk | Mitigation |
|---|---|
| CSS port drags in light-only hexes → dark mode regressions | PC1 rewrites every rule onto tokens; visual matrix includes dark mode |
| Diary-derived buckets disagree with chart prop shapes | PC2 updates components + context in one commit; no silent shape drift |
| File redesign regresses a working upload flow | PC3 keeps engine code paths intact; smoke checklist before commit |
| PC4 overlaps P6 endpoints | Canonical = P6 API; developer's controller not merged; modal + analytics only |
| Chart count/perf on low-end mobile | Charts are static SVG (no rAF); LineChart responsive-width uses one ResizeObserver |
| Merge conflicts with future fred work | One phase per branch, ff-only merges, no stacking (unchanged discipline) |

## 4. Out of scope (recorded, not planned)
- SSE notification push (D8 alternative), email verification (D3/P10), backend chart-rollup
  caching, her `DashboardLayout` monolith, her broken `package.json`.
