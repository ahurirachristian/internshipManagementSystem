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

1. **Chart color tokens** — there is no palette behind the charts. `origin/Chris:App.css` and
   `origin/developer:App.css` each carry **32** rules for a `.progress-chart*` / `.donut-*` /
   `.grouped-bar*` / `.swatch*` markup spanning lines 396–1003, and fred's `App.css` has **0** of
   those selectors — but **that is not a defect**: those rules style a class-name-based
   implementation that only exists in Chris's and developer's `StudentDashboard.js`. fred's
   `OverviewSection.js` is pure Tailwind and **all 143 of its literal classes are emitted in the
   built CSS** (verified against `build/static/css/main.*.css`), so the charts already render
   correctly. The genuine gap is **17 hardcoded hexes inside SVG attributes, recharts fills, and
   chart chrome** in `OverviewSection.js` and `UniversityDashboard.js`, none of which respond to
   the dark-mode toggle. PC1 fixes that and leaves the 32 rules behind.
2. **Conflict-free chart reference** — `origin/Chris:…/StudentDashboard.js` is 933 lines with
   **12 committed merge-conflict markers** (6 hunks, `<<<<<<<` at lines 3/431/483/623/838/891)
   and **cannot build**. `origin/developer:…/StudentDashboard.js` is 518 lines with **0 markers**.
   Since fred's `OverviewSection.js` is already the clean version of the same work, developer is
   reference-only; there is nothing to port from either file.
3. **No color token system for charts** — there is no `src/charts/` directory, and the only CSS
   token blocks are in `index.css` and `riho.css`. `UniversityDashboard.js:68` hardcoded a local
   `CHART_COLORS` array, `OverviewSection.js` hardcoded its own `STATUS_COLORS`, and both used
   raw `isDark ? '#…' : '#…'` ternaries for grid, tick, tooltip, and axis colors. Resolved in PC1.
4. **Real data for the student charts** — `src/data/tasksData.js` generated 1,000 fake tasks with
   no IMS meaning, and `StudentDataContext` called `generateTasks(1000, 2026)` on every mount. Its
   only consumer was `StudentDataContext`. Resolved in PC2: real diary aggregation, generator
   deleted.
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
location.

**Read scoping shipped in PC3a** (branch `port/pc3a-file-model`, ff-merged): the residual gap above
is closed. `Document` gained nullable `universityId`/`companyId` plus `audience`, `version`,
`description`, `downloadCount`, and `shareToken`. `GET /api/files` is filtered through
`DocumentScopeService`, whose predicate lives in `DocumentRepository.findVisibleTo` so the list and
single-document lookups cannot drift: ADMIN sees everything; everyone else sees their own
university or company, plus rows they uploaded. Cross-institution deletes return 404, never 403, so
ids cannot be probed. `DocumentScopeBackfill` resolves pre-scope rows from the uploader's account on
boot and deliberately leaves unresolvable rows (deleted accounts, institution-less admins)
unscoped rather than guessing them into the wrong tenant. `DocumentScopeTest` (11) and
`DocumentScopeBackfillTest` (7) cover it.

**PC3a also fixed a latent test-isolation defect:** `AuthFlowIntegrationTest` registered users
without `@Transactional`, committing them into the shared H2 (`DB_CLOSE_DELAY=-1`) and breaking
`MigrationCatalogCountTest`'s absolute user count whenever surefire picked a different class order.
It now rolls back.

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

### PC1 — Chart foundations (tokens + shared module)  ·  branch `port/pc1-chart-foundations`
**Scope correction, verified during implementation**: the earlier draft of this plan assumed fred's
charts were unstyled and that porting the 32 `.progress-chart*` rules from
`origin/Chris:App.css` was the fix. That is false. Those rules style a **class-name-based**
implementation that only exists in Chris's and developer's `StudentDashboard.js`; fred's
`OverviewSection.js` is pure Tailwind, and **all 143 of its literal classes are emitted in the
built CSS** (verified against `build/static/css/main.*.css`). Porting the rules would have added
~200 lines of dead CSS. The real gap is **17 hardcoded hexes in SVG attributes, recharts fills,
and chart chrome that never respond to the dark-mode toggle**. PC1 therefore does:

