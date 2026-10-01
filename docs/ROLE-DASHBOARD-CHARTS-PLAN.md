# Role Dashboards & Grounded Analytics — PC6–PC13

**Goal**: make every role dashboard open on a useful Overview, and make every chart answer a
question that the database can actually answer. Fix the honesty bugs that make existing charts
mislead. Add only the schema needed to answer the questions we cannot answer today.

**Status**: plan only. No phase below has been implemented. Every measurement quoted here was
produced by running the command or query named next to it on 2026-10-01 against `fred` @ `3d6141b`
and the local MySQL profile. Nothing is carried over from an earlier document on trust.

**Relationship to `DASHBOARDS-CHARTS-FILEMGMT-PLAN.md`**: that document owns PC1–PC5 and they are
done and merged. This document does not reopen them. It records what PC1–PC5 built (§1.1) so no
work is repeated, and continues the numbering at PC6.

**Discipline (unchanged)**: one branch per phase off `fred` → implement → gates green → commit
with a clean conventional message and **no acknowledgements or footers of any kind** → verify
`git cat-file commit HEAD | grep -ci codebuff || echo "no codebuff"` →
`git checkout fred && git merge --ff-only port/pcN-…`. Never stack phases. Never check out or
modify `origin/Chris` / `origin/developer`.

**Measured gates on `fred` @ `3d6141b`** (re-run 2026-10-01, not copied):

| Gate | Command | Baseline |
|---|---|---|
| Backend | `backend/start.sh clean test` | **189 tests, 0 failures**, `BUILD SUCCESS` |
| Frontend tests | `cd frontend1/ims && CI=false npx react-scripts test --watchAll=false` | **9 suites, 65 tests, all pass** |
| Frontend build | `cd frontend1/ims && CI=false npm run build` | `Compiled with warnings` |
| ESLint | `cd frontend1/ims && npx eslint src --ext .js,.jsx` | **0 errors, 9 warnings** |

`CI` must be unset or `CI=false`, or `react-scripts` promotes warnings to errors. `./mvnw` alone
is not a gate: `backend/start.sh:11` selects the complete JDK at
`$HOME/.local/jdks/jdk-17.0.13+11`; a bare `./mvnw` can fall back to the incomplete system JRE and
fail with `error: release version 17 not supported`.

**There is no CI workflow in this repo** — verified: no `.github/workflows`, no Dockerfile, no
docker-compose, no deploy script. The only script is `backend/start.sh`, which runs Maven. All
gates are therefore manual, and every phase below states its gates explicitly for that reason.

---

## 0. Evidence policy

Every claim in this plan carries one of three labels. A chart may not ship without its source
being [VERIFIED] first.

- **[VERIFIED]** — proven by a named file and line, or by a query whose result is quoted here.
- **[DERIVED]** — follows mechanically from verified columns and the actions the existing UI
  already permits. Arithmetic, not observation.
- **[HYPOTHESIS]** — a plausible human need that source code **cannot** establish.

**Frequency is never claimed.** Source code cannot tell us what anybody "constantly asks". §3
lists the questions each role's data can answer. That is a statement about the data, not about
demand. Turning any [HYPOTHESIS] into a design commitment requires the validation in PC13.

This matters because the most tempting failure mode for a dashboard project is to invent a
"what users need" narrative and then find data to fit it. The label makes that visible in review.

---

## 1. Verified findings

### 1.1 Chart inventory — 13 charts, in 4 of 24 tabs

Counted by `grep -c "card('" UniversityDashboard.js` (8), `role="img"` in `AdminDashboard.js` (1),
`DonutChart` in `CompanyDashboard.js` (1), and `StackedBarChart`/`DonutChart`/`LineChart` in
`OverviewSection.js` (3).

| Dashboard | Charts | Tab | Overview first? | Default tab | Verdict |
|---|---|---|---|---|---|
| Admin | 1 (PC5) | `overview` | yes — `AdminDashboard.js:650` | **`students`** (`:56`) | only chart unreachable on landing |
| University | 8 | `analytics` | **no Overview tab exists** (`:1373-1378`) | `students` (`:73`) | charts one click away |
| Company | 1 (PC4) | `overview` | yes (`:742`) | `overview` (`:61`) | correct |
| Student | 3 | `overview` | yes (`:470`) | `overview` (`:40`) | correct |

Tab counts read from the `tabs`/`id:` arrays: Admin 5, University 6, Company 5, Student 8 = **24
tabs, of which 4 contain charts. 20 tabs contain none.**

