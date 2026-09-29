# Integration Plan: Porting Chris's Work into `fred`

Status: Draft · Date: 2026-09-29 · Author: fred · Source: `origin/Chris` @ `7a41d74`

## Context

`fred` is at `8131b0c` and is **not runnable by a fresh clone** — `application.properties:8` sets `spring.profiles.active=mysql`, so boot dies with `CommunicationsException: Connection refused` when MySQL is absent. Chris's branch does not compile at all: 27 files carry unresolved `<<<<<<< HEAD` / `>>>>>>> developer` markers, producing 200 compiler errors.

Two independent problems. This document covers only the second. The first is a separate stabilization effort and must land independently.

## 1. Which commits to take

`origin/Chris` is 9 commits ahead of the shared ancestor `a13d290`. They are not equivalent.

| Commit | Parents | Markers | Verdict |
|---|---|---|---|
| `7a41d74` Merge developer into Chris | 2 | **27 files** | **Never touch.** Breaks the build. |
| `c461bde` Save progress before switching to Chris branch | 1 | **0** | **The only source.** All real work. |
| `424a9b6` Merged origin/developer into Chris | 2 | 0 | Merge bookkeeping only |
| `d7ee6fb` Resolved all conflicts using local changes | 2 | 0 | Wholesale rewrite, 152 files |
| `29d7b53` Merge pull request #28 from ahurirachristian/fred | 2 | 0 | Merge |
| `725a067` worked on student dashboard | 1 | 0 | Ancestor of `c461bde` |
| `ecb75bc`, `84d7243`, `026bfb6` | 1 | 0 | Ancestors of `c461bde` |

Verified: `git grep -lE '^(<<<<<<<|>>>>>>>)' c461bde -- 'backend/**/*.java' 'frontend1/**/*.{js,jsx}'` returns zero files.

`fred` is exactly `a13d290` plus one docs commit, so **"what fred has" == `a13d290`** for every item below.

## 2. `c461bde` is not portable as-is

Two accidents, each verified at the byte level.

**Compile error.** `backend/src/main/java/com/example/demo/auth/OAuth2UserService.java` ends:

```
0000020  \n   }   w          ← 2164 bytes, stray keystroke after the class brace
```

Confirmed via `git show c461bde:… | tail -3 | od -c`. This is the only stray artifact across all 17 changed backend Java files.

**Broken lockfile.** `frontend1/ims/package.json` declares `"recharts": "^2.15.0"`, but `package-lock.json` has no `recharts` key at all (parsed the root `packages[""]` block). `npm ci` hard-fails. Meanwhile `frontend1/ims/src/components/dashboards/UniversityDashboard.js:59` still does `} from 'recharts';` — a file Chris never touched, so the import survives. Her commit also downgrades `lucide-react` 1.31→0.468 and unpins `react-scripts` from `5.0.1` to `^5.0.1`.

**Both `package.json` and `package-lock.json` are therefore excluded from every phase.** `fred`'s versions are already correct and stay untouched.

## 3. What is actually new

Assessed against `a13d290`, field by field. This matters because much of what looks new already exists.

### Take — 8 capabilities