1. Add a dedicated `--chart-*` token block to `App.css` with light and `.dark` variants, and create
   `src/charts/colors.js` exporting `CHART`, `CHART_DARK`, `STATUS_COLORS`, `STATUS_COLORS_DARK`,
   `TRACK`, `TEXT`, `MUTED`, `SERIES`, plus `chartTheme()`, `chartColor()`, `seriesColor()`.
   The JS mirror exists because SVG `fill`/`stroke` and recharts `<Cell fill=>` cannot reliably
   read CSS custom properties.
2. Create `src/charts/ProgressCharts.jsx` exporting `Legend`, `StatusHeadings`,
   `StackedBarChart`, `DonutChart`, `LineChart` — minus `GroupedBarChart`. Changes vs the inline
   originals: charts take a `statuses` array and sum rows generically, so PC2 can change the
   status vocabulary without another rewrite; `DonutChart` accepts arbitrary `entries` so PC4's
   offers funnel reuses it; colors and track/tick/text resolve through `chartTheme(isDark)`;
   `role="img"` + descriptive `aria-label` on each SVG; `LineChart` measures its own width with one
   `ResizeObserver` instead of a hardcoded 560px viewBox; day labels abbreviate so six columns fit
   narrow screens; the stacked-bar background gets a dark-mode variant.
3. `OverviewSection.js` imports from `src/charts/` and drops its four local chart definitions
   (420 → 195 lines). Its dark-mode gradient backgrounds and axis text now follow the theme.
4. `UniversityDashboard.js` drops the local `CHART_COLORS` array and its seven `isDark ? '#…' : '#…'`
   ternaries, routing all 24 hexes through `chartColor()`, `seriesColor()`, and `chartTheme()`.
   Dark mode now has a real palette instead of only swapping grid and tick colors.
5. Keep `tasksData` feeding the charts unchanged in this phase (data swap is PC2) — purely visual
   and structural, so a regression here is unambiguous.
6. **Verified gates**: build `Compiled with warnings`, **9 warnings, unchanged and all pre-existing**;
   backend suite **136 green**; frontend **2 suites / 8 tests** green; all 259 literal classes in
   the new and edited files confirmed emitted in the built CSS; `--chart-*` tokens present in the
   built stylesheet; eslint clean on every touched file (the one remaining warning,
   `UniversityDashboard.js:109`, is pre-existing and untouched).
   **Commit**: `fix(dashboards): route charts through shared palette and extract chart module (PC1)`

### PC2 — Real data behind the student charts  ·  branch `port/pc2-real-chart-data`
1. Rewrite `StudentDataContext` to aggregate **real diary data**:
   - load via the existing `fetchMyDiaries()` (`GET /api/diaries/me`) — no backend change;
   - `dailyProgress`: buckets **Mon–Sat** (matching `tasksData.js:18` `WEEKDAYS`, *not* Mon–Sun)
     of the current week keyed off `entry.date`, two segments where `Reviewed` = the entry has a
     **non-blank** `universitySupervisorComment`. `DayDiaryApiController.java:175` defaults that
     field to `""`, so a truthy check would mislabel every untouched entry as reviewed — hence
     `isReviewed()` trims before testing, and a test pins that;
   - `statusTotals`: `{ Reviewed, 'Awaiting review' }` across **all** time, while `dailyProgress`
     is scoped to the current week — the two deliberately answer different questions;
   - Sunday entries are dropped: the internship working week is Mon–Sat, so a Sunday entry belongs
     in `statusTotals` but has no weekday column;
   - expose `loading` + `error` + `reload` so charts render a skeleton and a retry banner instead
     of zeros on failure;
   - no compat shim for `{completed, inProgress, uncompleted}` — `GroupedBarChart` is already gone
     from PC1.
2. Update `OverviewSection.js` copy to the real meaning: the header becomes "Internship Progress /
   Diary review overview", KPI cards become Total Entries / Awaiting Review / Reviewed / This Week,
   and the fake "To-Do List" becomes "Recent Diary Entries" backed by real submissions. Cards
   render `ChartSkeleton` while loading and an `role="alert"` retry banner on error.