The load-bearing finding is not "20 tabs lack charts" — many of those tabs are forms and lists
where a chart would be noise. It is that **the two roles carrying the heaviest oversight load,
Admin and University, have charts that neither of them sees when they log in.** University has 8
charts and no Overview; Admin's single chart is first in the tab array but `useState('students')`
means the app opens on tab two.

### 1.2 Data that does not exist (caps every possible chart)

Each row verified by reading the entity; the `Placement`/`Evaluation` field lists are exhaustive
`private` declarations with no date member.

| Gap | Evidence | Consequence |
|---|---|---|
| `Placement` has no dates | `Placement.java` — fields are `id, studentId, companyId, universityId, universitySupervisor, companySupervisor, universitySupervisorId, companySupervisorId, status` | no funnel-over-time, no time-to-placement, no duration |
| `Evaluation` has no dates | `Evaluation.java` — `id … supervisorUserId` then seven `Integer` scores; no date | no score trends, no "improving or declining" |
| `Vacancy` has no applicants | no application entity in the model | no hiring funnel |
| `Student` has no `createdAt` | `Student.java` | no cohort/retention analytics |
| `UserEntity` has no `lastLoginAt` | `UserEntity.java` | no engagement analytics |
| `audit_logs` is unindexed | `AuditLog.java:12` `@Table(name = "audit_logs")`, no `@Index` | any time-bucketed query full-scans |
| `DayDiary.status` is a free-text `String` | `DayDiary.java:39` `private String status = "PENDING"` | status vocabularies can drift (see §1.3.2) |

`Placement.Status` declares six values (`Placement.java:16-23`): `PENDING, OFFERED, ASSIGNED,
ACTIVE, COMPLETED, CANCELLED`. These are **not** vestigial — they are the intended lifecycle, and
every surface in the product already assumes them (full evidence and the resulting defect in
§1.3.4). The defect is the opposite of a stale enum: the **pipeline stops early**. It assigns only
`OFFERED` (`:73`), `ASSIGNED` (`:104`) and `CANCELLED` (`:126`), and exposes exactly three
transitions — `POST /api/placements` (company offer), `/{id}/approve`, `/{id}/reject`. Nothing can
move a placement to `ACTIVE` or `COMPLETED` through normal flow, so "this intern is currently
working" and "this intern finished" are states the application cannot express. That is the gap, and
it gates PC8 — see §PC8a.

### 1.3 Live correctness bugs (all verified; none were in PC1–PC5 scope)

**1.3.1 — Evaluation scores have three conflicting scales.** The single most consequential finding.

| Where | Says |
|---|---|
| `EvaluationForm.jsx` — eight inputs | `min="0" max="100"` (8 occurrences, e.g. `:203-204`, `:304-310`) |
| `UniversityDashboard.js:1142` | `<PolarRadiusAxis domain={[0, 10]} …>` |
| `UniversityDashboard.js:1136` | label text "Mean scores across evaluation criteria (0-10)" |
| `UniversityDashboard.js:1149` | aria-label "Mean evaluation scores out of 10" |
| `StudentProfile.jsx:987` | renders `{ev.overallGrade}%` |
| `EvaluationDataSeeder.java:26` | writes `8, 7, 9, 7` |

Decisive query — `SELECT COUNT(*), SUM(… > 10), MAX(…) FROM evaluations;` on the local MySQL
profile:

```
total    rows_over_10    max_any
2        0               9
```

**Zero rows exceed 10, and the maximum stored value is 9.** Combined with the seeder writing
single digits, the stored convention is already 0-10. The form is the outlier.

Root cause worth stating plainly: `Evaluation.java` has **no `@Max`, no `@DecimalMin`, no
`@Min`, and no validation at all** on any of the seven score fields. The scale has never been
enforced server-side, so it drifted in three places. Clamping the input alone would not prevent
the next drift; PC6a therefore adds server-side validation as the substantive fix.

**1.3.2 — `REJECTED` diaries silently vanish from the university pie.**

`DayDiaryReviewModal.jsx:6` offers the supervisor four choices:
`['PENDING', 'APPROVED', 'NEEDS_REVISION', 'REJECTED']`. But
`UniversityDashboardService.java:266-269` zero-fills only three keys, and `:271` drops any status
not already in the map:

```java
statuses.put("PENDING", 0L);
statuses.put("APPROVED", 0L);
statuses.put("NEEDS_REVISION", 0L);
for (Object[] row : dayDiaryRepository.countByStatusGrouped(universityId)) {
    String status = (String) row[0];
    if (status != null && statuses.containsKey(status)) {   // <-- REJECTED discarded
        statuses.put(status, (Long) row[1]);
    }
}
```

