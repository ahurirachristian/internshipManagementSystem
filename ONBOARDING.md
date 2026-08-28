# IMS Developer Onboarding Guide

Everything a new developer needs to be productive in their first week: what the system is, how to run it, how every layer works, where the bodies are buried, and recipes for the changes you'll most likely be asked to make.

> **Companion docs**
> - `CODEBASE_ANALYSIS.md` — machine-specific runbook (§0), full entity/column reference, deeper config detail
> - `DesignStyle.md` — frontend design-system specification
> - `BaseStyle.md` — TypeScript reference implementation of the document-repository feature
> - `MIGRATION_README.md` — notes from the schema migration
>
> *Last verified: 2026-08-24. All `file:line` references were checked against source on this date.*

---

## 1. What is this?

An **Internship Management System** for Ugandan universities: universities register students, place them at companies, students log daily work diaries, supervisors review them, and evaluations track progress end-to-end.

| Role | Who they are | What they do |
|------|--------------|--------------|
| `STUDENT` | The intern | Maintain profile, write daily diary entries, view progress |
| `SUPERVISOR` | University staff | Manage schools/departments/programmes, review diaries |
| `COMPANY` | Company rep | Manage company profile, view assigned interns |
| `ADMIN` | System admin | Users, universities, companies, placements, audit logs |

**Stack**

| Layer | Technology | Port |
|-------|-----------|------|
| Backend | Spring Boot **4.1.0**, Java 17 (Web MVC, Security, Data JPA, Thymeleaf, Validation) | **8082** |
| Frontend | React **19.x**, react-router-dom 6, Create React App (`react-scripts` 5), Tailwind CSS 3, lucide-react | **3000** |
| Database | H2 in-memory (default `dev`) or MySQL/MariaDB (`mysql` profile) | 3306 |
| Auth | **Servlet session cookie** (JSESSIONID) + BCrypt — no JWT anywhere | |

Two non-obvious facts that will save you hours:

1. **The backend serves two UIs.** Legacy Thymeleaf templates (`backend/src/main/resources/templates/`, server-rendered MVC pages) AND the React SPA. React is the primary UI; the Thymeleaf pages still exist and some MVC controllers are live.
2. **Roles have no `ROLE_` prefix.** Authorities match raw enum names (`ADMIN`, `SUPERVISOR`…) because `CustomUserDetailsService` wraps `user.getRole().name()` directly. If you write `hasRole('ADMIN')` it will fail — use `hasAuthority('ADMIN')`.

### ⚠️ Migration status (2026-08-25): Model B is target-of-record

The Model A → Model B migration is complete through M6c. Model B is the sole schema.

| | Model A (purged M6c) | Model B — **active** |
|---|---|---|
| Academic structure | ~~`academic/AcademicUnit`, `Course`, `Staff`, `UnitCourse`~~ | `school/School`, `programme/Programme`, `department/Department` |
| Student | ~~`student/StudentProfile`~~ | `student/Student` + StudentDto |
| Supervisors | ~~string columns on profiles~~ | `supervisor/IndustrialSupervisor`, `UniversitySupervisor` |
| Companies | ~~`company/Company`~~ | `company/InternshipCompany` |

Model B drives everything. The old A-side entities/repos/controllers/seeders were deleted in M6c.
String supervisor columns remain in `placements`/`evaluations` for backward compatibility but will be dropped later.

---

## 2. Day-1 setup

### Quick start — H2 in-memory (zero setup)

```bash
# Terminal 1 — backend (dev profile is the default)
cd backend && ./start.sh spring-boot:run
# Wait for "Tomcat started on port 8082"

# Terminal 2 — frontend
cd frontend1/ims && npm start
# Wait for "Compiled successfully!" → http://localhost:3000
```

> `start.sh` sets `JAVA_HOME` (Java is not on PATH on the dev machine). A bare
> `./mvnw` will fail with "JAVA_HOME is not defined correctly" — always use
> `backend/start.sh` or `export JAVA_HOME=$HOME/.local/jdks/jdk-17.0.13+11` first.

H2 = throwaway data, recreated every boot by Hibernate `create-drop` + Java seeders. Perfect for daily dev.

### Full start — MySQL/MariaDB (persistent data)

```bash
mysql -u root -p < mega_backcopy.sql        # one-time load (script drops/recreates the DB itself)
cd backend && ./start.sh spring-boot:run -Dspring-boot.run.profiles=mysql
```

