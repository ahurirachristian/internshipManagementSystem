# IMS — End-to-End Test Report & Bug Log

> **Run date:** 2026-09-25
> **Branch under test:** `fred` (HEAD `76f3dd7`) — **byte-identical to `origin/developer`**, so this is the team's integration branch
> **Last known-good commit:** `29d7b53` ("Merge pull request #28 from ahurirachristian/fred") — verified to compile cleanly
> **Environment:** Java 17.0.13 (`backend/start.sh` sets `JAVA_HOME`), Maven wrapper 3.9.x, Node v26.7.0, `frontend1/ims/node_modules` present
> **Method:** baseline `./mvnw test` (backend), `react-scripts build` + `react-scripts test` (frontend), plus git-history bisection to locate regressions. No runtime API matrix yet — blocked by BUG-001/BUG-002.

---

## Verdict

**The project does not build at HEAD — on either side.** The backend fails to compile (16 files, 174 `cannot find symbol` errors plus type errors) and the frontend production build fails. Both regressions were introduced by the same event: the **merge of PR #25 (`c1c6e2d`)** plus follow-up commits, which resolved conflicts in favour of an **older, pre-migration branch** and clobbered the completed Model-B migration.

Because the backend cannot compile and the frontend cannot build, the remaining end-to-end plan (API curl matrix, per-role dashboards, runtime data flow) is **blocked** and must be re-run after the fixes below.