| # | Capability | Files | Backend coupling |
|---|---|---|---|
| 1 | Overview dashboard: KPI tiles, stacked + grouped bars, donut, line chart, filterable to-do list | `OverviewSection.js` (new, 419L), `tasksData.js` (new, 108L), `StudentDataContext.js` (new, 24L) | **None.** Pure mock data, hand-rolled SVG, no `recharts`. |
| 2 | 5 new `DayDiary` columns: `account_number`, `action`, `technology_tools`, `industrial_supervisor_comment`, `university_supervisor_comment` | `DayDiary.java`, `DayDiaryApiController.java` | Self-contained |
| 3 | Diary UI: 7-column table, view modal, split supervisor comments, dedicated page + route | `DayDiariesPage.jsx` (new, 278L), `DiaryReviewModal.jsx`, `StudentDashboard.js` | Needs #2 |
| 4 | `student_settings` table + entity + repo + seeder, `GET`/`PUT /api/students/me/settings` | `StudentSetting.java` (new), `StudentSettingRepository.java` (new), `StudentSettingDataSeeder.java` (new), `StudentSettingsDto.java` (new), `StudentController.java`, `SettingsSection.jsx` (new, 140L) | Self-contained |
| 5 | 6 new nullable columns: `University` gains `email`/`phone`/`physicalAddress`/`website`; `InternshipCompany` gains `phone`/`contactPerson` | 2 entities + 2 seeders | Additive DDL |
| 6 | 4 detail endpoints: `GET /api/students/me/{learning-institute,company,industrial-supervisor,university-supervisor}` | 4 new DTOs, `StudentController.java` | Needs #5 |
| 7 | 4 detail tab components | `CompaniesSection.jsx`, `IndustrialSupervisorSection.jsx`, `LearningInstituteSection.jsx`, `UniversitySupervisorSection.jsx` (all new, 76–78L each) | Needs #6 |
| 8 | To-do list + milestone stepper | `InternshipProgress.jsx` | `/me/progress` already in `a13d290`; Chris's version also prefixes the fetch with `API_ROOT`, fixing the `npm start` bug |
| 9 | 2 new demo accounts `student`/`student123`, `supervisor`/`supervisor123` | `DataSeeder.java` | Self-contained |

### Do not take — already in `fred`

`GET /api/students/me` returns `StudentDto`, and `StudentController.toDto()` at lines 359–426 already populates `universityName`, `companyName`, `companyBranch`, `companyAddress`, `companyWebsite`, `universitySupervisor`, `universitySupervisorPhone`, `industrialSupervisor`, `industrialSupervisorPhone`.

Field-by-field against `StudentDto` after #5 lands:

- `/learning-institute` adds **7 of 8** fields (only `id` is new; `shortForm` is the only field `StudentDto` lacks, and `name` is a derived shortForm/fullName fallback).
- `/company` is a **like-for-like reshape** of what `toDto` already returns — same fields, new endpoint shape. Only `id`, `phone`, `contactPerson` differ, and only `phone`/`contactPerson` are new columns from #5.
- `/industrial-supervisor` adds **3 of 9** (`id`, `companyName`, `email`); `/university-supervisor` adds **3 of 8** (`id`, `universityName`, `email`).

So the endpoints are largely a convenience reshape of `/me` plus the Phase-4 columns — worth taking for the tab UI, but the read value comes almost entirely from #5.

### Do not take — regressions

| Item | Defect |
|---|---|
| `DataSeeder.ensureUser` rewritten to `ifPresentOrElse` | Unconditionally resets password, email, role, `companyId`, `universityId` for all 7 seeded accounts **on every boot**. Fred's `if (isPresent()) return;` stays. |
| `auth/StudentProfileDataSeeder.java` deleted | Removes seed profiles for `2400101003`, `STU-2026-001`, `STU-2026-002`. Nothing references the deletion. Collateral, not refactor. |
| `University.java` +4 accessors, `InternshipCompany.java` +2 | All `return null;`. Replaced by the real columns in #5. Phantom null properties in any Jackson serialization otherwise. |
| `application-mysql.properties` | Lowercases DB name (breaks case-sensitive Linux MySQL) and blanks the password, killing the `MYSQL_PASSWORD` override. |
| `backend/.env` | Same local-dev DB rename + blanked password. Tracked-secret file; being removed in the stabilization effort. |
| `DemoApplication.java` | `scanBasePackages = "com.example.demo"` is identical to the implicit default. No-op. |
| `OAuth2UserService.java` | Stray `w`. |
| `riho.css` | 1052-line diff in `fred..Chris`, but **zero** change in `c461bde` — byte-identical blob SHA `14e054c0` across `a13d290`, `fred`, and `c461bde`. Came from merge parent `424a9b6`. Nothing to port. |
| `App.js` 7 new routes | 5 of 7 are `<h2>Placeholder</h2>`. Her section components are never imported by `App.js` — dashboard tabs only. |
| `nav.jsx` group restructure | `/student/profile` is dropped from nav for STUDENT users; route and component still exist, now unreachable. |
| `package.json` + `package-lock.json` | See section 2. |