So a rejected diary is selectable in the UI, recorded in the database, and then invisible in the
chart — while the pie's own total silently disagrees with the diary count. Live DB currently holds
only `PENDING` (2 rows), so this is latent rather than firing today.

**1.3.3 — Fabricated data still ships to students.** PC2 deleted `src/data/tasksData.js` but a
second generator survived. `InternshipProgress.jsx:12-20`:

```js
const INITIAL_TASKS = [
  { id: 1, title: 'Check validation involves making sure all your tags are properly closed and nested.', status: 'In Progress', date: '10 Nov' },
  { id: 2, title: 'Test the outgoing links from all the pages to the specific domain under test.', … },
  …
];
```

These are lorem-ipsum QA notes with invented dates, seeded into local state
(`InternshipProgress.jsx:50` `useState(INITIAL_TASKS)`) and presented to the student as their own
internship checklist. They render as seven completed/in-progress/pending counters at
`InternshipProgress.jsx:192-198`, and `addTask` (`:99`) appends to the same array — so a student's
"Completed: 2" is counting lorem-ipsum strings, not their work.

To be precise about what is *not* affected: the headline `percentage` (`:86`) is computed from
`steps`, which is derived entirely from `/api/students/me/progress` and the real diary count. The
fabricated tasks do not inflate it. The honesty defect is confined to the task list and its three
counters — still a violation, just a narrower one than it first appears. See §3.5 for the separate
question of whether those diary-count thresholds are themselves justified.

Directly violates the no-guesswork requirement.

**1.3.4 — The university placement pie drops `OFFERED`, the state the pipeline actually creates.**
Third instance of the same defect class as §1.3.2. `UniversityDashboardService.java:440-442`
zero-fills **all six** statuses by iterating `Placement.Status.values()`, so `byStatus` carries a
correct `OFFERED` count. But `UniversityDashboard.js:857` re-declares a hardcoded five:

```js
const statuses = ['ACTIVE', 'COMPLETED', 'PENDING', 'ASSIGNED', 'CANCELLED'];
```

and the "Placement Status" pie maps over that array. So `OFFERED` — set at
`PlacementPipelineService.java:73`, i.e. the first state any real placement passes through — is
counted by the backend and thrown away by the chart. Whenever any placement sits at `OFFERED`, the
pie's total silently disagrees with the total number of placements.

PC4 got this right: `CompanyDashboard.js:42-47` lists all six. So the fix is to derive the array
from the payload (`Object.keys(byStatus)`) rather than restate it, which also stops the two charts
drifting apart again.

### 1.4 A persona with no dashboard

Verified end to end:

1. `CompanyPeopleService.java:90` creates field supervisors as
   `new UserEntity(…, Role.SUPERVISOR)` with `setCompanyId(companyId)` (`:91`) and **no
   `universityId`**.
2. `AuthContext.js` `ROLE_HOME.SUPERVISOR` → `/university/dashboard`.
3. `UniversityApiController` resolves the university from `u.universityId` and returns HTTP 400
   `"Your account is not linked to a university."`

These users are routed to a dashboard that rejects them, every time.

Live DB check of whether any such accounts exist:

```sql
SELECT role,
       SUM(university_id IS NOT NULL AND company_id IS NULL)     AS univ_only,
       SUM(company_id  IS NOT NULL AND university_id IS NULL)     AS field_sup_only,
       SUM(university_id IS NOT NULL AND company_id IS NOT NULL) AS both_set,
       SUM(university_id IS NULL     AND company_id IS NULL)     AS neither_set,
       COUNT(*) AS total
FROM users WHERE role = 'SUPERVISOR' GROUP BY role;
```

```
role        univ_only   field_sup_only   both_set   neither_set   total
SUPERVISOR  2           0                0          0             2
```

**Both existing `SUPERVISOR` accounts are university supervisors. Zero field supervisors exist in
this database.** The single `industrial_supervisors` row points at `user_id=5`, whose role is
`COMPANY` (`airtel`), not `SUPERVISOR`.

This is why PC7 contains **no speculative backfill** — there is nothing here to backfill, and
writing a migration for rows proven absent would be exactly the guesswork this plan forbids.
Production may differ, which is what PC7's pre-flight is for.

### 1.5 Deployment reality (constrains PC7 and PC10)

