# Dashboards, Charts & File Management — Integration Plan (PC1–PC5)

**Goal**: capture Chris's chart work and the File Management design from `origin/Chris` and
`origin/developer` into `fred` — without breaking `fred` and without modifying her branches —
then go beyond a straight port: correct chart-to-data pairings, on-palette colors, real domain
data, and role dashboards that answer what each user actually needs to know.

**Discipline (unchanged from P0–P9)**: one branch per phase (`port/pcN-…`) off `fred` →
implement → gates green → commit with a clean conventional message and **no
acknowledgements/footers of any kind** → verify with
`git cat-file commit HEAD | grep -ci codebuff || echo "no codebuff"` →
`git checkout fred && git merge --ff-only port/pcN-…`. Never stack phases. Never check out or
modify `origin/Chris` / `origin/developer`; read them only through `git show origin/…:path`.

**Measured gates on `fred` @ `19224fd`** (re-run 2026-09-30, not copied from older docs):

| Gate | Command | Baseline |
|---|---|---|
| Backend | `backend/start.sh clean test` | **136 tests, 0 failures** (`BUILD SUCCESS`) |
| Frontend tests | `CI=false npx react-scripts test --watchAll=false` | **2 suites, 8 tests, all pass** |
| Frontend build | `CI=false npm run build` | `Compiled with warnings`, **9 warnings** |

`CI` must be unset or `CI=false` or `react-scripts` promotes warnings to errors. `./mvnw` alone is
not a gate: `backend/start.sh:11` selects the complete JDK at `$HOME/.local/jdks/jdk-17.0.13+11`;
a direct `./mvnw` can fall back to the incomplete system JRE and fail with
`error: release version 17 not supported`.

The 9 warnings are pre-existing and are the budget PC1–PC5 must not exceed:
`CustomSelect.jsx:35`, `PlacementMatching.jsx:10`, `StudentEditModal.js:65`,
`UniversityStudents.jsx:28`, `UniversityStudents.jsx:75`, `AuditLogs.jsx:4`,
`CompanyProfilePage.js:13`, `SchoolsManagement.jsx:33`, `UniversityDashboard.js:108`.

There is **no CI workflow and no codebuff gate** in this repo — the gates above are manual only.

---

## 0. Findings inventory (verified against post-`git fetch` refs)

### 0.1 What fred ALREADY has (do not re-port)