3. **Delete `src/data/tasksData.js`** — the 1,000-fake-task generator. Verified zero remaining
   references after the rewrite.
4. Student placement card (P7) stays; charts complement it.
5. **Verified gates**: frontend **3 suites / 16 tests** green (8 new in
   `src/context/StudentDataContext.test.js` covering the blank-comment trap, week boundaries,
   Sunday and unparseable dates, and non-NaN columns); build **9 warnings, unchanged**; backend
   **136 green, untouched**; eslint clean on all touched files.
   **Commit**: `feat(student): drive progress charts from real day-diary data (PC2)`

### PC3 — File Management: real API, then real UI  ·  branch `port/pc3a-file-model` → `pc3b-file-api-ui` → `pc3c-file-layout`
This phase is split because the model gaps are the real blocker: the UI cannot be "wired to the
real API" when the real API has none of the fields the UI already renders.

**PC3a — Document model + read scoping** · branch `port/pc3a-file-model` — **DONE**
1. **Read scoping decided and implemented: institution-scoped** (the recommendation from §0.4).
   `Document` carries nullable `universityId`/`companyId`; new uploads are stamped from the
   authenticated uploader's own `UserEntity`. ADMIN reads everything; everyone else reads their own
   university or company plus their own uploads.
2. Fields the UI already implies added: `audience`, `version`, `description`, `downloadCount`
   (defaults to 0), `shareToken` (nullable, unique). `fileData` LOB kept as-is — removing it is a
   separate storage decision, not chart work.
3. `DocumentRepository.findVisibleTo` / `findVisibleById` hold the predicate in one place;
   `DocumentScopeService` is the only caller. Uploads accept `audience`/`version`/`description`
   params, blank values stored as NULL. Deletes stay ADMIN/SUPERVISOR-only and now also refuse
   other institutions' rows with **404** (matching the university-scope convention).
4. `DocumentScopeBackfill` (idempotent `CommandLineRunner`, `@Order(45)`) resolves pre-scope rows
   from the uploader's account. Unresolvable rows stay unscoped and ADMIN-only. No Flyway/Liquibase
   exists and production uses `ddl-auto=update`, so additive nullable columns plus a startup backfill
   is the reversible option; introducing a migration tool here would need the schema baselined first.
5. `DocumentScopeTest` (11) covers university/company isolation, ADMIN, unscoped rows, the uploader
   clause, cross-tenant delete → 404, and upload scoping. `DocumentScopeBackfillTest` (7) covers
   resolution, unresolvable rows, no overwrite of already-scoped rows, idempotency, and defaults.
   Backend **153 green** (136 + 17); frontend untouched at **3 suites / 16 tests**; build **9 warnings**.
**Commit**: `feat(files): scope documents by institution and add file metadata (PC3a)`

**PC3b — API + frontend wiring** · branch `port/pc3b-file-api-ui` — **DONE**
4. Endpoints added, all inheriting PC3a's scope rules:
   - `GET /api/files/{id}/download` — streams the file as an attachment **and** increments
     `downloadCount` server-side. Distinct from `/view` so a preview does not inflate the count.
   - `GET /api/files/usage` — real `documentCount`, `totalBytes`, `totalDownloads`, and a
     per-category breakdown, computed only over rows the caller can see.
   - `PATCH /api/files/{id}/share?enabled=` — creates, regenerates, or revokes the token.
     Regenerating invalidates the previous token, so a leaked link is revocable.
   - `GET /api/files/share/{token}` — public, token-addressed download for recipients with no
     IMS account. `permitAll` in `SecurityConfig` plus method-level `@PreAuthorize("permitAll()")`
     to override the class-level `isAuthenticated()`.
   - `GET /api/files/view/{name}` was closed too: the preview endpoint was still unscoped, so it
     now resolves the stored name through the same visibility predicate. `DocumentScopeService`
     grew `findVisibleByFileName` so this stays O(1) rather than scanning every visible row.