- No CI, no container, no deploy script (§ "Measured gates"). **A deploy-time gate has no hook to
  attach to.**
- `spring.profiles.active=mysql` (`application.properties:8`) and
  `spring.jpa.hibernate.ddl-auto=update` (`:16`). For this app, "deploy" *is* starting the JVM
  against MySQL — so **startup time is the natural home for a verification check.**
- No migration tool. No Flyway, no Liquibase. Schema changes are hand-run idempotent scripts in
  `backend/migration/`, each with its run command in a header comment. `add_student_gender.sql` is
  the reference pattern: `information_schema` probe → `PREPARE` → conditional `ALTER`.
- **`schema.sql` has drifted from the live DB.** `schema.sql:11` declares
  `role varchar(255) not null`, but the live column is
  `enum('ADMIN','COMPANY','STUDENT','SUPERVISOR')` (verified via `SHOW COLUMNS FROM users`).
  Anyone provisioning a fresh database from `schema.sql` gets a `varchar` role column that
  diverges from every existing environment. PC7 tracks this.

---

## 2. User decisions taken (2026-10-01)

Recorded so a later reviewer sees these as choices, not accidents.

| # | Decision | Rationale / consequence |
|---|---|---|
| D1 | Add a new `INDUSTRIAL_SUPERVISOR` role | Clean persona separation. Costs the largest authorization sweep in this plan (§7.4): **47** `@PreAuthorize`/`hasRole` sites and **94** total `SUPERVISOR` mentions in the backend, **52** across **14** frontend files. |
| D2 | Canonical score scale is **0-10**; fix the form | Matches the only stored data (`max_any = 9`). Requires clamping 8 form inputs + `@Max(10)` on 8 entity fields + removing the `%` suffix. |
| D3 | Add **placement dates *and* Vacancy applicants** | Opens funnel-over-time and hiring-funnel questions. Largest schema surface: `Placement` lifecycle columns, `Student.createdAt`, `UserEntity.lastLoginAt`, a `PlacementStatusHistory` entity, and a new `Application` entity. |
| D4 | Add audit indexes; **defer** admin activity charts | Cheap index work now, chart surface later. |

### 2.1 One consequence of D1 that must not be glossed

`users.role` is a MySQL `enum`, and this project has **no migration tool**. Adding a role value
means `ALTER TABLE users MODIFY COLUMN role ENUM(…)`, which is a table-rewrite `ALTER` on a
locked column. Consequences written into PC7:

- The `ALTER` is hand-run and idempotent, not auto-applied.
- `ddl-auto=update` might widen it anyway, but enum-alter behaviour is Hibernate-version-dependent
  and widening a column is exactly the case that should be **stated, not inferred**.
- Because the `ALTER` only *adds* a permitted value, it cannot destroy or orphan data — so **no
  rollback script is needed**, and PC7 says so rather than inventing one for a non-destructive
  widening.

### 2.2 One consequence of D2 that must not be glossed

Clamping to 0-10 means a genuinely stored 0-100 value would surface as a validation failure on
edit. **Measured: 0 such rows.** No backfill is needed, and writing a rescaling migration would
*create* the bug — it would rewrite valid rows (9 → 90). PC6a therefore contains no data script at
all.

---

## 3. Per-role question map

Derived strictly from columns that exist. "Answerable" is a fact about the schema; "frequently
asked" is **not claimed anywhere in this table** (see §0). Anything a chart would need beyond these
is marked *blocked* with the phase that unblocks it.

### 3.1 ADMIN — institutional oversight

| Question | Data used | Chart | Today |
|---|---|---|---|
| How many students per university? | `Student.universityId` | horizontal bar | **done PC5** |
| How many students lack a placement? | `Placement.status` | stacked bar | gap — current state only |
| Which students are never filing diaries? | diary-attention query | table | **done PC5** |
| Where is the diary backlog concentrated? | `DayDiary.status` | bar by university | gap |
| Which universities have unevaluated students? | `Evaluation` per student | table | gap |
| How many role requests are pending? | `RoleRequest` | KPI | gap |
| Is the system secure? | `AuditLog`, `lockedUntil`, `failedLoginAttempts` | — | **deferred by D4**; PC10 makes it feasible |

### 3.2 UNIVERSITY SUPERVISOR — cohort health and compliance