## 4. Execution phases

Four branches, each independently mergeable and revertable. Fast-forward into `fred` after each gate passes. No force-push at any point.

### Phase 0 — Baseline

Record the current state so regressions are detectable.

```
cd backend && ./start.sh test          → expect 41 tests, 0 failures
cd frontend1/ims && npm ci && npm run build → expect success
git rev-parse --short HEAD              → 8131b0c
```

Note the surefire reports in `backend/target/surefire-reports/` are dated 2026-08-25. Phase 0 re-establishes a current baseline rather than trusting them.

### Phase 1 — `port/overview-dashboard` (frontend only)

Lands the first user-visible win with zero backend risk.

1. Add `frontend1/ims/src/data/tasksData.js` (verbatim from `c461bde`)
2. Add `frontend1/ims/src/context/StudentDataContext.js` (verbatim)
3. Add `frontend1/ims/src/components/dashboards/OverviewSection.js` (verbatim)
4. `StudentDashboard.js`: default tab `profile` → `overview`; add `overview` to the tab list; wrap `<OverviewSection />` in `<StudentDataProvider>`; convert the render ternary to independent `&&` guards

Explicitly not touched: `package.json`; `OverviewSection` uses no chart library — all four chart types are raw SVG.

Gate: `npm ci && npm run build` succeeds. `./start.sh test` still 41 green (untouched backend). Manual: `/student/dashboard` renders KPI tiles, three chart types, and a to-do list whose 4 filter tabs update the counts.

Merge → `fred`, push.

### Phase 2 — `port/diary-fields` (backend + frontend)

**Backend:**

1. `DayDiary.java` — add 5 fields with `@Column` names matching the above; `@Lob` on `action`, `technologyTools`, and both comment fields
2. `DayDiaryApiController.java` — `toView()` gains all 5 keys (every diary read endpoint returns this map); `GET /api/diaries/export/csv` gains `accountNumber`, `action`, `technologyTools`; `POST /api/diaries/{id}/feedback` reads `industrialSupervisorComment` and `universitySupervisorComment` via `getOrDefault(key, "")` and returns them
3. `PUT /api/diaries/{id}` — **add null-guards Chris lacks.** Her version calls `setAccountNumber(updates.getAccountNumber())` unconditionally, so any request body omitting the key nulls the column. Guard each with `!= null`.

**Frontend:**

4. `DiaryReviewModal.jsx` — 2 new state fields, 2 new textareas, 3 new read-only detail rows, submit body gains 2 keys
5. `StudentDashboard.js` — `emptyDiaryForm` gains 3 keys; `startEditDiary` populates them; 3 new form fields; diary list restructured to the 7-column table; new supervisor-comments block
6. Add `DayDiariesPage.jsx` (verbatim)
7. `App.js` — add `/student/day-diaries` only. **Not** the 5 stub routes.
8. `nav.jsx` — add the "Day Diaries" link. **Do not** apply the group restructure; that drops `/student/profile`.

`ddl-auto=update` on both profiles adds the 5 columns with no migration script.

Gate: `./start.sh test` 41 green (no test touches the new fields). Create a diary with an account number as a student; read it back via `GET /api/diaries/me`; verify all 5 keys in the response. Submit supervisor comments; verify they persist and reappear in `toView()`. `GET /api/diaries/export/csv` header contains the 3 new columns. `npm run build` succeeds.

Merge → `fred`, push.

### Phase 3 — `port/student-settings` (backend + frontend)

**Backend:**