| ID | Severity | Area | Summary | Status |
|----|----------|------|---------|--------|
| BUG-001 | **Critical** | Backend | HEAD does not compile — Model-A code re-introduced over Model-B entities by merge `c1c6e2d` (PR #25) | **Fixed** (41/41 tests green) |
| BUG-002 | **Critical** | Frontend | Production build fails + 13 `api.js` exports missing (and their backend endpoints) | **Fixed** (build OK, 7/7 tests) |
| BUG-003 | **High** | Frontend tests | `routes.test.js` stale (5 failing) — deleted academic pages + changed admin redirect | **Fixed** (7/7 pass) |
| BUG-004 | **Medium** | Frontend | Dead nav/breadcrumb entries for routes deleted in M6c | **Fixed** |
| BUG-005 | **Critical** | Frontend | `ThemeProvider` never mounted — `useTheme()` throws at runtime (blank screen on supervisor dashboard) | **Fixed** |
| BUG-006 | **High** | Frontend | `App.js` lost all M6b university-management routes + `/university/students` (frontend twin of BUG-001) | **Fixed** |
| BUG-007 | **Medium** | Data | Diary supervisor-comment fields used by the review UI had no Model-B columns/endpoints | **Fixed** |

---

## BUG-001 — Backend does not compile (Model-A / Model-B merge corruption)

**Severity:** Critical (blocks all backend work, tests, and running the app)
**Status:** ✅ **FIXED** — hand-merged; `./mvnw test` now reports **Tests run: 41, Failures: 0, Errors: 0 — BUILD SUCCESS**.

**Fix applied (hand-merge, per decision):**
* Restored Model-B content from `29d7b53` for the clobbered files: `CompanyController`, `CompanyRequest`, `DayDiaryApiController`, `Evaluation`, `PlacementController`, `PlacementService`, `VacancyController`, `VacancyDataSeeder`, `VacancyService`, `UniversityService`, `DayDiary`, `StudentProfileRepository`, `University`, `UniversityDataSeeder`, `UniversityRepository`, `StudentController`, `university-credentials.html`.
* Preserved the genuine newer additions that the old branch happened to match: `@EnableCaching` (`DemoApplication`), actuator URL rules (`SecurityConfig`), country caching (`CountryRepository`, `CountryService`), `findAll(Pageable)` overloads (`VacancyService`, `PlacementService`), the `StudentController` COMPANY-role scoping + auto-provisioning, and the cosmetic nav label changes.
* Deleted the duplicate old-branch seeder `student/StudentProfileDataSeeder.java`.
* Standardised `universityId` on **`Long`** (entity, repository, DTO, service, `AdminUniversityController`, `DashboardController`, `StudentController`, `UniversityDashboardService`).
* Left the remaining templates (which differed only by a nav label) and `student-details.html` (which has a genuine chart addition) intact.

**Original diagnosis:** Critical (blocks all backend work, tests, and running the app)
**Location:** `backend/src/main/java/com/example/demo/` — 16 files

### Symptom

```
cd backend && ./start.sh -q -DskipTests compile
=> COMPILATION ERROR : 174 "cannot find symbol" + type errors
=> BUILD FAILURE
```

Broken files (as reported by the compiler):

```
company/CompanyController.java
company/CompanyService.java
controller/AdminUniversityController.java
controller/DashboardController.java
controller/DayDiaryApiController.java
controller/DayDiaryController.java
controller/StudentController.java
evaluation/EvaluationController.java
evaluation/EvaluationDataSeeder.java
evaluation/EvaluationService.java
service/AdminService.java
service/StudentService.java
service/UniversityDashboardService.java
service/UniversityService.java
student/DayDiaryDataSeeder.java
student/StudentProfileDataSeeder.java
```

Representative missing symbols (Model-A callers against Model-B entities):

```
CompanyController.getLocation()/getDepartment()/getProfile()  ->  Company (Model B: country/city/physicalAddress)
StudentProfileDataSeeder.setFirstName()/setDegreeProgram()/setCompanyId() -> StudentProfile (Model B: fullName/degreeProgram)
DayDiaryDataSeeder.setStudentId(Long)/setUniversityId(Long)   ->  DayDiary (reverted to @ManyToOne StudentProfile)
UniversityService: class StudentCredentialRequest not found   ->  DTO deleted at M5
Evaluation.setSupervisorUserId(...)                           ->  Evaluation (M5 field removed by merge)
```

### Root cause (proven by bisection)

`git worktree add /tmp/ims-good 29d7b53` + compile → **clean (exit 0)**. So `29d7b53` was good.

`merge-base --is-ancestor migration/schema-b HEAD` → **YES**; `migration/schema-b` (M0–M7, "33/33 green") is an ancestor of HEAD. The Model-B work was correct and complete.

Comparing every broken file against the last-good commit `29d7b53`:

| File | Relation to `29d7b53` | Relation to merge-parent `424a9b6` (old branch) |
|------|----------------------|------------------------------------------------|
| `company/CompanyController.java` | CHANGED | **identical to old branch** |
| `controller/DayDiaryApiController.java` | CHANGED | **identical to old branch** |
| `evaluation/Evaluation.java` | CHANGED | **identical to old branch** |
| `service/UniversityService.java` | CHANGED | **identical to old branch** |
| `student/DayDiary.java` | CHANGED | **identical to old branch** |
| `university/University.java` | CHANGED | **identical to old branch** |
| `university/UniversityRepository.java` | CHANGED | **identical to old branch** |
| `student/StudentProfileRepository.java` | CHANGED | **identical to old branch** |
| `placement/PlacementController.java` | CHANGED | **identical to old branch** |
| `placement/VacancyDataSeeder.java` | CHANGED | **identical to old branch** |
| `controller/StudentController.java` | CHANGED | needs semantic re-merge (both sides have real changes) |
| `student/StudentProfileDataSeeder.java` | **NEW** (added by bad merge) | absent in good commit |

**10 of the 11 reverted files are byte-for-byte the pre-migration versions from Chris's branch (`424a9b6`).** They should never have won the merge conflicts.

The commit chain that did it:

```
29d7b53  Merge PR #28 (fred)        <-- LAST GOOD, compiles
   |
c1c6e2d  Merge PR #25 (Chris)       <-- clobbers Model B with old branch
   |
76f3dd7  Company Dashboard ...      <-- HEAD / origin/developer, BROKEN
```

Evidence at the entity level:

* `DayDiary.java` at `29d7b53`: `@Column(name="student_id") private Long studentId` (M4 rekey).
  At `c1c6e2d`/`HEAD`: `@ManyToOne @JoinColumn(name="student_profile_id") private StudentProfile studentProfile` (Model A again).
* `University.java` at `29d7b53`: `Integer universityId`, `shortForm`, `fullName`, `establishedYear` (ADR-002 A-shape).
  At HEAD: `Long universityId`, `name`, `code`, `location` (old Model A).

Files that are *unchanged from the good commit* but now fail purely because their dependencies were reverted: `CompanyService`, `AdminUniversityController`, `DashboardController`, `DayDiaryController`, `EvaluationController`, `EvaluationService`, `EvaluationDataSeeder`, `AdminService`, `StudentService`, `UniversityDashboardService`, `DayDiaryDataSeeder`, `Student`, `StudentRepository`. Fixing the reverted files fixes these too.

### Impact

* `./mvnw test` cannot run — the documented "33/33 green" is meaningless at HEAD.
* `./mvnw spring-boot:run` cannot start — the whole application is down.
* `origin/developer` is broken, so every teammate who pulls is blocked.
* Any H2/MySQL end-to-end verification is impossible.

### Proposed fix

Restore Model-B as the base and re-apply only the genuine new work:

1. `git checkout 29d7b53 -- <the 10 pure-revert files>` (CompanyController, DayDiaryApiController, Evaluation, UniversityService, DayDiary, University, UniversityRepository, StudentProfileRepository, PlacementController, VacancyDataSeeder).
2. Delete the duplicate `student/StudentProfileDataSeeder.java` introduced by the bad merge (verify against `auth/StudentProfileDataSeeder.java` first).
3. Semantically re-merge `controller/StudentController.java`: base on `29d7b53`, then port the genuinely-new `COMPANY`-role scoping + auto-provisioning added after.
4. Reconcile the `universityId` key type (Long vs Integer) — see the open decision below.
5. Rebuild, then `./mvnw test` and re-run the full curl matrix.

---

## BUG-002 — Frontend does not build; 13 `api.js` exports missing

**Severity:** Critical (blocks the whole React app)

### Symptom

```
cd frontend1/ims && CI=true npx react-scripts build
=> Failed to compile.
   Attempted import error: 'fetchMyPlacement' is not exported from '../services/api'
```

`api.js` has 69 exports, but newer components import **13 functions that do not exist**:

| Missing export | Imported by |
|----------------|-------------|
| `fetchMyPlacement` | `components/StudentProfile.jsx` |
| `fetchMyEvaluations` | `components/StudentProfile.jsx` |
| `updateMyAccount` | `components/StudentProfile.jsx` |
| `createVacancy`, `updateVacancy`, `deleteVacancy`, `fetchVacancies` | `components/VacanciesManagement.jsx` |
| `fetchMyLearningInstitute` | `components/dashboards/LearningInstituteSection.jsx` |
| `fetchMyIndustrialSupervisor` | `components/dashboards/IndustrialSupervisorSection.jsx` |
| `fetchMySettings`, `updateMySettings` | `components/dashboards/SettingsSection.jsx` |
| `fetchMyCompany` | `components/dashboards/CompaniesSection.jsx` |
| `fetchMyUniversitySupervisor` | `components/dashboards/UniversitySupervisorSection.jsx` |

### Root cause

Same bad merge. `api.js` was resolved toward one side, dropping functions the other side's components require. Comparing exports by commit:

* `29d7b53` had 62 exports incl. `fetchMyPlacement`, `fetchMyEvaluations`, `updateMyAccount`.
* `424a9b6` had 56 exports incl. `fetchMyCompany`, `fetchMyLearningInstitute`, `fetchMySettings`, `fetchMyIndustrialSupervisor`, `fetchMyUniversitySupervisor`, `fetchVacancies`, `fetchVacancy`, `createVacancy`, `updateVacancy`, `deleteVacancy`.
* HEAD has 68 exports — a **union that missed all 13 of the above**.

### Impact

* `npm run build` fails → no deployable frontend.
* `StudentProfile`, `VacanciesManagement`, and the student dashboard sections (`LearningInstituteSection`, `IndustrialSupervisorSection`, `SettingsSection`, `CompaniesSection`, `UniversitySupervisorSection`) cannot render at all.

### Fix applied

* Re-added all 13 wrappers to `services/api.js` (now 85 exports; a static import/export audit reports zero missing named imports).
* Restored the missing backend endpoints:
  * `GET /api/placements/me` — came back automatically with the restored Model-B `PlacementController`.
  * `GET /api/evaluations/me` — already present.
  * Created `controller/StudentPortalController.java` implementing the six Model-B `/api/students/me/*` endpoints (`/company`, `/industrial-supervisor`, `/university-supervisor`, `/learning-institute`, `GET`/`PUT /settings`) using `Student`, `InternshipCompany`, `IndustrialSupervisor`, `UniversitySupervisor`, `University`, `StudentSetting`.
  * `PUT /api/me` (account email) — already present in `AuthApiController`.
  * Vacancy CRUD via `/api/vacancies` — already present.

**Verification:** `Compiled with warnings.` / `The build folder is ready to be deployed.` (a plain `npm run build`; `CI=true` only fails on pre-existing lint warnings, not errors).

---

## BUG-003 — `routes.test.js` is stale (5 failing tests)

**Severity:** High (false-red CI signal)

**Status:** ✅ **FIXED** — `Tests: 7 passed, 7 total`.

The suite was rewritten to the post-M6c reality: removed the four deleted academic-page tests, added `schools`/`departments`/`programmes` guards, and changed the admin test to assert that ADMIN **can** open `/student/dashboard` (the deliberate current behaviour).

```
Test Suites: 1 failed, 1 passed, 2 total   (src/routes.test.js FAILS)
Tests:       5 failed, 3 passed, 8 total
```

Failures:

* `redirects admin users away from the student dashboard` — `/student/dashboard` now deliberately allows `["ADMIN","STUDENT"]` (`App.js:166`), so ADMIN is **not** redirected. Test asserts the old behaviour.
* `renders the academic units management page for university users` — `/university/academic-units` no longer exists (purged in M6c).
* `renders the course management page for university users` — `/university/courses` deleted in M6c.
* `renders the staff management page for university users` — `/university/staff` deleted in M6c.
* `renders the unit courses page for university users` — `/university/unit-courses` deleted in M6c.

### Proposed fix

Update `routes.test.js` to the post-M6c reality: drop the 4 deleted academic routes, and assert the current ADMIN-on-`/student/dashboard` behaviour (or add a guard if the old redirect was actually intended — needs confirmation).

---

## BUG-004 — Dead nav/breadcrumb entries for deleted routes

**Severity:** Medium (broken links in the sidebar)

`App.js` deleted the `/university/academic-units|courses|staff|unit-courses` routes in M6c, but navigation metadata still advertises them:

* `components/layout/Breadcrumb.jsx:16-19` — breadcrumb meta for the four deleted paths.
* `components/layout/nav.jsx:48-51` — sidebar links ("Academic Units", "Courses", "Staff", "Unit Courses") that will navigate to non-existent routes.
* `components/DashboardLayout.js` still carries the older sidebar nav array (duplicate nav definitions).

### Fix applied

Removed the four dead entries from `components/layout/nav.jsx` and `components/layout/Breadcrumb.jsx`. `Schools`/`Departments`/`Programmes` are kept, and `/university/students` was restored as a real route (see BUG-006).

---

## BUG-005 — `ThemeProvider` never mounted (runtime crash)

**Severity:** Critical (blank screen)

`components/layout/Header.jsx`, `components/layout/FloatingToolbar.jsx` and `dashboards/UniversityDashboard.js` call `useTheme()`, whose implementation throws when no provider is present:

```js
// context/ThemeContext.js
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}
```

At HEAD neither `App.js` nor `index.js` wrapped the tree in `<ThemeProvider>` (the good commit had it in `App.js`; the merge dropped it). Any route rendering `UniversityDashboard` therefore throws at runtime — a crash invisible to the build because it is a runtime error.

### Fix applied

Wrapped `App` with `<ThemeProvider>` around `<AuthProvider>`/`<AppRoutes />`.

---

## BUG-006 — `App.js` lost the M6b university-management routes

**Severity:** High (whole features unreachable)

Comparing `App.js` route sets:

| Present in good `29d7b53` | Present at HEAD |
|---|---|
| `/university/schools`, `/university/departments`, `/university/programmes` | ❌ missing |
| `/university/students` | ❌ missing |
| `/admin/students` | ❌ missing |
| student portal routes (`/student/progress`, `/tasks`, `/learning-institute`, `/companies`, `/profile-settings`, `/supervisor`, `/day-diaries`) | ✅ (new) |
| `/admin/vacancies` | ✅ (new) |

`SchoolsManagement.jsx`, `DepartmentsManagement.jsx`, `ProgrammesManagement.jsx` and `UniversityStudents.jsx` all still existed in the tree but were unreachable — the frontend twin of BUG-001. The M6c-purged components (`AcademicUnitsManagement`, `CourseManagement`, `StaffManagement`, `UnitCoursesManagement`) were also restored by the merge as orphaned dead files.

### Fix applied

Hand-merged `App.js`: added back the `SchoolsPage`/`DepartmentsPage`/`ProgrammesPage`/`UniversityStudentsPage` wrappers and their routes (SUPERVISOR / ADMIN+SUPERVISOR as before), keeping every student-portal and vacancy route introduced later.

---

## BUG-007 — Diary supervisor-comment fields had no Model-B home

**Severity:** Medium (feature silently non-functional)

The newer review UI (`components/DiaryReviewModal.jsx`) posts and renders `industrialSupervisorComment` / `universitySupervisorComment` (plus `accountNumber`, `action`, `technologyTools`), but the restored Model-B `DayDiary` entity had none of them and `POST /api/diaries/{id}/feedback` ignored them.

### Fix applied

* Added `accountNumber`, `action`, `technologyTools`, `industrialSupervisorComment`, `universitySupervisorComment` to `DayDiary` (keeping the flat `student_id` Model-B key).
* `POST /api/diaries/{id}/feedback` now persists the two comment fields; `toView` exposes all of them (and a `feedback` alias for `supervisorFeedback`).
* `PUT /api/diaries/{id}` accepts the three metadata fields.

---

## End-to-end runtime verification (backend, H2 `dev` profile, port 8082)

Booted twice and ran a full curl matrix after seeding completed.

**Round 1 — role homes & student portal:**

| Probe | Result |
|---|---|
| `GET /` | `Backend is up and running successfully!` |
| admin `POST /api/login` → `GET /api/me` | 200 `{role:ADMIN}` |
| `GET /api/admin/users` (admin) | 200 |
| student `2400101003` login → `/api/me` | 200 `{role:STUDENT}` |
| `GET /api/students/me` | 200, full enriched DTO (company/branch/university/programme names) |
| `/api/diaries/me`, `/api/placements/me`, `/api/evaluations/me` | 200 |
| `/api/students/me/{learning-institute,company,settings}` | 200 with correct bodies |
| `/api/students/me/{industrial,university}-supervisor` | 204 (none assigned — correct) |
| `GET /api/vacancies` | 200 |
| `GET /api/students` unauthenticated | 302 → login |

**Round 2 — other roles, diary lifecycle, settings:**

| Probe | Result |
|---|---|
| supervisor `university` login → `/api/university/stats` | 200 |
| `GET /api/university/schools` (supervisor) | 200 |
| company `airtel` login → `/api/students/company/1` | 200 |
| `GET /api/supervisors/university` | 200 |
| `POST /api/register` (STUDENT) | `Account created successfully.` |
| register → login → `POST /api/diaries` | 201, id returned |
| `POST /api/diaries/{id}/feedback` with comments | 200 |
| `GET /api/diaries/me` | `{status:APPROVED, feedback:'Good work', industrialSupervisorComment:'ind-ok', universitySupervisorComment:'uni-ok'}` ✅ persisted |
| `PUT /api/students/me/settings` | 200, values persisted |

**Not covered in this run:** UI screenshots (no browser in this environment), MySQL profile, and CSV downloads. The React app was verified by an authenticated-build + Jest suite, not by clicking through.

---

## Final status

| Check | Before | After |
|---|---|---|
| `backend ./mvnw test` | **0** (compile failure) | **41/41 pass — BUILD SUCCESS** |
| `frontend npm run build` | **fails** | **Compiled successfully** |
| `frontend npm test` | 3/8 pass | **7/7 pass** |
| backend boot + curl matrix | impossible | **all probes as expected** |

## Follow-ups (not blocking)

* Pre-existing ESLint warnings (`no-unused-vars`, `react-hooks/exhaustive-deps`) fail `CI=true` builds. Worth a cleanup pass.
* Orphaned dead components restored by the merge: `AcademicUnitsManagement.jsx`, `CourseManagement.jsx`, `StaffManagement.jsx`, `UnitCoursesManagement.jsx` (purged in M6c). Safe to delete.
* `student-details.html` gained a chart block; other templates differed only by a nav label — reviewed and kept.
* `University.universityId` is now `Long` everywhere, and `School` / `Department` / `Programme` were brought in line. The `mysql` profile runs `ddl-auto=none`, so Hibernate will **not** widen the column by itself — the change ships as `backend/migration/widen_university_id_bigint.sql` and is reflected in `schema.sql`. Apply the script to the production DB after a backup (idempotent); it is a safe INT → BIGINT widening with no FK on `university_id`.