| Question | Data used | Chart | Today |
|---|---|---|---|
| Who is falling behind on diaries? | diary-attention | attention list | **done PC5** |
| Cohort composition (year, gender, school, programme, company) | `Student` fields | 5 charts | **done** |
| Placement distribution | `Placement.Status` | pie | **done** |
| Diary review mix | `DayDiary.status` | pie | **done but wrong** (§1.3.2) |
| Mean evaluation scores | 7 × `Integer` | radar | **done but wrong scale** (§1.3.1) |
| Which students have never been evaluated? | `Evaluation` per student | distribution | gap |
| Is placement rate improving? | needs PC8a+PC8b | line | **blocked → PC8** |
| How is each programme progressing? | `Student.programmeId` + placement | grouped bar | gap |

`universityId` is `Long` in `UserEntity:40` and `Student:23`, `schoolId` and `programmeId` are
`Long` (`Student:75,81`), but the live `users.university_id` column is `int`. New queries must cast
explicitly or they will fail on some datasets — noted as a PC6/PC12 test concern, not assumed away.

### 3.3 INDUSTRIAL / FIELD SUPERVISOR — own interns

| Question | Data used | Chart | Today |
|---|---|---|---|
| Who am I supervising? | `IndustrialSupervisor.userId` → `Placement` | KPI | **no dashboard exists** |
| Are my interns filing diaries? | `DayDiary` | bar | blocked → PC7 |
| Have I completed their evaluations? | `Evaluation.supervisorUserId` | KPI | blocked → PC7 |

Entire persona is blocked on PC7. No chart can be specified honestly before the persona exists.

### 3.4 COMPANY — hiring and intern performance

| Question | Data used | Chart | Today |
|---|---|---|---|
| Offer pipeline | `Placement.status` | donut | **done PC4** |
| Intern performance | `Evaluation` scores | radar | **done PC4** (same scale caveat) |
| Applications per vacancy | needs `Application` | funnel | **blocked → PC9** |
| Is placement pace improving? | needs PC8a+PC8b | line | **blocked → PC8** |
| How many interns are active now vs finished? | `Placement.status` | KPI | **already answerable** — all six states render today; the transitions that reach them do not |

### 3.5 STUDENT — am I on track?

| Question | Data used | Chart | Today |
|---|---|---|---|
| Is my diary reviewed? | own diaries | stacked bar + donut | **done PC2** |
| What are my milestones? | `/api/students/me/progress` | progress bar | exists, **misleading** (§1.3.3) |
| How am I scoring? | `/api/evaluations/me` | radar + bars | **gap — real data already available** |
| Is my filing cadence healthy? | own diary dates | line over weeks | gap |

The student evaluation chart is the highest-value gap in this plan. `EvaluationController.java:48-49`
already exposes `GET /api/evaluations/me` to `STUDENT`, and `api.js:688` already wraps it as
`fetchMyEvaluations`. It needs **no backend work at all** — only the PC6a scale fix and a chart.
Note the endpoint is currently wrapped but not consumed by the dashboard, so this is wiring that
already exists, not new plumbing.

`GET /api/students/me/progress` (`StudentController.java:103-119`) deserves its own warning,
because a student reads its output as authoritative:

- `:112` `boolean started = student.getInternshipCompanyId() != null`, returned as `startDate`
  (`:114`). So `startDate` is not a date and not the company name — it is "has an assigned
  company". The field name actively misleads.
- `:111` computes `diaryCount` as `findByStudentIdOrderByDateDesc(...).size()` — it **loads every
  diary row into memory to count them**. Fine at this data volume, but it is the wrong shape and
  will degrade; a `countByStudentId` is the fix if this endpoint stays.
- `:116-117` derive `midTerm` from `diaryCount >= 5` and `finalReport` from `>= 10`.

Those two thresholds are conventions asserted by code. No spec in the repo traces them to a
requirement — they are the same constants as `MID_TERM_DIARIES`/`FINAL_REPORT_DIARIES` in
`UniversityDashboardService`. PC12 may **display** them but must label them as diary-count
thresholds rather than presenting them as official milestones. Inventing a milestone model would be
fabrication.

---

## 4. Phase plan

Each phase is independently implementable, independently testable, and one commit. None depends
on a later phase. PC6 is genuinely independent of PC7–PC13 and can ship alone.

### PC6 — Truthfulness fixes

Five unrelated small correctness bugs. Touch disjoint files, so they can also be five separate
commits. **Nothing else in the plan should be bundled into PC6.**

**PC6a — Evaluation scale → 0-10 (D2)**
- `EvaluationForm.jsx`: `max="100"` → `max="10"` on all eight inputs (4 company criteria, 3
  university criteria, plus `overallGrade`), plus helper text naming the scale.