5. `FileManagement.jsx` rewritten off `localStorage`:
   - `useState` + `useEffect` + `loadData()` per `UniversityStudents.jsx`, with loading skeletons,
     an error banner and a retry button, and an `aria-live` region.
   - Every mutation (delete, bulk delete, share toggle, upload) calls `loadData()` rather than
     patching local state, so a rejected write cannot leave a phantom row on screen.
   - Upload keeps real progress via `XMLHttpRequest` — `fetch` cannot report upload progress.
   - Download opens `/api/files/{id}/download` (with a `window.open`-blocked fallback) and reloads
     so the displayed count is the server's.
   - `api.js` gained `fetchDocuments`, `fetchDocumentUsage`, `deleteDocument`,
     `updateDocumentShare`, and `uploadDocument`.
6. **Fiction removed** rather than ported. The card claimed "of 500 MB LocalStorage quota" and
   "Encrypted — Secured in browser (Base64)" against a hardcoded `maxStorageBytes`; neither was
   real. Usage now comes from the endpoint and the bar is proportional to actual documents. The
   "Load Official Templates" button, which fabricated six fake rows client-side, is gone. The
   fabricated preview document body is still outstanding here and is closed in PC3c.
   `Document.normalizeCounters()` (`@PostLoad`) keeps `downloadCount` non-null on rows that
   `ddl-auto=update` created as NULL.
7. Preserved: upload, download, count bump, share-link copy, search, category filter, audience
   badges. `FileApiTest` (17) and `documentApi.test.js` (8) added. Backend **170 green**;
   frontend **5 suites / 28 tests**; build **9 warnings, unchanged**.

**PC3c — Layout** · branch `port/pc3c-file-layout` — **DONE**
7. Chris's `.file-management*` / `.storage-bar` CSS was **not ported**. That stylesheet is a
   class-based skin with no dark mode and hand-picked light-mode hexes; fred's
   `FileManagement.jsx` is Tailwind, exactly as with the PC1 chart CSS. The structure was taken,
   the CSS was not: `RepositorySidebar` is a 260px Tailwind rail
   (`grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)]`), with the analytics card and document table
   in the main column. No `.file-management*` rules exist in fred's `App.css`, so the
   previously-dead selectors stay dead rather than being resurrected.
8. **`fa-*` icons replaced with `lucide-react`** as planned, but the reference's *contents* had no
   mapping onto this data model and were not copied: Chris's rail hardcoded a "Trial Version /
   100 GB Space" plan card, eight fictional quick-access buckets (Videos, Music, Apps), and
   folders named "Tivo admin" / "Viho admin" with invented counts. Quick Access is now the six
   real categories with live counts from `GET /api/files`; the folder rail shows real per-category
   file counts and byte totals.
9. Category hues now index the shared categorical palette via `chartColor(cat.tone, isDark)`, so
   they follow the dark-mode token swap instead of being fixed light-mode hexes. Fixed a silent
   bug found on the way: `KpiCard`'s string `icon` prop only resolves a fixed `ICON_MAP`, so
   `icon="ShieldCheck"` was rendering `DollarSign`; it now passes the component.
10. Duplicate controls removed rather than shipped twice. The category filter existed as both
    sidebar links and an analytics-card chip row bound to one state; the search box existed in both
    the sidebar and the table toolbar. The sidebar owns both now, and the analytics bar segments
    remain clickable so the two views stay in sync.
11. **The preview-modal fiction is gone.** It previously drew a fixed mock page for every
    document — "REPUBLIC OF UGANDA — INTERNSHIP PORTAL", "Section 1: General Requirements",
    "Page 1 of 4", "Integrity Verified" — so a CSV and a scanned MoU rendered identically, and
    the claimed verification was never performed. `DocumentPreviewBody` now renders real bytes:
    images via `<img>`, PDFs via the browser viewer on the inline `/view` response, text formats
    fetched and length-capped, and anything else says plainly that it has no inline preview. A
    failed preview load reports the error rather than rendering an empty page, and a blank
    description no longer falls back to invented prose.
    `FileManagement.test.js` (7) asserts the fabricated copy is gone and the real path works.
    Backend **170 green, untouched**; frontend **6 suites / 35 tests**; build **9 warnings**.