1. Add `StudentSetting.java` — `@Entity @Table(name="student_settings")`, `studentId` unique, 3 `Boolean` flags + `language` string, all with column defaults
2. Add `StudentSettingRepository.java` — `findByStudentId(Long)`
3. Add `StudentSettingDataSeeder.java` — **at `@Order(41)`, not Chris's `@Order(33)`.** `Order(33)` collides with both `auth/StudentProfileDataSeeder.java:11` and `student/StudentDataSeeder.java:18`. `41` is free (seeder order currently spans 20–40 with one existing 33/33 collision). **Iterate only `Role.STUDENT` users.** Chris iterates `userRepository.findAll()` unfiltered, creating settings rows for admins and supervisors.
4. Add `StudentSettingsDto.java` (verbatim)
5. `StudentController.java` — add `StudentSettingRepository` as an 11th constructor param; add `GET` and `PUT /api/students/me/settings`. Keep the `!= null ? new : old` partial-update pattern for PUT.
6. `DataSeeder.java` — add 2 `ensureUser` lines using the **existing** early-return method. `Role.STUDENT` and `Role.SUPERVISOR` already exist in the enum; `universityId 1L` resolves to Makerere per `UniversityDataSeeder.java:23`.
7. `MigrationCatalogCountTest.java:61` — `assertEquals(7, …)` → `assertEquals(9, …)`. Required: the 2 new accounts take the count to 9 and the build goes red otherwise. Exact count is retained deliberately; this test is the catalog drift detector.

**Frontend:**

8. Add `SettingsSection.jsx` (verbatim)
9. `services/api.js` — add `fetchMySettings`, `updateMySettings`
10. `StudentDashboard.js` — add the `settings` tab

Gate: `./start.sh test` **41 green with the count assertion now 9** — this is the gate that proves steps 6 and 7 agree. Toggle dark mode, PUT, confirm the other 3 fields are preserved by the partial update. Restart, confirm the row exists. `npm run build` succeeds.

Merge → `fred`, push.

### Phase 4 — `port/detail-tabs` (backend + frontend)

**Backend:**

1. `University.java` — add 4 real `@Column` fields: `email`, `phone`, `physicalAddress`, `website`. Replaces Chris's 4 `return null;` stubs. `ddl-auto=update` adds them, nullable, so existing rows stay valid.
2. `InternshipCompany.java` — add `phone`, `contactPerson`. `email`, `physicalAddress`, `website`, `branch` already exist.
3. `UniversityDataSeeder.java`, `InternshipCompanyDataSeeder.java` — populate the new columns so demo data is not blank. **Verify against `MigrationCatalogCountTest`** (asserts 50 universities) — the row count must not change.
4. Add 4 DTOs verbatim: `CompanyDetailsDto`, `IndustrialSupervisorDto`, `LearningInstituteDto`, `UniversitySupervisorDto`
5. `StudentController.java` — add 4 endpoints, all `@PreAuthorize("hasAnyAuthority('STUDENT','ADMIN','SUPERVISOR')")`. **Add a null-guard on `s.getUniversityId()`** in the university-supervisor `ifPresent` lambda; Chris dereferences it unguarded.

**Frontend:**

6. Add the 4 section components (verbatim)
7. `services/api.js` — add `fetchMyLearningInstitute`, `fetchMyCompany`, `fetchMyIndustrialSupervisor`, `fetchMyUniversitySupervisor`
8. `StudentDashboard.js` — add the 4 tabs

Gate: `./start.sh test` 41 green, 50 universities still asserted. Login as student, open each of the 4 tabs, confirm no field renders `—` for the 6 new columns. Supervisor tabs should populate with no schema change at all: `IndustrialSupervisor` and `UniversitySupervisor` already carry `department` and `phoneNumber`. `npm run build` succeeds.

Merge → `fred`, push.

## 5. `services/api.js` — 6 functions, 2 phases

Pure addition, 0 deletions, 0 modifications to existing functions.