- `StudentProfile.jsx:987`: drop the `%` suffix.
- `Evaluation.java`: add `@Max(10)` to the eight score fields — the seven criteria
  (`:41,44,47,50,53,56,59`) and `overallGrade` (`:62`) — and add `@Valid` to the request DTO so
  validation actually runs. **This is the substantive fix** — without it the scale drifts again.
- No data script. Justified in §2.2: 0 rows over 10, and a rescaling migration would corrupt them.
- **Tests**: form rejects 11; seeded `8,7,9` round-trip unchanged; `POST` with `11` returns 400;
  `POST` with `9` succeeds. **Gates**: backend 189+3, frontend 65+n, 0 new warnings.

**PC6b — stop dropping unknown diary statuses**
- `UniversityDashboardService.java:266-274`: zero-fill from a single status vocabulary and stop
  discarding rows outside it.
- **Tests**: a `REJECTED` diary appears in the pie; the pie total equals the diary count; an
  unexpected status string does not crash the aggregate.

**PC6c — delete fabricated student progress data**
- Remove `INITIAL_TASKS` (`InternshipProgress.jsx:12-20`) and render an explicit empty state.
- **Tests**: grep gate — zero occurrences of the lorem-ipsum strings in `src`; empty state renders;
  the three task counters read 0 rather than 7/2/2; the milestone `percentage` (`:86`) is unchanged,
  proving the fix did not touch real state.

**PC6d — Admin opens on Overview**
- `AdminDashboard.js:56` `useState('students')` → `useState('overview')`.
- **Tests**: landing render shows the PC5 chart; tab order unchanged.

**PC6e — Show OFFERED on the university placement pie (fix 1.3.4)**
- `UniversityDashboard.js:857`: derive the statuses array from `Object.keys(byStatus)` (or include
  `OFFERED`) instead of the hardcoded five that drop `OFFERED`. This aligns it with the backend's
  `Placement.Status.values()` zero-fill and with `CompanyDashboard.js` (all six). If the backend
  ever adds states, the UI follows automatically.
- **Tests**: a placement at `OFFERED` is rendered in the pie; pie total equals sum of all six
  counts.

*Do not merge PC6d with PC11 — PC6d is a one-line default; PC11 is the University Overview build.*

### PC7 — `INDUSTRIAL_SUPERVISOR` persona (D1)

Three layers, because §1.5 shows there is no pipeline to hang a gate on but startup is a real hook.

**7.1 Startup verification (automatic, primary).** A `CommandLineRunner` that runs the §1.4 query
on boot and logs a warning listing any `SUPERVISOR` rows with `company_id` set and
`university_id` null. Read-only, off every request path, so it cannot slow the app; a false
positive can only produce a log line, never mutate data. Because it re-runs each start, it cannot
be "forgotten" the way a manual checklist can.

**7.2 Explicit idempotent `ALTER` (authoritative).** `backend/migration/add_industrial_supervisor_role.sql`,
following `add_student_gender.sql`'s `information_schema` + `PREPARE` pattern exactly, widening
`users.role`. Header comment carries the manual run command, as every script there does. No
rollback: widening an enum is non-destructive (§2.1).

**7.3 Documented manual pre-flight (belt-and-braces).** The §1.4 query written into this plan for
the operator to run against production before first deploy. Necessary because there is no atomic
deploy here (§1.5) — the startup check in 7.1 observes state *after* Hibernate has already touched
the schema, so a human check *before* that is the only thing that sees the prior state.

**7.4 Code changes.** Add the enum value; update all **47** authorization sites and **94** backend
mentions; update `AuthContext.js`, `nav.jsx`, `Breadcrumb.jsx`, and the **14** frontend files counted
in D1 (§2). Grep gate: no bare `SUPERVISOR` left in an authorization context without justification.

**7.5 Dashboard.** Company-scoped industrial-supervisor dashboard **reusing PC4 components** — no
duplicated charts.

**7.6 `schema.sql` drift fix.** Align `schema.sql:11` with the live `enum` column so fresh
provisioning stops diverging (§1.5).

**7.7 Also closes a known security gap.** `StudentController.java:366-368`:

```java
@GetMapping("/company/{companyId}")
@PreAuthorize("hasAnyAuthority('ADMIN', 'SUPERVISOR', 'COMPANY')")
public List<StudentDto> getStudentsByCompany(@PathVariable Long companyId) {
```