⚠️ On this specific machine there are environment quirks (Java not on PATH, XAMPP MariaDB vs system MySQL fighting over port 3306, per-profile password overrides). Follow `CODEBASE_ANALYSIS.md §0` verbatim for the exact commands — it is verified against this machine. The `mysql` profile defaults to root `/` `kasaggafred001` (system MySQL · override with `MYSQL_PASSWORD=` for XAMPP's passwordless root); the MySQL service must be started first (`sudo systemctl start mysql`).

### Demo accounts (auto-seeded, idempotent)

| Username | Password | Role | Notes |
|----------|----------|------|-------|
| `2400101003` | `Student@123` | STUDENT | Kasagga Fred — placed at MicroVest. Students log in with **student_no as username** |
| `STU-2026-001` | `Student@123` | STUDENT | Alex Johnson — placed at Airtel |
| `STU-2026-002` | `Student@123` | STUDENT | Sarah Owen — placed at Airtel |
| `university` | `university123` | SUPERVISOR | Linked to Nkumba University (id=19) |
| `airtel` | `company123` | COMPANY | Linked to Airtel Uganda (id=1) |
| `admin` | `admin123` | ADMIN | |

### Verify it's alive

```bash
curl -s http://localhost:8082/          # → "Backend is up and running successfully!"
curl -s -c /tmp/ims.txt -X POST http://localhost:8082/api/login \
     -d "username=admin" -d "password=admin123"
curl -s -b /tmp/ims.txt http://localhost:8082/api/me   # → {"username":"admin","role":"ADMIN",...}
```

Then open `http://localhost:3000/login`.

> ⚠️ **The root `README.md` is stale**: it says port 8081, claims `frontend/` is empty, and lists old demo users (`student/student123` etc.). Trust this doc + `CODEBASE_ANALYSIS.md` instead.

---

## 3. Repository tour

```
├── backend/                     Spring Boot app (all Java code lives here)
│   └── src/main/java/com/example/demo/
│       ├── auth/                SecurityConfig, UserEntity, Role, UserService, OAuth stubs, seeders
│       ├── company/             InternshipCompany, CompanyDepartment, CompanySupervisor + controllers
│       ├── country/             Country entity/repo/service/seeder (reference data)
│       ├── controller/          Auth/Dashboard/Student/Diary/Admin/University REST + MVC controllers
│       ├── department/          Department entity + CRUD controller (M6a)
│       ├── dto/                 Validated request DTOs (StudentDto, CompanyRequest, …)
│       ├── evaluation/          Evaluation entity/repo/controller
│       ├── placement/           Placement, Vacancy entities/repos/controllers
│       ├── programme/           Programme entity + CRUD controller (M6a) — seeder ~5,600 lines
│       ├── role/                ⚠️ dormant — Role entity, distinct from auth.Role enum
│       ├── school/              School entity + CRUD controller (M6a) — seeder ~1,500 lines
│       ├── supervisor/          Industrial/UniversitySupervisor entities
│       ├── audit/               AuditLog entity/repo/controller/service
│       ├── service/             StudentService, UniversityService, AdminService
│       ├── student/             Student, DayDiary entities + repos + seeders
│       └── university/          University entity/repo/seeder
├── frontend1/ims/               React SPA ← the real UI ("1" in the name is intentional)
│   ├── src/App.js               Router + role guards (263 lines — read this first)
│   ├── src/context/AuthContext.js    Only context in the app
│   ├── src/services/api.js      Every REST call (605 lines — your API client)
│   ├── src/components/          Feature components + dashboards/
│   ├── src/riho.css             Dashboard shell design system (CSS variables)
│   └── public/                  ⚠️ contains an entire legacy vanilla-JS prototype (see §9)
├── mega_backcopy.sql            Foundation DB dump: 16 tables + seed rows (2026-08-20)
├── backup.sql                   Older/smaller dump — mostly superseded
├── CODEBASE_ANALYSIS.md         Deep architecture walkthrough + machine runbook
├── DesignStyle.md               Frontend design spec (colors, components, patterns)
├── BaseStyle.md                 NOT prose — raw TypeScript code FileManagement was ported from
├── table design.html            Static mockup of the table design
├── cookies.txt / newcookies.txt ⚠️ dumped session cookies committed to git — delete candidates
└── .history/                    Editor history backup mirror — ignore
```

---

## 4. Architecture & auth flow

```
React SPA (:3000)                        Spring Boot (:8082)
─────────────────                        ───────────────────────────────
AuthContext mounts
  → GET /api/me ───────────────────────► SecurityConfig filter chain
     credentials:'include'              (CSRF off · CORS * with creds · URL rules)
  ← {username, role, companyId,
     universityId} or null
                                          │
LoginPage → POST /api/login ──────────►  AuthApiController.authenticate()
  (form-urlencoded username,              → AuthenticationManager → BCrypt check
   password, role)                        → stuffs SecurityContext into HttpSession
  ← {username, role, redirect}            (SecurityConfig.java manual session, line 79)
AuthContext re-fetches /api/me,
navigates to role home                    │
                                          ▼
Every later request carries           Controller (@PreAuthorize method-level)
JSESSIONID cookie automatically         → Service (business logic)
                                        → JpaRepository (Hibernate)
```

Key properties:

- **No tokens client-side.** The user object lives only in React memory (one Context). Refreshing any page triggers a brief loading state while `/api/me` resolves. An expired session silently becomes "anonymous" → redirected to `/login`.
- **Logout** posts to bare `${API_ROOT}/logout` (Spring Security's default endpoint, `api.js:50`) — not `/api/logout`. Works without CSRF token only because CSRF is disabled.
- **Login sends form-urlencoded** (Spring form-login compatible) plus an extra `role` field; the backend rejects the login if the picked role doesn't match the persisted account role (`AuthApiController.java:86-89`).

### URL authorization matrix (`auth/SecurityConfig.java:63-74`)

| Pattern | Allowed |
|---------|---------|
| `/`, `/login`, `/register`, `/forgot-password`, `/admin/login`, `/api/login`, `/api/register`, `/api/forgot-password`, `/api/roles`, static assets, `/h2-console/**` | public |
| `/admin/**` | ADMIN |
| `/university/universities/search` | STUDENT, SUPERVISOR, ADMIN |
| `/university/**`, `/supervisor/**` | SUPERVISOR, ADMIN |
| `/company/**`, `/students/**` | ADMIN, SUPERVISOR, COMPANY |
| `/student/**` | STUDENT, SUPERVISOR, ADMIN |
| everything else (incl. most `/api/**`) | any authenticated user |

Method-level `@PreAuthorize("hasAnyAuthority(...)")` refines individual endpoints. **URL rules alone are misleading** — e.g. `/api/diaries/**` falls into "any authenticated", so each diary endpoint declares its own roles. Always check the controller annotation.

CORS is `allowedOriginPatterns("*")` **with** `allowCredentials(true)` and CSRF disabled (`SecurityConfig.java:48-60`). That's why cross-origin cookies work from :3000 → :8082 — and also why any other origin works too (see §9.1).

---

## 5. Database layer

Schema is Hibernate-managed (`ddl-auto`: `create-drop` on dev, `update` on mysql). `schema.sql` exists as MySQL DDL reference (20 tables, regenerated M7).

### 20 tables

`countries` · `universities` · `internship_companies` · `company_departments` · `company_supervisors` · `users` · `student_profiles` · `students` · `day_diaries` · `placements` · `evaluations` · `schools` · `departments` · `programmes` · `industrial_supervisors` · `university_supervisors` · `vacancies` · `roles` · `audit_logs` · `company`

Full column-by-column reference: `CODEBASE_ANALYSIS.md §3`.

### The single most important thing to understand

**Only 4 relationships are real JPA relations.** Everything else is soft association — plain columns joined in application code, invisible to referential integrity:

```
TRUE JPA RELATIONS (annotated @ManyToOne/@OneToMany):
  Company        1:N  CompanyDepartment      FK company_id
  Company        1:N  CompanySupervisor      FK company_id
  CompanyDept    1:N  CompanySupervisor      FK department_id (nullable)
  Student        1:N  DayDiary               FK student_id

DB-LEVEL FKs THAT EXIST ONLY IN schema.sql (Hibernate creates them):
  users.company_id / university_id → ON DELETE SET NULL
  student_profiles.academic_supervisor_id / field_supervisor_id → SET NULL
  student_profiles.course_id → RESTRICT ; unit_id → SET NULL
  internship_companies.country_id → references countries.id

SOFT ASSOCIATIONS (no FK anywhere — joined by app code):
  placements.student_id        → students.id
  placements.company_id        → internship_companies.id
  placements.company_supervisor_id → company_supervisors.id
  placements.university_supervisor_id → university_supervisors.id
  vacancies.company_id         → company.id
  evaluations.student_id       → students.id
  evaluations.placement_id     → placements.id
  evaluations.supervisor_user_id → users.id
  audit_logs.username              → users.username    (string)
  users.companyId / universityId   → plain columns, no JPA mapping at all
  *.country                        → never linked to countries table
```

Consequences you must internalize:

- Deleting an internship company does **not** touch placements/vacancies/users pointing at it (under a Hibernate-generated schema).
- `student_profiles.academic_supervisor` (string) can disagree with `academic_supervisor_id` (numeric); both exist and both are used.
- `evaluations.student_id`'s target is proven only by the seeder using `student.getId()` — nothing stops future code writing `users.id` there instead.

### Config profiles

| File | Effect |
|------|--------|
| `application.properties` (base) | port 8082, active profile `dev`; ⚠️ ships `spring.security.user=admin/admin123` (lines 5–6) and fallback DB password `1234` (line 14); imports optional `backend/.env` |
| `application-dev.properties` | H2 in-mem `jdbc:h2:mem:testdb`, `create-drop`, H2 console on |
| `application-mysql.properties` | MySQL localhost:3306/internshipManagementSystem_db, `ddl-auto=update`, empty password (override with `SPRING_DATASOURCE_PASSWORD=…` if your MySQL has one) |

Gotcha: a bare `./mvnw spring-boot:run` boots **H2**, so all MySQL seed data is invisible until you pass `-Dspring-boot.run.profiles=mysql`.

Also note: `ddl-auto=update` only ever *adds* columns/tables. It will **not** recreate the dump-only FKs, the unique index on `student_profiles.email`, or fix column types. A Hibernate-generated schema is structurally weaker than `mega_backcopy.sql` — e.g. the dump defines `daily_activities` as `TINYTEXT` (255-byte cap, `mega_backcopy.sql:289`); long diary entries get truncated if you load that dump as-is.

---

## 6. Backend: APIs & business logic

Layered pattern throughout: **Controller → Service (where present) → Repository**. Constructor injection everywhere; no field `@Autowired`. Most list endpoints serialize JPA **entities directly** (only auth/university/company/country inputs use DTOs) — so adding a field to an entity instantly changes API payloads.

### Endpoint inventory (~90 endpoints, grouped)

Legend: 🔓 public · 🔑 any authenticated · otherwise listed roles. "MVC" = returns a Thymeleaf view (legacy UI).

**Session/auth — `controller/AuthApiController.java` + MVC `AuthController`/`AdminLoginController`/`RegistrationController`**

| Method Path | Roles | Notes |
|---|---|---|
| GET `/api/me` | 🔑 | `{username, role, companyId, universityId}` |
| GET `/api/roles` | 🔓 | Role enum names |
| POST `/api/login` | 🔓 | form params; optional `role` must match; returns absolute `redirect` URL |
| POST `/api/register` | 🔓 | JSON `{username,password,confirmPassword,role}` — **role is caller-chosen, incl. ADMIN** (see §9.1) |
| POST `/api/forgot-password` | 🔓 | `{username,newPassword,confirmPassword}` — resets with **username only** |
| GET `/login`, `/forgot-password`, `/admin/login`, `/register`; POST `/register` | 🔓 | legacy Thymeleaf pages; MVC registration also accepts any role |

**Students — `controller/StudentController.java` (`/api/students`)**

| Method Path | Roles |
|---|---|
| GET `/api/students/me`, PUT `/api/students/me` | STUDENT, ADMIN (partial merge on PUT; auto-creates blank profile if missing) |
| GET `/api/students/me/progress` | STUDENT, ADMIN — `{startDate, diaryCount, midTerm(≥5), finalReport(≥10)}` |
| GET `` (list), `/search?q=`, `/export/csv`, `/company/{companyId}`, `/{id}` | ADMIN/SUPERVISOR/COMPANY (list/search/export/company); `/{id}` also STUDENT — unscoped read |
| POST ``, PUT `/{id}`, DELETE `/{id}` | ADMIN, SUPERVISOR (+COMPANY on PUT/DELETE) — DELETE cascades diaries manually |

**Day diary — `controller/DayDiaryApiController.java` (`/api/diaries`)**

| Method Path | Roles |
|---|---|
| GET ``, `/export/csv` | ADMIN, SUPERVISOR |
| GET `/student/{studentNo}`, `/{id}` | ADMIN, SUPERVISOR, STUDENT — **no ownership check for STUDENT** |
| POST `` | STUDENT, ADMIN — attaches entry to caller's profile; status starts `"PENDING"` |
| PUT `/{id}` | STUDENT, ADMIN, SUPERVISOR — any supervisor may edit any student's entry |
| POST `/{id}/feedback` | ADMIN, SUPERVISOR — sets feedback text + free-form status string |
| DELETE `/{id}` | ADMIN, SUPERVISOR, **STUDENT** — any student can delete any entry |

MVC twins exist: `POST /student/diary/save` (`DayDiaryController`), pages under `StudentProfileController` (`/student/profile/edit`, `/student/details`, `/student/diary`).

**Universities & academics**

| Controller | Endpoints | Roles |
|---|---|---|
| `SchoolController` | CRUD + CSV export for `/api/schools` | ADMIN, SUPERVISOR |
| `DepartmentController` | CRUD + CSV export for `/api/departments` | ADMIN, SUPERVISOR |
| `ProgrammeController` | CRUD + CSV export for `/api/programmes` | ADMIN, SUPERVISOR |
| `UniversityController` | GET `/university/universities/search?q=` | STUDENT, SUPERVISOR, ADMIN |
| `UniversityService` (MVC via DashboardController) | university CRUD w/ uniqueness checks | — |

**Companies**

| Controller | Endpoints | Roles |
|---|---|---|
| `CompanyController` (`/api/companies`) | CRUD + search + CSV export | **no method-level authorization at all** — URL rule puts it behind "any authenticated"; see §9.1 |
| `CompanyWebController` (MVC) | `/company`, `/company/{id}`, add/edit forms, `GET /company/delete/{id}` (state change via GET!) | per URL matrix |

**Placements / vacancies / evaluations**

| Controller | Endpoints | Roles |
|---|---|---|
| `PlacementController` (`/api/placements`) | CRUD + export; status enum PENDING→ASSIGNED→ACTIVE→COMPLETED/CANCELLED but transitions unvalidated | ADMIN, SUPERVISOR |
| `VacancyController` (`/api/vacancies`) | reads open to all authenticated; writes ADMIN/SUPERVISOR/COMPANY — **no ownership check between companies** | mixed |
| `EvaluationController` (`/api/evaluations`) | CRUD + `/student/{id}`; 4 required mid-term scores + 4 nullable final scores; nullable fields are the mid-term vs final distinction; no range checks | ADMIN, SUPERVISOR, COMPANY |

**Admin & misc**

| Controller | Endpoints | Roles |
|---|---|---|
| `AdminUserApiController` (`/api/admin/users`) | user CRUD; create uses password `<username>123` | ADMIN |
| `AuditLogController` (`/api/audit-logs`) | GET with action/target/start/end filters, defaults to last 30 days | ADMIN |
| `SupervisorController` (`/api/supervisors?type=`) | lists SUPERVISOR-role users — serializes raw `UserEntity` incl. password hashes | ADMIN, SUPERVISOR, COMPANY |
| `CountryController` (`/api/countries/search?q=`) | autocomplete | all roles |
| `DashboardController` (MVC) | role-aware dashboard routing, student edit/delete forms, university credential form | mixed |
| `HomeController` | GET `/` health text | 🔓 |

Global error handling: `controller/GlobalExceptionHandler.java` maps validation failures → 400 with field details, `NoSuchElementException` → 404, `AccessDeniedException` → 403, catch-all → 500.

### Core business flows

1. **Diary lifecycle**: student submits → `status=PENDING`, feedback null → supervisor reviews via `POST /api/diaries/{id}/feedback` → arbitrary status string set (no enum enforcement). Progress milestones are computed from diary counts: ≥5 = mid-term ready, ≥10 = final report ready (`/api/students/me/progress`).
2. **Company ↔ intern linkage**: purely substring match `student_profiles.organisation CONTAINS company.name` (no FK). See §5 consequences.
3. **Admin aggregates** (`AdminService`): loads entire tables into memory to compute totals, active students (distinct studentNos with ≥1 diary), average diaries/student, per-student diary counts. Fine now; will hurt at scale.
4. **Audit logging**: manual `auditLogService.log(...)` calls sprinkled through controllers — often hardcoding the acting role as `"ADMIN"` regardless of who called, always null IP.

### Seeding (14 `CommandLineRunner`s, ordered)

All guarded by `count()==0` idempotency checks — they skip when data exists. Order matters because **later seeders reference hardcoded generated IDs**: Nkumba = university 19, Airtel = company 1. On anything other than pristine auto-increment sequences these links misfire. One exception to the guards: `CompanyDataSeeder` runs an unguarded "fixup" on every startup linking user `airtel` to the lowest-id company if its link is null.

Order: countries (196) → universities (50) → companies+departments+supervisors → schools (51) → departments (109) → programmes (307) → roles (4) → users (6) → student profiles (3) → students (3) → day diaries (2) → placements (3) → evaluations (2) → vacancies (3) → audit logs (5+).

The school/department/programme seeders produce 51/109/307 rows and run on every dev boot (H2 `create-drop`). They're inert; nothing queries them yet.

### Tests (`backend/src/test`)

33 tests total, all H2-backed full-context `@SpringBootTest`/MockMvc:
- `AuthAccessTest` (4): URL guarding smoke tests (STUDENT blocked from admin, supervisor reaches credentials…)
- `AuthFlowIntegrationTest` (13): register→login round-trip, duplicate username 409, password mismatch 400, role mismatch 401, forgot-password paths
- `StudentCrudIntegrationTest` (4): CRUD gate — create/read/update/delete Student via B APIs
- `DayDiaryIntegrationTest` (3): diary lifecycle gate — submit, list-by-student, supervisor feedback
- `PlacementSupervisorIntegrationTest` (4): placement + supervisor linking gate
- `UniversityServiceTest` (1, Mockito): catalog operations
- `CountryServiceTest` (2): country search + seeding

**Not covered:** companies, evaluations, vacancies, audit API, CSV exports.

---

## 7. Frontend architecture

### Stack & entry

CRA (`react-scripts 5.0.1` — unmaintained but functional) + React 19 + react-router-dom 6 + Tailwind 3. Entry `src/index.js` → `ReactDOM.createRoot` → `App.js`: `<BrowserRouter><AuthProvider><AppRoutes/>`. While `/api/me` resolves on boot, a teal-gradient loading shell renders instead of routes.

**No dev proxy exists.** All calls go cross-origin to `API_ROOT = process.env.REACT_APP_API_ROOT || 'http://localhost:8082'` (`services/api.js:1`). No `.env` file exists, so in practice everything targets localhost:8082 with `credentials:'include'` on every request.

### Routing map (`src/App.js`)

| Path | Component | Allowed roles |
|------|-----------|---------------|
| `/login`, `/register`, `/forgot-password` | LoginPage / RegisterPage (3-step wizard) / ForgotPasswordPage | public (logged-in users bounced home) |
| `/student/dashboard` | `dashboards/StudentDashboard.js` | ADMIN, STUDENT |
| `/university/dashboard` | `dashboards/UniversityDashboard.js` | ADMIN, SUPERVISOR |
| `/university/students` | `UniversityStudents.jsx` | ADMIN, SUPERVISOR |
| `/company/dashboard` | `dashboards/CompanyDashboard.js` | ADMIN, COMPANY |
| `/company`, `/company/:id` | `CompanyPage.jsx` / `dashboards/CompanyProfilePage.js` | ADMIN, SUPERVISOR(/COMPANY for profile) |
| `/admin/dashboard`, `/admin/users`, `/admin/audit-logs`, `/admin/universities`, `/admin/placements` | AdminDashboard, AdminUsersPage, AuditLogs, UniversitiesManagement, PlacementMatching | ADMIN only |
| `/university/schools`, `/departments`, `/programmes` | SchoolsManagement, DepartmentsManagement, ProgrammesManagement | **SUPERVISOR only** |
| `/file-management` | `FileManagement.jsx` | all 4 roles |
| `/`, `*` | redirect to role home or login | |

Protection mechanism — `src/components/ProtectedRoute.js`: spinner while auth loads → `<Navigate to="/login">` if anonymous → `<Navigate>` to role home if unauthorized → render children. Sidebar nav links in `DashboardLayout.js` carry hardcoded role arrays mirroring these guards — **when you add a route, update both places**.

### State management pattern

One Context total (`AuthContext`). Everything else is local `useState` per page following a consistent idiom:

- `data`/`loading`/`error`/`notice` quartets per page
- `emptyX` constant objects spread into controlled forms
- derived lists via chained `useMemo` (filter → group → counts) + lookup maps (`unitById`, `courseById`)
- `loadX()` called on mount and after mutations; some pages use a `[refresh, setRefresh]` counter trick
- fetch effects use a `cancelled` flag for race hygiene
- props drilled exactly one level into modals via `onSaved`/`onClose` callbacks

Follow this idiom for new pages — it's uniform across all 30+ components.

### Component guide (highlights)

| Component | Lines | What it is |
|-----------|-------|------------|
| `FileManagement.jsx` | 1080 | Document repository — **entirely localStorage-backed mock**, zero backend calls (see §9.2) |
| `UniversityStudents.jsx` | 774 | Supervisor student mgmt: expandable unit tree, school filter, deep-links via `?unitId=` |
| `PlacementMatching.jsx` | 597 | Admin placement assignment + status badges; opens EvaluationFormModal per row |
| `CompanyPage.js` | 583 | Company CRUD: client-side pagination, inline modal form |
| `dashboards/UniversityDashboard.js` | 685 | KPI cards, unit-tree students tab, credential-generation form |
| `dashboards/StudentDashboard.js` | 450 | InternshipProgress tracker + read-only profile grid + diary tab |
| `dashboards/AdminDashboard.js` | 416 | Metrics, students×diary-count join table, diary review entry point |
| `StudentEditModal.js` | 328 | 4-step wizard (Personal→Academic→Placement→Review) used for both self-edit and supervisor-manage |
| `EvaluationForm.jsx` | 332 | Dual scoring forms: company (4 scores) vs university (4 scores) |
| `RegisterPage.js` | 333 | 3-step signup wizard ending with company/supervisor pick |
| `DashboardLayout.js` | 380 | Shell: collapsible sidebar, topbar, notification bell, page header/tab chips |
| `AuthShell.js` | 184 | Canvas particle-network animation behind auth screens |
| `CustomSelect.jsx`, `Pagination.jsx`, `ExportButton.jsx` | small | Shared primitives used across management tables |

Small utilities: `utils/csvExport.js` (client-blob CSV generation + server-first fallback).

Tests: `src/App.test.js` (anonymous → login) and `src/routes.test.js` (7 route-guard tests mocking global fetch).

### Styling system — four coexisting layers

1. **Inline Tailwind classes** — dominant. Brand color hardcoded as hex in dozens of places (no theme tokens in `tailwind.config.js` — the extension is empty).
2. **`src/riho.css`** (1,158 lines) — "RIHO design system": CSS custom properties powering `DashboardLayout` (`.dashboard-shell`, `.sidebar`, nav states).
3. **`src/App.css`** (622 lines) — older global styles, partially dead, still imported.
4. **`src/components/LoginPage.css`** (440 lines) — auth screens only (split-screen, gradient, particle canvas positioning).

Three different green palettes coexist across these layers (see deltas below).

---

## 8. Design guides & drift

**`DesignStyle.md`** is the canonical frontend spec and matches the implemented UI ~1:1: component conventions (one component/file, PascalCase, props-down/callbacks-up, useMemo derivations), universal page skeleton (`space-y-6 max-w-7xl mx-auto`, breadcrumb + title/subtitle, modals last), color palette (Primary `#063b33`, hover `#042823`, active `#031d19`, semantic emerald/rose/amber/sky/violet families, slate neutrals), typography scale (`text-2xl sm:text-3xl font-extrabold` titles down to `text-[10px] font-bold` badges), canonical Table/Modal/Form/Card/Header patterns, accessibility rules.

**`BaseStyle.md`** is *not* documentation despite the extension — it is a complete TypeScript reference implementation of the document-repository feature. `FileManagement.jsx` was ported from it nearly verbatim (sub-component structure, class strings, sort logic, seed data).

Drift to be aware of when following the guides:

| Guide says | Codebase reality |
|------------|------------------|
| TypeScript, interfaces, `types/` dir, `.tsx` | Plain JavaScript everywhere, zero types |
| Primary palette `#063b33` family | Also `#0a4d4c/#073b3a` (riho sidebar) and `#0b5c53/#0f766e→#2dd4bf` (legacy gradients) coexist |
| Font Awesome icons | CDN loaded in `index.html`, effectively unused — actual icon lib is lucide-react |

When writing new UI: follow DesignStyle conventions, use the Tailwind-inline style with the `#063b33` family, lucide icons, and the established card/input/button class strings copied from neighboring components.

---

## 9. Known issues & gotchas

Read this before assuming standard behavior. Nothing below is hypothetical — each item points at code.

### 9.1 Security weaknesses (documented plainly)

| # | Issue | Where |
|---|-------|-------|
| 1 | **Unauthenticated privilege escalation**: anyone can self-register an account **as ADMIN** via `POST /api/register` (or legacy `POST /register`) and log in immediately. No invite/approval/domain restriction. | `controller/AuthApiController.java:106-133` |
| 2 | **Account takeover via forgot-password**: resetting any account's password requires only the username — no email, no token, no rate limit. The `password_reset_token` column exists but is never wired up. Combined with #1 an attacker owns the admin account in two requests. | `AuthApiController.java:137` |
| 3 | **CSRF disabled + wildcard credentialed CORS**: session-cookie auth with `csrf.disable()` and `allowedOriginPatterns("*"), allowCredentials(true)` defeats same-site protections for every endpoint — any website can drive an authenticated visitor's session end-to-end. | `auth/SecurityConfig.java:48-51,60` |
| 4 | **`/api/companies` writes have zero method-level authorization**: any authenticated user (incl. STUDENT) can create/update/delete companies. Audit rows for these actions hardcode role `"ADMIN"` regardless of caller. | `company/CompanyController.java` (whole file — no `@PreAuthorize`) |
| 5 | **Password-hash exposure**: `GET /api/supervisors` serializes raw `UserEntity` objects — BCrypt hashes, emails, provider IDs leak to ADMIN/SUPERVISOR/COMPANY callers. | `SupervisorController.java:24-26` |
| 6 | **Missing ownership checks**: any STUDENT can delete any diary entry (`DELETE /api/diaries/{id}` allows STUDENT) and read any student's diaries; any supervisor can rewrite any student's entry; any COMPANY user can edit/delete another company's vacancies; evaluations/placements accept any IDs from any allowed role. | `DayDiaryApiController.java:150-151` et al. |
| 7 | **`must_change_password` is dead code**: seeded/issued students keep `Student@123` forever unless they happen to use forgot-password; nothing enforces or clears the flag. | flag set in seeders, read nowhere |
| 8 | **Committed secrets & session dumps**: `application.properties` ships `admin/admin123` (lines 5–6) and DB fallback `1234` (line 14); `backend/.env` is git-tracked despite being listed in `.gitignore`; repo-root `cookies.txt`/`newcookies.txt` contain dumped JSESSIONID cookies; all demo passwords are public in seeders. | see `git ls-files` |
| 9 | **State-changing GET**: `GET /company/delete/{id}` deletes a company — prefetchers/crawlers can trigger destructive actions. | `CompanyWebController` |
| 10 | **Cross-tenant read**: `GET /api/schools?universityId=X` lets a supervisor read any university's schools (no tenant scoping). | `SchoolController` (no `@PreAuthorize` on list endpoint) |
| 11 | **Dead OAuth2**: starter dependency + Google/LinkedIn/X buttons on the login page + a custom `OAuth2UserService` exist, but `SecurityConfig` never calls `.oauth2Login()` and no clients are registered — buttons dead-end. If enabled naively, OAuth accounts get null passwords, which #2 would let anyone set. | `login.html`, `auth/OAuth2UserService` |
| 12 | Login responses build **absolute redirect URLs from request host/port** — breaks behind proxies/load balancers. | `AuthApiController.resolveHome` |

If your task touches any of these areas, raise the intended fix with the team rather than quietly preserving current behavior.

### 9.2 Functional traps (things that look broken because they are)

| Trap | Detail |
|------|--------|
| Broken progress widget in dev | `InternshipProgress.jsx:21` fetches relative `/api/students/me/progress` → hits the CRA dev server (:3000), not the backend (:8082). Always fails under `npm start`; falls back to diary-count heuristics. Fix: prefix with `API_ROOT`. |
| CSV exports silently degrade | `utils/csvExport.js:34` attempts the backend export URL **without credentials** (and relatively), so the server path always fails and the client-side blob fallback runs. Exports work, but never from the server. |
| `FileManagement` is a mock | The largest component (1,080 lines) stores base64 files in **localStorage** (`STORAGE_KEY`, lines 58/939). Looks production-ready in the sidebar; persists nothing server-side. |
| Service layer bypassed | `AuditLogs.jsx:47` re-declares its own `API_ROOT` instead of using `services/api.js`; `/api/audit-logs` has no api.js wrapper. Keep new calls out of components. |
| Two schemas, one endpoint | `RegisterPage` posts `firstName/lastName/studentNumber/degreeProgram…` while `StudentEditModal` posts `studentName/studentNo/program…` to the same `PUT /api/students/me`. Fields silently don't map depending on which writer ran. |
| Role-guard asymmetry | ADMIN can open `/university/dashboard` and manage students there, but the four `/university/*` settings pages reject ADMIN outright (`ProtectedRoute` role arrays in `App.js`). |
| Duplicated screens | `UniversityDashboard` students tab ≈ the `/university/students` route (`UniversityStudents.jsx`); `CompanyDashboard` ≈ `CompanyProfilePage`. Fixes must usually land in both. |
| Unused props/state | `StudentEditModal` receives `companies`/`supervisors` it ignores; wizard state holds `unitId/courseId/*SupervisorId` with no input fields bound — placement step is incomplete. |
| Dead code | `components/index.js` barrel never imported; `deleteEvaluation` exported unused; `logo.svg` empty; large dead sections in `App.css`; Font Awesome CDN unused. |
| Legacy vanilla site in `public/` | `login.html`, `register.html`, `forgot-password.html`, `company.html` (+ JS/CSS, incl. a 983KB stylesheet) ship in every build and are reachable directly, bypassing React auth guards entirely. Delete candidates. |
| Stale README | Wrong port (8081), wrong demo users, claims frontend folder empty. |

### 9.3 Data-layer pitfalls

- **Two schema models share the codebase** (see "Merge status" in §1). Until reconciled: don't reference Model B entities from Model A code paths or vice versa; don't "fix" one model's seeder to match the other's entity — that's what the rejected PR #22 seeder rewrites did.
- **Config divergence is latent**: `developer`'s intended runtime (default `mysql` profile, `ddl-auto=none`, DB renamed `internshipmanagementsystem_db`, see `DATABASE_CONNECTION_GUIDE.md` + `.env.example`) was NOT activated in the merge. If you check out `developer` directly, expect different startup behavior than this doc describes.
- Referential integrity is mostly **your job in service code** — see the soft-association map in §5 before deleting anything.
- Seeder ID assumptions break on pre-populated tables (§6 seeding).
- `ddl-auto=update` never removes columns and won't recreate dump-only constraints/FKs.
- Dump `TINYTEXT` on `day_diaries.daily_activities`/related fields caps entries at 255 bytes (`mega_backcopy.sql:289`) — migrate those columns to TEXT/LONGTEXT if loading the dump for real use.
- Free-form status strings (`DayDiary.status`, `Vacancy.status`, `AuditLog.role`) accept anything; only `Placement.status` is an enum.

---

## 10. Recipes — common changes end-to-end

### Add a REST endpoint (full stack)

1. Entity/repo: add field/entity under the relevant package + Spring Data repo (derive queries by method name — that's the house style; custom JPQL is rare).
2. Controller: annotate `@PreAuthorize("hasAnyAuthority(...)")` explicitly — do **not** rely on the catch-all authenticated rule. Return DTOs if the shape differs from the entity; otherwise entity serialization is accepted practice here.
3. Validation: prefer a `dto/` record/class with Bean Validation annotations (pattern: `CompanyRequest`) — remember most existing write endpoints bind entities raw.
4. Frontend: add function in `services/api.js` (use shared `API_ROOT`, `credentials:'include'`, `parseResponse` helper) → consume in a component with the standard `loading/error/notice` idiom.
5. Audit: call `auditLogService.log(principal.getName(), <real role>, ...)` if the mutation matters — don't hardcode the role.

### Add a page/route

1. Create component under `src/components/` (or `dashboards/`) following the page skeleton from `DesignStyle.md`.
2. Register in `App.js`: wrap in `<ProtectedRoute roles={[...]}>`.
3. Add sidebar entry in `DashboardLayout.js` — its role arrays are independent of `App.js`; keep both in sync.
4. If it needs backend data: extend `api.js` first (see above).

### Add a column to a table

1. Add the field to the JPA entity (with `@Column` constraints). `ddl-auto` adds the column on next boot — dev (H2) gets it automatically; MySQL keeps old rows null, so handle nulls.
2. Update any DTO/mapping code if the entity flows through one.
3. Frontend: add the field to whichever modal/form owns that screen (e.g. `StudentEditModal` steps) — mind §9.2's dual-schema trap on student profiles.

### Run the tests

```bash
cd backend && ./mvnw test          # ~19 tests, H2-backed
cd frontend1/ims && npm test       # App.test.js + routes.test.js
```

---

*Corrections welcome — verify against source when in doubt. This doc intentionally documents current behavior, including its sharp edges.*