| Artifact | Evidence |
|---|---|
| `OverviewSection.js` incl. `Legend`, `StatusHeadings`, `StackedBarChart`, `GroupedBarChart`, `DonutChart`, `LineChart`, `TodoList` (hand-rolled SVG/CSS) | byte-identical (`md5 27f84df9…`) on `origin/Chris` and fred |
| `UniversityDashboard.js` recharts kit (`BarChart` byYear, `PieChart` byGender, `RadarChart`, `CHART_COLORS` at line 68) fed by **real** `/api/university/stats` | byte-identical (`md5 b405daf5…`) on all three branches |
| `recharts@^3.10.1` (newer than Chris's conflicted `^2.15.0`) | fred `package.json` line 15 |
| `StudentDashboard.js` is **already clean** — 565 lines, zero chart function definitions, delegates to `OverviewSection` | verified; `StudentDataContext` has zero `tasksData` chart imports beyond the two builders |
| **Placement-status pie already rendered** on the University dashboard | `UniversityDashboard.js:939–1008` reads `a.placementStatus` and renders `<PieChart>` |
| **All 6 placement statuses incl. `PENDING` are pre-seeded** in the analytics response | `UniversityDashboardService.java:391` iterates `Placement.Status.values()` |
| Frontend test suite | `src/App.test.js`, `src/routes.test.js` — both passing |

**Correction to the previous draft of this plan**: it claimed `StudentDashboard.js` on fred
duplicated the four chart functions and that PC5 had to add a placement donut. Neither is true.
fred's `StudentDashboard.js` defines no charts, and the university placement pie already exists.
PC1 only needs to extract from `OverviewSection.js`; PC1/PC5 do not need to touch
`StudentDashboard.js` for charts.

### 0.2 What is MISSING on fred (the actual gaps)

1. **Chart CSS** — `origin/Chris:…/App.css` and `origin/developer:…/App.css` each contain
   **32** matching selector rules spanning **lines 396–1003** (`.card-panel`, `.progress-chart*`,
   `.grouped-bar*`, `.donut-*`, `.swatch*`, plus adjacent chart rules to ~1014). **fred has 0**
   (`grep -cE '\.progress-chart|\.donut-|\.grouped-bar|\.swatch|\.card-panel' App.css` → 0).
   → The charts render unstyled today. This is the single biggest visible gap.
2. **Conflict-free chart reference** — `origin/Chris:…/StudentDashboard.js` is 933 lines with
   **12 committed merge-conflict markers** (6 hunks, `<<<<<<<` at lines 3/431/483/623/838/891)
   and **cannot build**. `origin/developer:…/StudentDashboard.js` is 518 lines with **0 markers**.
   Since fred's `OverviewSection.js` is already the clean version of the same work, developer is
   reference-only; there is nothing to port from either file.
3. **No color token system for charts** — `UniversityDashboard.js:68` hardcodes
   `['#0d9488', '#f59e0b', '#8b5cf6', …]`. There is no `src/charts/` directory, and the only CSS
   token blocks are in `index.css` and `riho.css`. Hand-rolled SVG charts in `OverviewSection.js`
   hardcode their own hexes.
4. **Real data for the student charts** — `src/data/tasksData.js` generates 1,000 fake tasks with
   no IMS meaning. `StudentDataContext.js:14` calls `generateTasks(1000, 2026)` on every mount.
   Its only consumer is `StudentDataContext`. Needs real diary aggregation (PC2).
5. **File Management is disconnected** — fred's `FileManagement.jsx` (1,189 lines) is a
   `localStorage`-only mock: **zero** `fetch`/API calls, 26 occurrences of
   `audience`/`shareLink`/`downloads`/`downloadCount` that exist only client-side. The real
   `GET/POST/DELETE /api/files` API has **no frontend caller at all**. `Document` has 10 fields
   and none of audience/version/description/download count/share token. This is a backend-model
   gap first, a UI gap second (PC3).
6. **Company analytics do not exist** — `origin/developer` (Marion, `76f3dd7`) has
   `CompanySupervisorController.java`, `IndustrialSupervisorController.java`,
   `CompanySupervisorModal.js` (7 fields), and `CompanyDashboard.js` at **1,123 lines** with
   `renderProgress()` at line 709 and intern-evaluation tables. fred's `CompanyDashboard.js` is
   531 lines with 4 tabs (`profile`, `interns`, `offers`, `supervisors`) and **no analytics
   endpoint**. ⚠️ Overlaps our P6 (`/api/companies/me/supervisors`). See PC4.

### 0.3 Explicit DO-NOT-PORT list

| Item | Reason |
|---|---|
| `origin/Chris:frontend1/ims/package.json` | committed conflict markers; fred already has newer `recharts` |
| `origin/Chris:…/DashboardLayout.js` (260-line monolith) | fred's composed layout (Sidebar/Header/Breadcrumb/FloatingToolbar, theme, mobile) supersedes it |
| `origin/Chris:…/StudentDashboard.js` | 12 conflict markers, cannot build; fred's copy is already clean |
| `src/data/tasksData.js` (mock generator) | fake data undermines every chart; deleted in PC2 |
| Any new chart function definition in `StudentDashboard.js` | fred has none; charts live only in `OverviewSection.js` |
| `origin/developer`'s `CompanySupervisorController` / `IndustrialSupervisorController` | duplicate of our P6, company-scoped and tested by `CompanySupervisorCreationTest` |
| `origin/developer`'s `CompanyDashboard.js` wholesale | would overwrite our P6 tabs and its scoping model; cherry-pick concepts only |

### 0.4 Already done — do not redo in PC3

`/api/files` security hardening shipped in `19224fd` (branch `fix/file-endpoints-hardening`,
ff-merged): uploads and deletes restricted to `ADMIN`/`SUPERVISOR`, `uploadedBy` records the real
principal, path traversal rejected by a storage-root containment check, upload directory bound to
`file.upload-dir` with an OS-native default instead of the hardcoded `C:/ims_uploads/`, and
`FileAccessScopeTest` (9 tests) covering role scoping, uploader identity, traversal, and storage
location. **Residual gap, deliberately not closed:** reads (`GET /api/files`,
`GET /api/files/view/{name}`) are still visible to any authenticated user. Institution- or
owner-scoped reads need new `Document` fields plus a data migration, so it belongs to PC3 as an
explicit decision, not a silent change.

---

## 1. Chart-to-data correctness (the "is it the best chart?" audit)

Her charts encode task-board semantics (Completed / In Progress / Uncompleted per weekday) — a
vocabulary that does not exist in IMS. Remap each chart to what the domain actually measures:

| Chart | Verdict | New meaning on fred |
|---|---|---|
| `StackedBarChart` | ✅ keep, remap | **Diary entries per day (Mon–Sat)**, stacked by review state: Reviewed (has a non-blank university-supervisor comment) vs Awaiting review |
| `GroupedBarChart` | ❌ drop | Redundant with the stacked chart on the same screen; no student question needs exact per-status bars |
| `DonutChart` | ✅ keep, remap | **Diary review status**: center = total entries, segments = reviewed vs awaiting review |
| `LineChart` | ✅ keep, fix | **Diary consistency trend**; width is hardcoded and must become container-measured |
| Recharts set (University) | ✅ already real | Keep; rewire `CHART_COLORS` onto tokens |
| Per-intern progress rows (developer `renderProgress`) | ✅ adopt concept | Company sees each intern's onboarding progress (start date set / evaluation recorded) — list-first, not chart-first |
| Offers funnel | ➕ add | Company: PENDING → OFFERED → ASSIGNED → ACTIVE — "what have I offered and where does it stand?" |
| Placement-status pie (university) | ✅ already built | No work needed; only token rewire |

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
Reviewed-vs-awaiting-review semantic pair: emerald-600 = reviewed, amber-500 = awaiting review.

---

## 2. Phase plan (execute in order; each phase = branch → gates → footer-free commit → ff-merge)

### PC1 — Chart foundations (tokens + CSS + shared module)  ·  branch `port/pc1-chart-foundations`
1. Add a dedicated `--chart-*` token block to `App.css` with light and `.dark` variants, and create
   `src/charts/colors.js` exporting `CHART`, `STATUS_COLORS` (reviewed/awaiting), `TRACK`, `TEXT`.
   Rewire `UniversityDashboard.js:68` `CHART_COLORS` to import from it.
2. Port the 32 selector rules from `origin/Chris:App.css` lines 396–1003 (`.card-panel`,
   `.progress-chart*`, `.grouped-bar*` if kept, `.donut-*`, `.swatch*`) **rewritten onto the
   tokens** — replace every hardcoded hex (`#e2e8f0`, `#0f172a`, `#16a34a`, …) and add dark-mode
   rules. Exclude `.file-management*` / `.storage-bar` (PC3 scope).
3. Move the chart components out of `OverviewSection.js` into `src/charts/ProgressCharts.jsx`
   exporting `Legend`, `StatusHeadings`, `StackedBarChart`, `DonutChart`, `LineChart` — minus
   `GroupedBarChart`. Add: container-measured `LineChart` width (one `ResizeObserver`),
   `role="img"` + descriptive `aria-label` on each SVG, token-driven colors, number formatting.
   `OverviewSection.js` imports from `src/charts/`; `StudentDashboard.js` is untouched.
4. Keep `tasksData` feeding the charts unchanged in this phase (data swap is PC2) — purely visual
   and structural, so a regression here is unambiguous.
5. **Gates**: build ≤9 warnings (must not grow); backend suite still 136 green; visual check at
   390/768/1920 in light and dark mode (charts styled, legend readable, donut center legible).
   **Commit**: `fix(dashboards): style progress charts with shared design tokens (PC1)`

### PC2 — Real data behind the student charts  ·  branch `port/pc2-real-chart-data`
1. Rewrite `StudentDataContext` to aggregate **real diary data**:
   - load via the existing `GET /api/diaries/me` — no backend change;
   - `dailyProgress`: buckets **Mon–Sat** (matching `tasksData.js:18` `WEEKDAYS`, *not* Mon–Sun)
     of the current week keyed off `entry.date`, two segments where `reviewed` = the entry has a
     **non-blank** `universitySupervisorComment`. `DayDiaryApiController.java:175` defaults that
     field to `""`, so a truthy check would mislabel every untouched entry as reviewed — test for
     trimmed non-empty;
   - `statusTotals`: `{ Reviewed, 'Awaiting review' }`;
   - expose `loading` + `error` so charts render skeletons instead of zeros;
   - drop `GroupedBarChart`'s `{completed, inProgress, uncompleted}` shim entirely — it is gone in
     PC1, so no compat layer is needed.
2. Update `OverviewSection.js` card titles/subtitles to describe the real meaning
   ("Level of Progress — diary entries this week by review status").
3. **Delete `src/data/tasksData.js`**; `StudentDataContext.js:2` and `:14` are the only references —
   grep to confirm zero after.
4. Student placement card (P7) stays; charts complement it.
5. **Gates**: backend suite unchanged-green (no backend change), build ≤9 warnings, visual check
   that charts change with real diary activity (seeded students have entries).
   **Commit**: `feat(student): drive progress charts from real day-diary data (PC2)`

### PC3 — File Management: real API, then real UI  ·  branch `port/pc3a-file-model` → `pc3b-file-api-ui` → `pc3c-file-layout`
This phase is split because the model gaps are the real blocker: the UI cannot be "wired to the
real API" when the real API has none of the fields the UI already renders.

**PC3a — Document model + read scoping** · branch `port/pc3a-file-model`
1. Decide and implement **read scoping**. This is the open decision from §0.4: owner-scoped,
   institution-scoped, or global-authenticated. Recommended: institution-scoped, which needs
   `companyId`/`universityId` on `Document` plus a backfill migration for existing rows.
2. Add the fields the UI already implies: `audience`, `version`, `description`, `downloadCount`,
   `shareToken` (nullable share link). Keep `fileData` LOB as-is — removing it is a separate
   storage decision, not chart work.
3. Extend `DocumentRepository` with the scoped queries the chosen policy needs; add
   `DocumentScopeTest` proving company A cannot read company B's documents.
**Commit**: `feat(files): scope documents by institution and add file metadata (PC3a)`

**PC3b — API + frontend wiring** · branch `port/pc3b-file-api-ui`
4. Add `PATCH /api/files/{id}` (share link regeneration), `GET /api/files/{id}/download` (bumps
   `downloadCount`), `GET /api/files/usage` (real count + aggregate size — never a fake
   "100 GB plan"), `GET /api/files/share/{token}` (public token access).
5. Replace every `localStorage` read/write in `FileManagement.jsx` with `src/services/api.js` calls;
   mirror the `useState` + `useEffect` + `loadData()` pattern used in `UniversityStudents.jsx`
   so the a11y warning class doesn't grow. Upload keeps real progress via `XMLHttpRequest`.
6. Preserve every existing behavior: upload, download, download-count bump, share-link copy,
   search, category filter, audience badges.
**Commit**: `feat(files): replace local storage with real documents api (PC3b)`

**PC3c — Layout** · branch `port/pc3c-file-layout`
7. Port `.file-management*` / `.storage-bar` CSS from `origin/Chris:App.css` onto tokens + dark
   mode. Structure: left rail = real usage card, Quick Access = real categories with live counts,
   folder rail = categories, main panel = existing document table.
8. Replace `fa-*` icons with `lucide-react` equivalents; icon-tile colors from `CHART` tokens; keep
   existing aria/toast behavior.
**Commit**: `feat(files): redesign file management with sidebar layout on real data (PC3c)`

**Gates** (each sub-phase): build ≤9 warnings; full backend suite green; manual smoke: upload →
progress → appears in category → download bumps count → share copies link → other company 404s.

### PC4 — Company dashboard analytics + supervisor modal convergence  ·  branch `port/pc4-company-analytics`
**Decision**: fred's P6 `/api/companies/me/supervisors` stays the canonical supervisor API
(company-scoped by construction, L7/L21-compliant, tested by `CompanySupervisorCreationTest`).
Cherry-pick **concepts**, not the parallel backend.
1. Port `CompanySupervisorModal.js` adapted to our P6 endpoint. Its real field set is **7**
   (`sup-first`, `sup-last`, `sup-email`, `sup-username`, `sup-role`, `sup-contact`, `sup-dept`),
   not the 5 previously assumed — reconcile against the P6 `CompanySupervisor` entity and keep
   whichever fields P6 actually persists. Wire as create/edit in the Field Supervisors tab.
2. Skip `GET /departments` for now; `CompanyDepartmentRepository.findByCompanyIdOrderByDepartmentNameAsc`
   already exists if a dropdown is later wanted.
3. New `GET /api/companies/me/analytics` (COMPANY own scope only):
   `{ offers: {PENDING, OFFERED, ASSIGNED, ACTIVE, COMPLETED, CANCELLED}, interns, avgEvaluation }`.
   **New queries required** — today only university-scoped aggregates exist
   (`PlacementRepository.countByStatusGrouped(@Param universityId)` and
   `EvaluationRepository.averageScores(universityId)`), both filtered by university.
   `PlacementRepository.findByCompanyId` exists and can serve counts; the evaluation average needs
   a new company-scoped query. Cover all six statuses, matching
   `UniversityDashboardService.java:391`. Test in `CompanyAnalyticsTest` (company A cannot read B).
4. New **Overview tab** as the first tab (today: profile, interns, offers, supervisors): KPI cards
   + **offers funnel donut** from `src/charts/ProgressCharts.jsx` (DonutChart generalized to N
   segments) + per-intern progress rows adopting the `renderProgress` concept — list-first,
   chart-second.
5. **Gates**: full suite green incl. new `CompanyAnalyticsTest`; build ≤9 warnings; smoke as the
   seeded company user (`airtel`) with seeded placements.
   **Commit**: `feat(company): overview analytics tab and supervisor modal (PC4)`

### PC5 — Role dashboards that answer real questions  ·  branch `port/pc5-role-dashboards`
1. **University dashboard**: the placement-status pie already exists and already includes
   `PENDING`; only the token rewire from PC1 applies. **Supervisor attention list** — students
   with no diary entry in 48h — needs a **new** query: `DayDiaryRepository` has only
   `findTop10ByUniversityIdOrderByDateDesc` and `countByUniversityIdAndStatus`, neither of which can
   express "no recent entry". List-first card in the University dashboard or `UniversityStudents`.
2. **Admin dashboard**: students-per-university bar needs a **new** query — grep for
   `studentsPerUniversity` / `perUniversity` returns zero hits in both backend and frontend, and
   `AdminDashboard.js` contains no chart at all. Add a grouped-count endpoint scoped to ADMIN,
   then the bar. P6 Marketplace/System tabs unchanged.
3. **Accessibility pass** on all charts: `role="img"` + descriptive `aria-label` (started in PC1),
   text contrast in dark mode, keyboard-reachable tab panels, no `title`-only tooltips.
4. **Gates**: full backend suite green; build ≤9 warnings; visual matrix 390/768/1920 per role.
   **Commit**: `feat(dashboards): role-specific analytics and accessibility pass (PC5)`

### Final — full verification on `fred`
`backend/start.sh clean test` (136 + new green) · `CI=false npx react-scripts test --watchAll=false`
· `CI=false npm run build` (≤9 warnings) · `git log --oneline` review · footer sweep across all new
commits: `for c in $(git rev-list origin/fred..fred); do git cat-file commit $c | grep -ci codebuff; done`
(all zeros). Push only on request.

---

## 3. Risk register

| Risk | Mitigation |
|---|---|
| CSS port drags in light-only hexes → dark mode regressions | PC1 rewrites every rule onto tokens; visual matrix includes dark mode |
| Diary-derived buckets disagree with chart prop shapes | PC1 removes `GroupedBarChart` first, so PC2 changes one prop contract, not two |
| `""` supervisor comment misread as "reviewed" | PC2 tests trimmed non-empty, pinned by test |
| Document read scoping needs a migration with no live DB access | PC3a is its own branch and its own decision; no UI work starts before it lands |
| PC4 overlaps P6 endpoints | Canonical = P6 API; developer's controllers not merged; modal + analytics only |
| Chart count/perf on low-end mobile | Static SVG (no rAF); one `ResizeObserver` for line width |
| Merge conflicts with future fred work | One phase per branch, ff-only merges, no stacking (unchanged discipline) |

## 4. Out of scope (recorded, not planned)
- SSE notification push (D8 alternative), email verification (D3/P10), backend chart-rollup
  caching, her `DashboardLayout` monolith, her broken `package.json`.
- Dropping the `Document.fileData` LOB in favor of disk-only storage.
- CI workflow authoring (the repo has none; gates stay manual).