Any `COMPANY` user can pass **any** `companyId` and read another company's student roster. PC7
must scope this to the caller's own `company_id` for non-admins.
**Tests**: field supervisor reaches its company-scoped Overview with 200; university supervisor
behaviour unchanged; the §1.4 400 path no longer reachable; an industrial supervisor requesting
another company's students is refused (403); the enum script is idempotent when re-run.

### PC8 — Placement timeline (D3, part 1)

**PC8a must land before PC8b.** "Internship active duration" and "completed on time" are computed
from timestamps that only the `ACTIVE`/`COMPLETED` transitions can set — and those transitions do
not exist yet (§PC8a). Adding the columns first would produce two dashboards full of empty
charts and an unbounded `OFFERED`/`ASSIGNED` pile-up that better analytics then "explain" as "these
students are stuck". Close the lifecycle first.

**PC8a — Complete the lifecycle (prerequisite).** Add the two missing transitions to
`PlacementPipelineService`, following the existing `approve`/`reject` pattern exactly —
`requirePlacement` → `requireUniversitySupervisor` (or the company-scoped equivalent) →
`scopeServiceSafe` cross-university 404 → `setStatus` → `save` → `notify*` → `auditLogService.log`:

| Endpoint | Guard | Transition | Action |
|---|---|---|---|
| `POST /{id}/start` | `COMPANY` owning the placement, or `ADMIN` | `ASSIGNED` → `ACTIVE` | `startedAt = now`; notify student + university supervisor |
| `POST /{id}/complete` | `COMPANY` owning the placement, or `ADMIN` | `ACTIVE` → `COMPLETED` | `completedAt = now`; notify student + university supervisor |

- Decide `PENDING` deliberately: it is the entity default and the legacy-create default, but the
  pipeline never enters it (companies go straight to `OFFERED`). Either retire it from the
  pipeline's vocabulary or add the `PENDING → OFFERED` step. Do not leave it half-used.
- **Tests**: happy path for each; `ASSIGNED → complete` is rejected (illegal jump); a company
  cannot start another company's placement; cross-university actor gets 404; audit rows written;
  notifications sent to student + university supervisor.

**PC8b — Add the timestamps and queries.** Add `createdAt, offeredAt, assignedAt, startedAt,
completedAt` to `Placement`; add `PlacementStatusHistory`; add `Student.createdAt` and
`UserEntity.lastLoginAt`. Matching `backend/migration/` script, idempotent. Every transition from
PC8a sets its own timestamp.

**Backfill policy: leave every new timestamp NULL. Never invent a date.** A fabricated `createdAt`
would silently corrupt every time-series PC12 builds, which is the exact failure this plan exists
to prevent. Queries must exclude nulls rather than coerce them to epoch.

Queries: funnel-over-time, median time-to-placement, active duration.
**Tests**: nulls excluded from averages; aggregates match a hand-computed fixture; a placement
walked through `start`/`complete` yields a positive non-null duration; a placement that never left
`ASSIGNED` is excluded from duration averages rather than counted as zero.

### PC9 — Vacancy applications (D3, part 2)

New `Application` entity with a lifecycle status, `Vacancy`↔`Application` and
`Company`↔`Application` links, applicant funnel endpoints, applications list UI.
**Tests**: only legal lifecycle transitions; a company sees only its own applicants; funnel counts
reconcile with row counts; applicant PII is never returned to a competing company.

### PC10 — Audit indexes (D4)

Index on `AuditLog.timestamp` plus composite `(entity_type, user_id)`. This is what makes the
deferred admin activity charts (§3.1) feasible without full scans. No behaviour change.
**Tests**: `EXPLAIN` shows the index is used; no functional change.

### PC11 — Overview-first dashboards

The phase that satisfies the original request. Independent of PC7–PC10 and of PC12.

1. **University**: add a real **Overview** tab, first in `tabs` (`:1373`) and default
   (`useState('students')` → `'overview'`, `:73`), surfacing the 8 existing `analytics` charts plus
   the diary-attention count. **No new charts** — this alone makes Overview-first true for
   University and makes 8 finished charts visible on landing.
2. Confirm Admin (PC6d), Company (`:61`), Student (`:40`) land on Overview.
3. **Tests**: for every role, assert the landing render and the tab order — not just that the tab
   exists.

### PC12 — New grounded charts

One commit per chart. PC8b/PC9-gated where noted; unblocked ones ship regardless.