**Gates** (each sub-phase): build ≤9 warnings; full backend suite green; manual smoke: upload →
progress → appears in category → download bumps count → share copies link → other company 404s.

### PC4 — Company dashboard analytics + supervisor modal convergence  ·  branch `port/pc4-company-analytics` — **DONE**
**Decision**: fred's P6 `/api/companies/me/supervisors` stays the canonical supervisor API
(company-scoped by construction, L7/L21-compliant, tested by `CompanySupervisorCreationTest`).
Cherry-picked **concepts**, not the parallel backend; developer's `CompanyDashboard.js` and
`CompanySupervisorController` were read only.
1. **The modal's 7 fields reconciled to 5 against P6, and the two dropped fields are the
   interesting part.** The reference had `sup-username` and `sup-role` inputs. P6 does not
   accept either: `CompanyPeopleService.createFieldSupervisor` *derives* the username from the
   name with a uniqueness loop, and hardcodes `Role.SUPERVISOR` with the company id set. Keeping
   those inputs would have collected values the server silently discards — and the free-text
   "Role / Job Title" field in particular reads like an access control while setting nothing.
   The shipped form has exactly the five fields P6 persists, and explains the derived username
   in helper text rather than pretending to collect it.
2. `GET /departments` skipped as planned; `CompanyDepartmentRepository` was not touched.
3. `GET /api/companies/me/analytics` added, taking **no company id on the request** — the
   authenticated user is the only source of scope, so there is nothing to tamper with. Two new
   queries, both genuinely required:
   - `PlacementRepository.countByCompanyStatusGrouped(companyId)` — the only existing status
     aggregate was university-filtered.
   - `EvaluationRepository.averageOverallGradeByCompanyId(companyId)`, which **joins through
     `Placement`**. `Evaluation` has no `companyId`, so the company-scoped average cannot be
     written against its own columns; filtering on `e.universityId` would have pulled in
     evaluations recorded against *other* companies' placements. `CompanyAnalyticsTest` pins this
     by giving company B a perfect score and asserting A's average stays at its own 90.
   - Returned shape: all **six** statuses always present (zero-filled, so the donut has no gaps),
     plus `interns`, `internCount`, `avgEvaluation`, `evaluationCount`.
4. **Overview tab** added as the landing tab. Four KPI tiles, the offers donut from
   `src/charts/ProgressCharts.jsx`, and per-intern onboarding rows adopting the reference's
   `renderProgress` concept — list-first, as §1 requires. The developer's version computed the
   percentage from two booleans in the browser; the two facts behind it (start date recorded,
   evaluation filed) now come from the same scoped service, and the percentage is derived on one
   side only.
   Two judgement calls worth recording: **cancelled placements are shown as a donut segment but
   excluded from the "Pipeline" headline**, because a cancelled placement is not progress; and an
   **absent evaluation average renders as `—`, never `0%`**, since zero would read as a real score.
5. Progress rows are **one per intern, not per placement** — a student can hold several
   placements at one company, and "how is this person doing" has one answer. The row reports the
   furthest non-cancelled status. Evaluations load in one batched query rather than N+1.
6. `PATCH /api/companies/me/supervisors/{id}` added so the modal's edit path is real rather than
   a second account created under the same name. Scoped through the existing
   `requireOwnSupervisor`, so another company's supervisor is forbidden. Names are deliberately
   **not** editable: the login username is derived from them, and changing one without the other
   would desynchronise the pair.
7. **Verified gates**: backend **179 green** (170 + 7 `CompanyAnalyticsTest` + 2
   `CompanySupervisorCreationTest`); frontend **7 suites / 45 tests** (10 new in
   `CompanyDashboard.test.js`); build **9 warnings, unchanged**; eslint clean on all touched files.
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
| A hand-rolled hex survives the token pass → dark mode regression | PC1 verified zero remaining hexes in both chart files, and 9 warnings unchanged |
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