| Function | Method | Path | Phase |
|---|---|---|---|
| `fetchMySettings` | GET | `/api/students/me/settings` | 3 |
| `updateMySettings` | PUT | `/api/students/me/settings` | 3 |
| `fetchMyLearningInstitute` | GET | `/api/students/me/learning-institute` | 4 |
| `fetchMyCompany` | GET | `/api/students/me/company` | 4 |
| `fetchMyIndustrialSupervisor` | GET | `/api/students/me/industrial-supervisor` | 4 |
| `fetchMyUniversitySupervisor` | GET | `/api/students/me/university-supervisor` | 4 |

`fetchMyDiaries`, `fetchDiaries`, and `submitDiaryFeedback` already exist in `a13d290` at lines 237, 244, and 290 with identical signatures. `DayDiariesPage.jsx` and `DiaryReviewModal.jsx` work against them unchanged.

## 6. Dependency and data-consistency check

**No new Maven dependency.** `backend/pom.xml` is blob `269ff705` at both `a13d290` and `c461bde` — byte-identical. All new backend code uses `spring-boot-starter-data-jpa`, `spring-web`, `spring-security`, and `jakarta.persistence`, all present.

**All 9 frontend-called endpoints are implemented inside `c461bde` itself.** None depend on the broken `7a41d74`. The 6 `/me/*` endpoints are self-consistent across backend and frontend within the same commit.

**No new npm dependency.** `OverviewSection` draws all four chart types as raw SVG. All 23 lucide icons the new code imports (`BarChart3`, `PieChart`, `ListTodo`, `TrendingUp`, `BookMarked`, `CheckSquare`, `UserCheck`, `Building`, `Settings`, and others) are present in fred's installed `lucide-react@1.31.0`. Chris's downgrade to `0.468.0` is unnecessary.

## 7. Risks

| Risk | Mitigation |
|---|---|
| `MigrationCatalogCountTest` hardcodes counts for 8 tables | Phase 3 updates the user assertion 7→9 in the same commit that adds the accounts. Phase 4 re-runs the suite after the seeder edits. |
| `StudentSettingDataSeeder` `@Order(33)` collides | Moved to `41`. |
| Chris's `PUT /api/diaries/{id}` nulls columns on partial body | Null-guards added in Phase 2, step 3. |
| Chris's `/university-supervisor` can NPE on null `university_id` | Null-guard added in Phase 4, step 5. |
| `ddl-auto=update` on a live MySQL adds 11 columns across phases 2 and 4 | Additive and nullable; no existing row is invalidated. `backend/schema.sql` is not on the classpath and is already stale, so it needs no update. |
| Phase 4 entity columns conflict with Chris's stubs | Her stubs are not ported. Verified by grep in each commit. |
| `frontend1/ims/build/` is stale (dated 2026-09-26) and untracked | `npm run build` in each gate overwrites it. |

## 8. Out of scope

Deferred, flagged, not fixed here: the 9 ESLint warnings (2 are stale-closure `useEffect` deps in `UniversityStudents.jsx:75` and `UniversityDashboard.js:108`); `AdminStudentArea.jsx:66` using relative `/api/students` with no proxy configured; `api.js:60` logout missing the `/api` prefix; `backend/C:/ims_uploads/` junk directory from the hardcoded Windows path; `mvn-run-output.txt`, `cookies.txt`, `newcookies.txt` committed.

## 9. Rollback

Each phase is one branch, one merge. Revert the merge commit on `fred` to undo a phase. No phase rewrites history, and no phase depends on a later one. A full rollback returns `fred` to `8131b0c`.

## 10. Verification status

Everything above was derived by reading git objects — `git show c461bde:<path>`, blob SHAs, `git grep` for markers, parsing `package-lock.json`.

Verified mechanically: which commits carry conflict markers, which blob `pom.xml` resolves to, that `npm ci` fails on Chris's lockfile, which columns are missing from which entities, the seeder `@Order` map, the test count assertions.

Predicted from reading code, not observed at runtime: that the tabs render populated, that a settings restart preserves values, that the diary round-trip works. Phase 0's test run and Phase 1's manual check in Brave are the first real gates.