| Chart | Role | Needs | Source |
|---|---|---|---|
| My evaluation scores | Student | PC6a only | `/api/evaluations/me` — **no backend work** |
| Diary filing cadence | Student | — | own diaries via `fetchMyDiaries()` |
| Unevaluated-student distribution | University | — | `Evaluation` per student |
| Programme placement rate | University | — | `Student.programmeId` + `Placement` |
| Placement coverage bar | Admin | — | `Placement.status` |
| Diary backlog by university | Admin | — | `DayDiary.status` |
| Applications funnel | Company | PC9 | new `Application` |
| Placement pace line | Company | PC8b | `Placement` timestamps |

Every chart ships with all of: a real backend source (never a frontend constant), loading + error +
empty states, `role="img"` with a factual description, PC1 dark-mode tokens, a legend when series
count warrants it, and a 390/768/1920 check. `Long`/`int` casting for `university_id` per §3.2.

### PC13 — Documentation and validation plan

Record which §0 [HYPOTHESIS] items exist, and what interview question or product event would
confirm each. Until then no [HYPOTHESIS] justifies a chart's existence on its own.

---

## 5. Gates for every phase

Backend `backend/start.sh clean test` green (baseline **189**); frontend
`CI=false npx react-scripts test --watchAll=false` green (baseline **9 suites / 65 tests**);
`CI=false npm run build` at the unchanged warning budget; `npx eslint src --ext .js,.jsx` with
**0 errors** and no new warnings; every literal CSS class emitted in the built stylesheet; zero
`codebuff` footers in the commit.

There is no CI to enforce any of this (§1.5), so each phase must state its gate results in the
commit body or hand to the reviewer.

---

## 6. Risk register

| Risk | Mitigation |
|---|---|
| PC7 sweeps **47** authz sites; one missed `@PreAuthorize` silently widens access | Grep gate in 7.4; PC7 tests cover each persona boundary explicitly |
| Enum `ALTER` on a locked column, hand-run with no migration tool | Idempotent script per `add_student_gender.sql`; startup check reports prior state; widening is non-destructive so no rollback needed |
| Field-supervisor rows exist in production but not locally | §1.4 pre-flight is a documented manual step before first deploy; 7.1 re-checks every boot |
| PC8/PC9 add schema to a live-shaped model | Backfill leaves timestamps NULL; nulls excluded from aggregates; each phase is one reversible commit |
| Placement cannot express `ACTIVE`/`COMPLETED`, so every duration metric is undefined | §PC8a adds the two missing transitions **before** §PC8b adds the columns; `PENDING` retired or given a pipeline step. Recorded because the eight existing `CompanyAnalyticsTest` placements already treat `ACTIVE`/`COMPLETED` as real states |
| PC8b lands without PC8a, yielding empty "active duration" charts and an `OFFERED`/`ASSIGNED` pile-up that analytics misreads as "students are stuck" | PC8a is an explicit hard prerequisite of PC8b, stated in the phase and in this register |
| Chart restates the status vocabulary instead of reading it — already caused the dropped `OFFERED` (§1.3.4) and the dropped `REJECTED` (§1.3.2) | PC6b and PC6e both derive from the payload rather than a hardcoded list; grep review rejects new status arrays |
| A chart ships answering a question nobody has | §0 labels + PC13 validation; §3 states answerability, never frequency |
| Score scale drifts again after PC6a | Server-side `@Max(10)` + `@Valid` is the actual fix, not the input `max` |
| `schema.sql` keeps producing divergent schemas | PC7.6 aligns it with the live enum |
| No browser driver, so chart layout regressions go unnoticed | Manual 390/768/1920 pass recorded per phase; no automated visual claim is made |
| `UniversityDashboardService.evaluations` is **2N+1** — `findByStudentId` is called per student at `:401` and again at `:418` | Latent today (2 students in dev), but PC11 makes this endpoint everyone's landing page and PC12 adds per-student charts. PC11 must replace the per-student loop with one grouped `GROUP BY student_id` query, and prove it with a query-count test |

---

## 7. Out of scope (recorded, not planned)

- **Admin activity and login-failure charts** — deferred by D4. PC10 indexes make them feasible.
- **Vacancy applicant scoring/ranking** and any ML risk prediction — not grounded in this data.
- **CI workflow authoring** — the repo has none (§1.5); gates stay manual.
- **Pixel-level visual automation** — no driver installed; manual pass only.
- **Reopening PC1–PC5** — done and merged; §1.1 and §3 above exist purely to avoid duplicate work.
- **A milestone model for students** — `/api/students/me/progress` thresholds are conventions with
  no traced requirement (§3.5); they may be displayed, not invented or extended.
