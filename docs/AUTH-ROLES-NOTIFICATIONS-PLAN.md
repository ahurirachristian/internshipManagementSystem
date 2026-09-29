# Platform Plan: Auth UX, Roles & Notifications, the University–Company Placement Loop, and Responsive Particles

Status: Ready for review · Date: 2026-09-29 · Branch base: `fred` @ `16c6d5f`

Every claim below carries a tag:

- **[FACT]** — verified by reading a specific file (cited) or by a live HTTP test against the running app (`fred`, dev/H2 profile, 2026-09-29).
- **[DECISION]** — a recommended design choice. Alternatives are named. These are the only things that need your sign-off (see §13).

External facts (Resend) were taken from Resend's official API reference, pricing page, and knowledge-base (read today) — cited inline.

---

## 1. Requirements captured (from your brief, verbatim intent → numbered stories)

| # | Story |
|---|---|
| R1 | Password reset goes through **Resend** (real email with a reset link), replacing the current "type a new password with only your username" flow. |
| R2 | **No role selection at login.** The system resolves the role internally and routes the user. |
| R3 | Registration **always creates a STUDENT** by default — no role picker, no self-service admin. The existing `admin` account is the **super admin** who authorizes access. |
| R4 | Logged-in users can **request any role from their dashboard** → this **auto-notifies the super admin**; on approval the requester **gets a notification** and their **dashboard changes automatically**. |
| R5 | A student registering **to a university is auto-linked** to it (unless the university isn't in the system → escalation to admin). The **university can assign roles (student, supervisor)** and **monitor student activity** from its dashboard. |
| R6 | **Super admin and university can revoke any role** at will (scoped — see L4/L5). |
| R7 | **Companies** offering internships can **assign field-supervisor roles** and **publish placements** on their page; **the admin automatically sees that page/feed**. |
| R8 | A company asks a candidate only **[University name] + student number** → the system **auto-connects to the student's full record** (course, course units, etc.). Few fields in → everything out. |
| R9 | If the company **offers the placement** → automatic **notification to the university** ("student placed, needs a supervisor"). University **reviews the place**; on acceptance → **student, company, and supervisor are all notified**; the student starts work knowing their supervisor. |
| R10 | Login **particles scale with screen size** — desktop ≠ mobile count. |
| R11 | Plan must **exploit/anticipate loopholes**, be **step-by-step**, **no guesswork**. |

---

## 2. Current-state baseline (all verified — this is the ground truth we build on)

### 2.1 Auth (from the executed auth analysis, this session)

- Two parallel stacks: React SPA (`LoginPage.js`, `RegisterPage.js`, `ForgotPasswordPage.js`, `AuthContext.js`) → JSON API; Thymeleaf pages at the same paths on :8082. **[FACT]**
- `POST /api/login` takes an optional `role` param and **establishes the session before the role-mismatch check** — proven: 401 + working authenticated cookie. **[FACT, live]**
- `POST /api/register` accepts **any `Role` incl. ADMIN** — proven live (created `proof-admin`, logged into `/admin/dashboard`). **[FACT, live]**
- Registration **never stores `email`** (field collected, never read). **[FACT]** `AuthApiController.register`
- `POST /api/forgot-password` resets any password knowing only the username; 404 enumerates usernames; no token; `users.password_reset_token` column exists and is **never read or written**. **[FACT]**
- Passwords are **trimmed at register/reset but not at login** (proven 401/200 asymmetry). **[FACT, live]**
- No rate limiting, no lockout, failed logins unaudited; CSRF off; CORS `*` with credentials; JSESSIONID has no explicit SameSite (browser Lax). **[FACT]**
- `mustChangePassword` written but never read; `provider`/`provider_id` columns only written by the never-wired `OAuth2UserService`. **[FACT]**
- Admin login page POST → **500** (proven); `static/app.js` dead; server-side `POST /register` vestigial but reachable (proven). **[FACT, live]**
- Authority = single bare role name per user (`CustomUserDetailsService:26-30`); authorities are loaded **once at login** — a DB role change does **not** affect an existing session. **[FACT]** ← this is the core constraint behind R4/R6.

### 2.2 What already exists that we build on

| Capability | State | Evidence |
|---|---|---|
| Notification infra | **None** (only `StudentSetting.emailNotifications/smsNotifications` flags). No table, no endpoint, no bell data. | grep across backend: only StudentSetting hits |
| Notification **UI hook** | **Exists**: `DashboardLayout` takes a `notifications = []` prop and forwards it to `Header`. | `DashboardLayout.js:34,75` |
| Admin user management | **Exists**: `AdminUsersPage.js` + `/api/admin/users` CRUD (ADMIN only). Creates users with password `username + "123"`. | `AdminUserApiController` |
| Placement model | **Exists**: `placements` = studentId, companyId, universityId, universitySupervisor(+Id), companySupervisor(+Id), `Status{PENDING, ASSIGNED, ACTIVE, COMPLETED, CANCELLED}`. Class authz ADMIN/SUPERVISOR (students via `/me`). | `Placement.java:16-55`, `PlacementController:26,81` |
| Vacancy model ("placements a company shows") | **Exists**: `vacancies` = title, description, companyId, location, requirements, status, deadline. GETs need any login; writes ADMIN/SUPERVISOR/COMPANY. **No ownership scoping** (any company can PUT any vacancy and re-assign its companyId). | `VacancyController:50-80` |
| Student search | Exists but **name-only** and unscoped: `GET /api/students/search?q=` (ADMIN/SUPERVISOR/COMPANY, no tenant filter). | `StudentController:374-381` |
| University list API | **ADMIN-only at class level** — anonymous registration cannot use it; needs a new public endpoint for R5. | `AdminUniversityController:24` |
| University-scoped stats/roster | Exists and tenant-scoped (M8/M9). | `UniversityDashboardAnalyticsTest` |
| Course / course-units data | **Does not exist.** `UnitCoursesManagement.jsx` is real UI but feeds itself `fetchProgrammes + fetchSchools` (schools masquerade as "units"). Academic catalogue = School/Department/Programme (M1, 51/109/307 rows). Per-student unit enrolment: nowhere. | component source; `MigrationCatalogCountTest` |
| Per-student academic data available today | `Student`: degreeProgram, programmeId, schoolId, departmentId, yearOfStudy, registrationNumber, studentNumber. `StudentProfile`: courseName, intake, semester, academicYear, org, dates. | entity sources |
| Sessions | In-memory, 30-min Tomcat default, no config. Role changes and password changes **cannot** evict other sessions today (no `invalidate()` anywhere). | grep + `application.properties` |
| Email | **Nothing**: no mail dependency in `pom.xml`, no send code. | grep |
| Login particles | `AuthShell.js`: 220 particles fixed, grid-linked (<120px), cursor field (180px sense / 100px mesh), rAF loop; canvas is fixed `inset:0` so client coords = canvas coords. **Count never adapts to viewport.** | `AuthShell.js`, `LoginPage.css:1-33` |

### 2.3 The 41-test gate

`MigrationCatalogCountTest` asserts **exactly 7 users** on its fresh context. Therefore: **no phase may add seeded accounts.** All new users in this plan are created at runtime (registration/approval), never by a seeder. Any test we add must create its own fixtures (existing pattern: `AuthFlowIntegrationTest.register(...)`).

---

## 3. Target architecture (one picture)

```
                       ┌──────────────────────────────────────────────┐
                       │ React SPA (:3000)                            │
                       │  Login (no role) · Register (email+uni)      │
                       │  Reset-password?token=…  · Bell (Header)     │
                       │  AuthContext ── polls /api/me (role)         │
                       │              └─ polls /api/notifications     │
                       └──────────────┬───────────────────────────────┘
                                      │ fetch credentials:include
                       ┌──────────────▼───────────────────────────────┐
                       │ Spring Boot (:8082)                          │
                       │  AuthorityRefreshFilter  ← roles live-reload │
                       │  SessionFreshnessFilter  ← password kill     │
                       │  /api/login /api/register /api/forgot-…      │
                       │  /api/reset-password  /api/role-requests     │
                       │  /api/notifications   /api/users/{id}/role   │
                       │  /api/university/users  /api/companies/…     │
                       │  /api/companies/student-lookup               │
                       │  /api/placements (OFFERED→ASSIGNED→ACTIVE)   │
                       └───────┬---------------------------┬──────────┘
                               │ (RESEND_API_KEY set?)     │
                    ┌──────────▼──────────┐    ┌───────────▼──────────┐
                    │ ResendEmailService  │    │ ConsoleEmailService  │
                    │ POST api.resend.com │    │ logs the reset link  │
                    │ /emails  Bearer re_…│    │ (dev + CI default)   │
                    └─────────────────────┘    └──────────────────────┘
```

Design pillars:

1. **Roles resolve server-side only** (R2/R3): delete role from login; force STUDENT at registration.
2. **Everything approvable is a row** (`role_requests`) with notifications on both ends (R4).
3. **Roles take effect live**: one filter refreshes session authorities from DB each request; `users.enabled=false` logs the session out on its next request (R4/R6 — no re-login needed, no session-eviction infrastructure required).
4. **Notifications are server-generated only** (never client-supplied recipients) and delivered by polling (Phase 0), with SSE as a later upgrade.
5. **Email is an interface** with two implementations, so tests/CI never need network or keys.

---

## 4. Loophole register (R11) — exploit analysis and planned mitigation

Status legend: **EXISTS TODAY** = current code is exploitable (verified); **PLAN RISK** = could be introduced by this project if designed naively.

| # | Loophole / attack | Status | Mitigation (phase) |
|---|---|---|---|
| L1 | **Reset any account with only the username** (`POST /api/forgot-password`) | EXISTS [live] | Replace wholesale in P2: email-only request, hashed single-use token, TTL. **The old contract must be removed, not augmented** — a token flow is worthless while the old door works. Tests rewritten same phase. |
| L2 | **Username enumeration** via 404 on forgot + 409 on register | EXISTS [live] | Forgot-password always returns 200 generic ("If that email exists…"). Register: keep 409 (needed UX) — but now it keys on **email** too; return 400 generic for both duplicate username/email? [DECISION: keep username 409, email → same generic 400 as validation] (P1/P2). |
| L3 | **Self-registration as ADMIN** | EXISTS [live] | Server ignores any `role` on register (hard-force STUDENT); UI removes the picker. Test asserts `role=ADMIN` in body still creates STUDENT (P1). |
| L4 | **Role-mismatch 401 leaves authenticated session** | EXISTS [live] | Delete the `role` param from `/api/login` entirely (R2 removes its reason to exist) → the buggy branch disappears. Regression test: no role param accepted (P1). |
| L5 | **Session authorities go stale** — approvals/revocations wouldn't apply until re-login, and revocation wouldn't cut off live sessions | PLAN RISK (blocker for R4/R6) | `AuthorityRefreshFilter` reloads role+enabled from DB **every request** (PK lookup; acceptable at this scale) and rebuilds authorities; disabled user → invalidate session → 401/redirect (P0). |
| L6 | **Grant-approval abuse**: student requests ADMIN, complicit "admin" grants, second super admin appears | PLAN RISK | Only `super_admin=true` may approve ADMIN requests or act on ADMIN accounts; every grant/revoke audited (`AuditLogService`) and **notified to all super admins**; approval is explicit button + role shown in the confirm dialog (P3/P4). [DECISION: requestable roles = SUPERVISOR, COMPANY, ADMIN as you specified; alternative = hide ADMIN requests entirely.] |
| L7 | **University crosses tenants**: supervisor of uni A edits students/roles of uni B; university revokes a super admin | EXISTS [live: `updateStudent`/`deleteStudent` have no university scoping] + PLAN RISK | Central scope rules in one `AuthorizationScopeService`: SUPERVISOR actions forced to `caller.universityId`; targets with role ADMIN or `super_admin` are **unrevocable** by anyone except a super admin; COMPANY scoped to own `companyId` (P4/P5/P6). Enforced in service layer, not UI. |
| L8 | **Company edits another company's vacancies / spoof `companyId`** | EXISTS [live code: `updateVacancy` copies `vacancy.getCompanyId()` from body, no ownership check] | For COMPANY callers: `companyId` forced from the session user; PUT/DELETE verify ownership → 403 otherwise; ADMIN unchanged; SUPERVISOR keeps current behavior to avoid breaking `PlacementSupervisorIntegrationTest` (residual risk documented) (P6). |
| L9 | **Company harvests student PII** by guessing student numbers | PLAN RISK (R8 makes lookup powerful) | Lookup requires a **vetted COMPANY account** (with R3+R3-approval, companies exist only by super-admin approval — that IS the gate); every lookup audited with studentId + IP; result scoped to fields needed (see §13-D4); rate-limited (30/min/company); university-supervisor-visible audit (P7). |
| L10 | **Resend abuse → email bombing / cost burn** (attacker floods reset emails to a victim) | PLAN RISK | Per-user min interval 10 min (token overwrite), per-IP 5/hour (in-memory counter, no deps), generic 200, Resend side: free tier hard caps **100/day, 3,000/mo** (official pricing page) so worst case is bounded; alert if 429 received (log WARN) (P2). |
| L11 | **Reset token theft**: DB leak, log leak, referrer leak, replay | PLAN RISK | Store only **SHA-256(token)**; 32 bytes `SecureRandom` → Base64URL; TTL 30 min; single-use (cleared on success); single-active (new request overwrites); constant-time compare; link goes to SPA over HTTPS in prod; token never logged (P2). |
| L12 | **Old sessions survive a password reset** (attacker stays in after victim recovers) | EXISTS [live: no `invalidate()` anywhere] | Add `users.password_changed_at`; `SessionFreshnessFilter` stamps login time into the session and forces logout when it predates `password_changed_at` (P2). Same mechanism covers role-forced re-auth if ever needed. |
| L13 | **Unlisted-university accounts get power** ("not there" path) | PLAN RISK | `university_id IS NULL` ⇒ user can hold only STUDENT; approval UIs cannot grant SUPERVISOR without a university (validated server-side); null-university registration raises an admin notification for manual linking (P1/P3). |
| L14 | **Email squatting / takeover via registration email** (register with someone else's email → their reset mail; or block the rightful owner) | PLAN RISK | Unique-email enforcement (app-level 400 + DB unique — NULLs allowed so legacy rows unaffected); reset link only changes **that account's** password and the attacker never sees the mail. Residual: denial-of-squat → mitigated by [DECISION D3: verify email at signup — recommended, cheap once Resend lands; default OFF in first pass]. |
| L15 | **Notification spoofing / phishing links** | PLAN RISK | Notifications created only server-side (no client POST of arbitrary notifications); `link` field populated from a whitelist of in-app routes; bell renders text only (no HTML) (P0). |
| L16 | **Admin default password `username+123`** predictable | EXISTS [FACT] | Wire the dormant `mustChangePassword` flag: admin-created accounts must change password on first login (flag finally read in `/api/login` response + frontend route guard) (P4). Alternative: random password shown once — noted, more UX work. |
| L17 | **CORS `*` + credentials + CSRF off** | EXISTS [FACT] | Tighten `allowedOriginPatterns` to an env-configured list (`APP_ALLOWED_ORIGINS`, default `http://localhost:3000`) in P0 — one-line change, removes cross-origin read of session responses from arbitrary sites. Keep CSRF off (SPA uses SameSite+custom header? No — note residual: recommend enabling CSRF for cookie-unsafe methods in a later hardening pass; not in scope now). |
| L18 | **Race**: approval lands after user changed/revoked (TOCTOU) | PLAN RISK | Approve/reject is transactional: `@Transactional` + row lock on the request (`SELECT … FOR UPDATE` via `@Lock`) + state guard (`PENDING` only) → double-approve impossible; role write and audit in same tx (P3). |
| L19 | **Catalog-drift test breaks** when phases add tables/users | PLAN RISK | P-scope rule: seeders untouched; `MigrationCatalogCountTest` must stay 7 users / 50 universities / 51 schools; new tables aren't in its list (verified) → stays green by construction (each phase gate). |

---

## 5. Data model changes (all additive; `ddl-auto=update` handles MySQL + H2 create — matches existing practice)

```
users
  + email                VARCHAR UNIQUE NULL      (P1; app-level dup check first; MySQL/H2 allow many NULLs)
  + university_id        (already exists)         (P1: populated at registration — field exists today!)
  + super_admin          BOOLEAN NOT NULL DEFAULT false   (P0; seeded admin set true by seeder — no row-count change)
  + enabled              BOOLEAN NOT NULL DEFAULT true    (P0)
  + password_changed_at  TIMESTAMP NULL                (P2)
  + password_reset_expires_at TIMESTAMP NULL           (P2 — reuses existing password_reset_token column for the HASH)

notifications                     (P0)
  id BIGINT PK · recipient_user_id BIGINT NOT NULL (idx) · type VARCHAR(64)
  title VARCHAR(200) · body VARCHAR(1000) · link VARCHAR(500) · read BOOLEAN NOT NULL DEFAULT false (idx recipient+read)
  created_at TIMESTAMP
  -- no sender column: server-generated only (L15). Audit actor lives in audit_log.

role_requests                     (P3)
  id PK · user_id (idx) · requested_role VARCHAR(16)   -- STUDENT|SUPERVISOR|ADMIN|COMPANY
  context_university_id BIGINT NULL    -- for SUPERVISOR requests
  context_company_name   VARCHAR(200) NULL -- for COMPANY requests
  status VARCHAR(16) NOT NULL DEFAULT 'PENDING'  -- PENDING|APPROVED|DENIED
  review_comment VARCHAR(500) NULL · reviewed_by BIGINT NULL · reviewed_at TIMESTAMP NULL
  requested_at TIMESTAMP NOT NULL
  UNIQUE(user_id, requested_role, status) guard against duplicate PENDING (app-checked; DB index partial not portable → app-level)

courses                            (P8 — course units)
  id PK · programme_id INT NOT NULL (idx) · year INT NULL · semester VARCHAR(16) NULL
  course_code VARCHAR(32) · course_name VARCHAR(200) · credits INT NULL

placements.status                 (P7) — add enum value OFFERED
  PENDING(existing) | OFFERED(new, company→university review) | ASSIGNED | ACTIVE | COMPLETED | CANCELLED
  Stored as string (EnumType default) → additive, no migration.  (Placement.java:16-22)
```

No seeder creates users (L19). The seeded `admin` gets `super_admin=true, enabled=true` via an update inside `DataSeeder` (mutation of existing row, count unchanged → `MigrationCatalogCountTest` still 7).

---

## 6. API contracts (new ★ / changed ◆ / existing reused ○)

### 6.1 Auth core
| Method | Path | Auth | Request → Response |
|---|---|---|---|
| ◆ POST | `/api/login` | public | `username,password` (**role param removed**; unknown params ignored) → `{username, role, redirect}` — plus **new** `mustChangePassword` boolean (feeds L16) |
| ◆ POST | `/api/register` | public | `{username,email,password,confirmPassword,firstName,lastName,universityId?/null,registrationNumber?,degreeProgram?,yearOfStudy?,phoneNumber?,internshipCompany?,universitySupervisor?}` → **201**; server forces `role=STUDENT`, stores email, sets `users.university_id` + `students.university_id`; `universityId` absent ⇒ NULL + notification `REGISTRATION_UNLISTED_UNIVERSITY` to all admins (L13) |
| ○ GET | `/api/roles` | public | unchanged (used by admin UI) |
| ★ GET | `/api/universities/options` | **public** | `[{id, shortForm, fullName}]` — slim DTO, 50 rows (P1; does not touch ADMIN-only `/api/universities`) |

### 6.2 Password reset (R1)
| Method | Path | Auth | Contract |
|---|---|---|---|
| ◆ POST | `/api/forgot-password` | public | **breaking change**: `{email}` → always `200 {message:"If that email exists, a reset link is on its way."}`. Side effects if found: token gen, hash stored, `expires_at=now+30m`, Resend send, audit `PASSWORD_RESET_REQUEST` (IP). Rate limits: 1/10min per user, 5/hour per IP. |
| ★ POST | `/api/reset-password` | public | `{token,password,confirmPassword}` → 200 or 400 `RESET_LINK_INVALID_OR_EXPIRED`. On success: hash password (BCrypt), clear token+expiry, bump `password_changed_at`, audit `PASSWORD_RESET`. |

### 6.3 Notifications (R4/R9)
| Method | Path | Auth | Contract |
|---|---|---|---|
| ★ GET | `/api/notifications?unreadOnly=&page=` | any login | `[{id,type,title,body,link,read,createdAt}]` newest first, page 20 |
| ★ GET | `/api/notifications/unread-count` | any login | `{count}` |
| ★ POST | `/api/notifications/{id}/read` | owner | 204 (ownership checked → 404 for others' ids) |
| ★ POST | `/api/notifications/read-all` | any login | 204 |

### 6.4 Role requests (R4)
| Method | Path | Auth | Contract |
|---|---|---|---|
| ★ POST | `/api/role-requests` | any login | `{requestedRole, universityId?, companyName?, comment?}` → 201; 409 if user already has PENDING for that role or already holds the role; notification → **all super admins** (`ROLE_REQUEST` with link `/admin/role-requests`) |
| ★ GET | `/api/role-requests?status=` | super admin | queue for the admin UI |
| ★ POST | `/api/role-requests/{id}/approve` | super admin | transactional (L18): sets `users.role`; SUPERVISOR → also sets `university_id` (required, L13); COMPANY → resolve-or-create Company + set `users.company_id`; notifies requester (`ROLE_APPROVED`, link = new home) → their next `/api/me` poll sees the new role → dashboard switches (P0 filter + AuthContext poll) |
| ★ POST | `/api/role-requests/{id}/deny` | super admin | sets DENIED + notifies requester with comment |

### 6.5 Roles & revocation (R6)
| Method | Path | Auth | Contract |
|---|---|---|---|
| ★ POST | `/api/users/{id}/role` | super admin | `{role, universityId?, companyName?}` → grants; only super admin may grant/act on ADMIN (L6); audit + notify target |
| ★ POST | `/api/users/{id}/enabled` | super admin | `{enabled:false}` → target's **very next request** is logged out by the refresh filter (L5) + notified |
| ★ POST | `/api/university/users/{id}/role` | SUPERVISOR, own university only | allowed target roles: STUDENT ↔ SUPERVISOR within `caller.universityId`; **403 on ADMIN/super_admin targets, 404 on other-university targets** (L7); audit + notify |
| ★ POST | `/api/university/users` | SUPERVISOR own uni / ADMIN | create user forced to role STUDENT or SUPERVISOR (server-chosen from body whitelist), `university_id` forced to caller's uni; returns generated `username+123` creds (L16 flag on) |
| ○ GET | `/api/admin/users` etc. | ADMIN | existing CRUD unchanged (AdminUsersPage keeps working) |

### 6.6 Company (R7)
| Method | Path | Auth | Contract |
|---|---|---|---|
| ★ GET | `/api/companies/me/supervisors` | COMPANY own | list field supervisors (IndustrialSupervisor rows joined to user email) |
| ★ POST | `/api/companies/me/supervisors` | COMPANY own | `{firstName,lastName,email,phone,department}` → creates `User(role=SUPERVISOR, companyId=caller, mustChangePassword=true)` + `IndustrialSupervisor(userId, companyId)` + audit + notification with credentials (L16) |
| ◆ POST/PUT/DELETE | `/api/vacancies` | COMPANY own (scoping fix L8) | `companyId` forced from session for COMPANY; PUT/DELETE ownership → 403; on CREATE → notification to **all admins** (`NEW_VACANCY`, link `/admin/marketplace`) — "the page is automatically seen by the admin" |
| ○ GET | `/api/vacancies` | any login | already returns everything → admin feed UI in AdminDashboard (P6) |

### 6.7 Lookup + placement pipeline (R8/R9)
| Method | Path | Auth | Contract |
|---|---|---|---|
| ★ POST | `/api/companies/student-lookup` | COMPANY own / ADMIN / SUPERVISOR-own-university | `{universityId, studentNumber}` → 200 student DTO (see §13-D4 for field scope) incl. programme, department, school, year, profile courseName, units (after P8); 404 with generic message; **audit `STUDENT_LOOKUP` with studentId + IP**; rate 30/min (L9) |
| ◆ POST | `/api/placements` | **+ COMPANY** (new) | body `{studentId, offerNote}` → server resolves `companyId` (own), `universityId` (student's), status **`OFFERED`**, existing `resolveSupervisorIds` retained → notification to **all supervisors of the student's university + admins**: "Student {name} received an offer from {company} — assign a supervisor" |
| ★ POST | `/api/placements/{id}/approve` | SUPERVISOR-own-university / ADMIN | `{universitySupervisorId}` (must be a supervisor of that university) → status `ASSIGNED` + `universitySupervisorId` → **3 notifications**: student ("placed — your supervisor is X"), company, supervisor ("you supervise {student} at {company}") |
| ★ POST | `/api/placements/{id}/reject` | same | status `CANCELLED` + notify student+company |
| ○ GET | `/api/placements/me` | STUDENT | exists → shows placement + supervisor (R9 end state) |
| ○ GET | `/api/students/{studentId}` etc. | existing | reused by approval UI |

### 6.8 Courses (P8, supports "course units" in R8)
| Method | Path | Auth | Contract |
|---|---|---|---|
| ★ CRUD | `/api/programmes/{id}/courses` | ADMIN / SUPERVISOR-own-university | course-unit catalogue per programme (wires the existing-but-hollow `UnitCoursesManagement.jsx`) |
| ★ | lookup DTO gains `units: [...]` | — | student's programme + year units (after P8) |

---

## 7. UI changes (file-by-file)

| Screen / component | Change |
|---|---|
| `LoginPage.js` | **Delete the role `CustomSelect`** (R2). Submit `username+password` only. Handle new `mustChangePassword` flag → redirect `/change-password` (L16). |
| `RegisterPage.js` | Step 1: drop role select; **email becomes required + validated**; add **university `CustomSelect`** fed by the new public `/api/universities/options` (with "Not listed" option → null). Steps 2-3 unchanged. Submit without `role`. |
| `ForgotPasswordPage.js` | **Email-only** form ("we'll send a link"). After success → same neutral message state. |
| ★ `ResetPasswordPage.js` + `App.js` route `/reset-password` | Reads `?token=`, password + confirm client-validated (min 8 [DECISION — no server min exists today, see D5]), POST `/api/reset-password`, success → `/login {reset:true}`. |
| `AuthContext.js` | Add: (a) `refreshUser()` polling `/api/me` every 10 s + on `focus` → if `role` changed ⇒ `navigate(homeFor(newRole))` (**R4 "dashboard changes automatically"**); (b) notifications polling every 15 s → `unreadCount` state. |
| `DashboardLayout`/`Header` | Feed the existing `notifications` prop with real data: bell icon + dropdown (mark-read, mark-all, link navigation). No layout restructuring. |
| ★ `RequestRoleSection.jsx` (per-dashboard, R4) | Available on student/company/supervisor dashboards: pick role (+ university/company context fields), submit → pending state shown from `/api/role-requests/mine` (add small GET mine endpoint) → "Pending approval" badge. |
| ★ `AdminRoleRequestsPage.jsx` + nav (`nav.jsx` roles ADMIN) | Queue with approve/deny (confirm dialog shows role + context), fed by `/api/role-requests?status=PENDING`. |
| `AdminUsersPage.js` | Add grant-revoke dropdown, enable/disable switch (super admin only — gate by `user.superAdmin` from `/api/me`). |
| University dashboard (`UniversityDashboard.js` + Thymeleaf `/university/credentials` optionally) | New tab **"People"**: list users of my university, assign STUDENT/SUPERVISOR (create form), revoke within scope, disable within scope; existing stats/diary tabs = the "monitor activities" surface (M9 already scopes data). |
| Company dashboard (`CompanyDashboard.js`) | Tabs: **My Placements** (vacancy CRUD, ownership-scoped), **Field Supervisors** (create + list), ★ **Student Lookup** (university select + student number → profile card → "Offer placement" button). |
| Admin dashboard (`AdminDashboard.js`) | New tabs: **Role Requests**, **Marketplace** (all vacancies across companies — R7 "automatically seen by admin"). |
| Student dashboard | Placement card via existing `/api/placements/me` → "Offered / Approved — Supervisor: X" (R9 end state). |
| `AuthShell.js` | Particle scaling (R10) — exact spec §8.3. |
| Thymeleaf `login.html` | Update demo-users line (stale `student/student123`); keep native form login (works — proven). Optional: fix admin-login 500 by pointing its form to `/login` (P1 drive-by, one line). |

---

## 8. Resend integration (R1) — verified facts and exact wiring

### 8.1 Verified external facts
- **Base URL** `https://api.resend.com`; **endpoint** `POST /emails`; auth `Authorization: Bearer re_xxxxxxxxx`; body `{from, to:[...], subject, html}` → `201 {"id":"..."}` (official API reference, read today). **[FACT]**
- **`User-Agent` header is mandatory** — requests without it are rejected `403` (error 1010). (official API reference) **[FACT]** — Spring's `RestClient` sends one by default, but we set an explicit `ims-backend/1.0`.
- **Rate limit** 10 requests/second per team → `429`. (official API reference) **[FACT]**
- **Free plan**: **3,000 emails/month, 100 emails/day, 3 domains, 30-day logs**; pay-as-you-go overage in 1,000-email buckets if enabled. (Resend pricing page + knowledge-base) **[FACT]** — ample for resets; the daily cap bounds L10.
- Setup requires: account → **add + DNS-verify sending domain** → create API key (`re_…`). From-address must be on the verified domain. (Gravity install steps + Resend docs) **[FACT]**
- A **first-party Java SDK exists** (`com.resend:resend-java`, shown in official docs). **[DECISION D1: use Spring `RestClient` instead — zero new Maven dependency, 30 lines; SDK remains the drop-in alternative.]**

### 8.2 Wiring (P2)
```
backend/src/main/java/com/example/demo/email/
  EmailSender.java          // interface: void send(String to, String subject, String html)
  ResendEmailSender.java    // @ConditionalOnProperty("resend.api-key") — RestClient POST /emails
  ConsoleEmailSender.java   // @ConditionalOnMissingBean(EmailSender.class) — logs "RESET LINK: …"
  EmailConfig.java          // RestClient bean: baseUrl https://api.resend.com,
                            //   Authorization Bearer ${RESEND_API_KEY}, User-Agent ims-backend/1.0
```
Config (env — `.env` already imported via `spring.config.import=optional:dotenv:.env`):
```
RESEND_API_KEY=re_…            # unset in dev/CI → ConsoleEmailSender → tests stay offline
RESEND_FROM_EMAIL=ims@yourdomain.tld   # must be DNS-verified
APP_BASE_URL=http://localhost:3000      # builds the reset link → /reset-password?token=…
```
Reset email: plain-text-first HTML, single button link, "expires in 30 minutes", "if you didn't request this, ignore".
Failure policy: send failure ⇒ 500 logged + generic 200 to user? **[DECISION: log WARN, still generic 200, token remains valid — avoids leaking whether email exists; retry not needed at this scale.]**
Test strategy: unit test asserts token→hash→expiry behavior with `ConsoleEmailSender` captured (assert link format); one `@SpringBootTest` flow: forgot → extract token from console capture → reset → login with new password → old password 401. **No test touches Resend** (L19, keeps 41+green offline).

### 8.3 Particles (R10) — exact spec
In `AuthShell.js`:
```js
const MIN_PARTICLES = 40, MAX_PARTICLES = 220;
const targetCount = (w, h) =>
  Math.min(MAX_PARTICLES, Math.max(MIN_PARTICLES, Math.round((w * h) / 9000)));
// 1920×1080 → 220 (cap; identical to today's desktop), 1440×900 → 144,
// 1366×768 → 116, 768×1024 → 87, 390×844 → 37 → clamped to 40 (mobile)
```
- **Recompute on resize**: debounce 200 ms; if new target > current, spawn at random positions; if smaller, splice from the end (all particles are interchangeable — no identity to preserve). Current code only clamps positions (`handleResize`) — extend it.
- **Cursor field only on fine pointers**: `matchMedia('(pointer: fine)')` — attach `mousemove/mouseout` only when true (mobile has no cursor; today the listeners run but never fire — dead weight, and a touch-drag shouldn't spawn a field).
- **`prefers-reduced-motion: reduce`** → draw one static frame (init + single paint), skip `requestAnimationFrame` loop entirely. Accessibility + battery.
- **Pause on hidden tab**: `visibilitychange` → cancel/resume rAF.
- Optional crispness on retina: `canvas.width = offsetWidth * devicePixelRatio` + `ctx.setTransform(dpr,0,0,dpr,0,0)` keeping math in CSS px (visual-only change; keep behind the same resize path).
- Everything else stays byte-identical: 120 px link distance, `(1-d/120)*0.5` opacity, `lineWidth 0.8`, 180 px sense radius, 100 px cursor-mesh, spatial-hash grid cell = 120 px, ±0.4 px/frame velocities, bounce at edges (current `AuthShell.js` constants).
- Gate: build + visual check at 3 widths (DevTools device toolbar 390/768/1920) — assert particle counts via a `window.__particleCount` dev hook or console log behind `NODE_ENV=development`.

---

## 9. Phased execution guide (step-by-step; each phase = branch → gate → ff-merge, exactly like the Chris port)

Discipline per phase: branch `port/pN-…` off `fred`; implement; **full backend suite must stay green (41 baseline + new tests)**; `npm run build` green with ≤9 warnings; commit(s) with clean conventional messages; `git checkout fred && git merge --ff-only`; no stacking.

### P0 — Foundations: notifications + live authorities (unblocks R4/R6/R9)
1. `notifications` table entity/repo/service (`notify(List<Long> recipientUserIds, String type, String title, String body, String link)` — recipients only from server-side lookups, L15).
2. Endpoints §6.3 (+ per-user "mine" GET used by RequestRole UI).
3. `AuthorityRefreshFilter` (`OncePerRequestFilter`, after security context): load `UserEntity` by principal → replace authorities with current role; if `enabled=false` → invalidate session, clear context. (L5)
4. `SessionFreshnessFilter` stub fields (wired in P2).
5. `users.super_admin`, `users.enabled` columns; `DataSeeder` sets admin `super_admin=true` (row mutation only — count stays 7, L19).
6. `CORS` origins → `${APP_ALLOWED_ORIGINS:http://localhost:3000}` (L17).
7. `AuthContext`: `/api/me` polling (10 s + focus) + role-change redirect; notifications polling (15 s) feeding `Header` via `DashboardLayout.notifications`.
8. Frontend: bell dropdown in `Header` (mark read / read all).
9. **Tests**: `NotificationApiTest` (owner-scoped read, unread-count), `AuthorityRefreshFilterTest` (change role in repo → next request sees new authorities without re-login; disable → next request 401/redirect), `CorsTest` (origin echo only for allowed).
   **Gate**: suite green, build green.

### P1 — Login & registration UX (R2, R3, R5-start, L3/L4)
1. `LoginPage.js`: remove role select; remove `role` from api call.
2. `/api/login`: delete `role` param + mismatch branch (fixes L4 by deletion); add `mustChangePassword` to response.
3. `AuthApiController.register`: ignore incoming role (force STUDENT); require + validate + store `email` (app-level uniqueness → 400); accept `universityId` → set `users.university_id` + `students.university_id` (fallback: NULL + admin notification `REGISTRATION_UNLISTED_UNIVERSITY`); trim rules documented: username/email trimmed, **password NOT trimmed anywhere from now on** (fixes the L-trim asymmetry by making login/register/reset consistent — decision D2: stop trimming passwords rather than trim at login, because trimming at login silently alters user intent).
4. New `GET /api/universities/options` (public) → slim DTO.
5. `RegisterPage.js`: drop role select; email required; university select (+ "Not listed").
6. Drive-by: `admin-login.html` form action → `/login` (fixes the 500 door, proven in analysis).
7. **Tests**: rewrite `AuthFlowIntegrationTest` — `registerIgnoresRoleFieldEvenWhenAdmin` (POST role=ADMIN → DB role STUDENT), `registerStoresEmailAndUniversity`, `registerRejectsDuplicateEmail`, `loginWithoutRoleParamRoutesByDbRole`, `loginIgnoresUnknownRoleParam` (no session leak); delete `loginRejectsSelectedRoleMismatch` (superseded) and re-point `registerRejectsInvalidRole` to the new behavior. University options endpoint anonymous-200 test.
   **Gate**: suite green (count unchanged), build green.

### P2 — Password reset via Resend (R1, L1/L2/L10-L12)
1. `email/` package per §8.2 (interface + Resend + console + config + env docs).
2. Token flow: SHA-256 hash into existing `password_reset_token` + `password_reset_expires_at`; `SecureRandom` 32 B; TTL 30 m; overwrite-on-request; single-use; rate limits (per-user 10 min, per-IP 5/h, in-memory).
3. `POST /api/forgot-password` → `{email}`, generic 200; `POST /api/reset-password` new; **delete the old username+password body contract**.
4. `password_changed_at` + freshness check in `SessionFreshnessFilter` (logout stale sessions on next request).
5. UI: `ForgotPasswordPage` email-only; new `ResetPasswordPage` + route; update Thymeleaf `forgot-password.html` to the same API (email field) so both stacks behave identically.
6. **Tests**: `PasswordResetFlowTest` (forgot→capture→reset→login new/old, expiry, reuse-rejected, unknown-email still 200, mismatch 400, rate-limit 429 after N), `SessionInvalidatedAfterResetTest` (pre-reset cookie dead after reset), Resend sender unit test with mocked `RestClient` asserting headers incl. User-Agent + payload shape.
   **Gate**: suite green offline (console sender default), build green. Live smoke (manual, needs keys): one real email via curl against Resend + dashboard delivery check.

### P3 — Role requests + auto notifications + live dashboard switch (R4, L6/L18)
1. `role_requests` entity/repo/service; endpoints §6.4 (transactional approve, state guards).
2. Notifications both directions (catalog §10 rows 1-6).
3. `RequestRoleSection.jsx` on student (and company/supervisor) dashboards + `/api/role-requests/mine`.
4. `AdminRoleRequestsPage.jsx` + nav entry + confirm dialog.
5. Approve side-effects: role write → `AuthorityRefreshFilter` picks it up ≤ next request; `AuthContext` poll navigates → **dashboard changes with no re-login**.
6. **Tests**: `RoleRequestFlowTest` (request→admin notified→approve→target role changed→target `/api/me` role reflects→deny path→409 duplicates→non-admin approve 403→ADMIN-approve requires super_admin→concurrent double-approve second gets 409).
   **Gate**: suite + build.

### P4 — Super admin powers: grant, revoke, disable (R6, L6/L7/L16)
1. Endpoints §6.5 with `AuthorizationScopeService` (only place scope rules live).
2. `AdminUsersPage`: role grant/revoke + enable/disable (super-admin-gated UI), with audit + notifications.
3. Wire `mustChangePassword`: `/api/login` flag consumed by frontend → `/change-password` route (simple form → `PUT /api/me/password`? add endpoint `{currentPassword,newPassword}` — self-service change gated by the flag). *This finally makes the dormant column real (L16).*
4. **Tests**: `RevocationMatrixTest` (super admin can revoke anyone; ADMIN target only by super admin; disabled user's next request → 401; demoted user's next request → new authorities; notification delivered to target; audit row written).
   **Gate**: suite + build.

### P5 — University powers (R5, R6-scoped, L7)
1. `GET /api/university/users` (own university), `POST /api/university/users` (create STUDENT/SUPERVISOR forced-scope), `POST /api/university/users/{id}/role` (STUDENT↔SUPERVISOR only, own uni only), `POST /api/university/users/{id}/enabled` (own uni, never ADMIN/super_admin).
2. University dashboard **People** tab (list, create, assign, revoke, disable).
3. Monitoring: existing M9 stats/diaries are already university-scoped — surface links from People tab; add `GET /api/university/activity` (audit rows scoped to university's students) if time allows [DECISION D6: include in P5 vs defer — recommend defer to keep P5 tight; dashboards already show activity].
4. **Tests**: `UniversityScopeTest` (uni-A supervisor: 404 on uni-B student actions, 403 on ADMIN target, success within own uni, notification+audit fired; cross-uni create rejected).
   **Gate**: suite + build.

### P6 — Company powers (R7, L8/L9-partial)
1. Field supervisors: endpoints §6.6 + Company dashboard tab.
2. Vacancy scoping fix: COMPANY ownership + forced companyId (writes), keep ADMIN/SUPERVISOR behavior intact for test compatibility; add ownership tests.
3. Vacancy create → admin notification; Admin dashboard **Marketplace** tab (existing GET `/api/vacancies` feed).
4. **Tests**: `VacancyOwnershipTest` (company A cannot PUT/DELETE B's → 403; forced companyId on create; admin can), `CompanySupervisorCreationTest` (user+industrial row linked, creds notification, login works).
   **Gate**: suite + build (`PlacementSupervisorIntegrationTest` + `PlacementSupervisorIntegrationTest` must stay green — they pin supervisor behavior).

### P7 — Student lookup + placement pipeline (R8/R9, L9)
1. Extend `Placement.Status` with `OFFERED`.
2. `POST /api/companies/student-lookup` (scoped, audited, rate-limited) → DTO per §6.7 (+ units stub `[]` until P8).
3. `POST /api/placements` + COMPANY authority + forced company/university/status → university notification.
4. `POST /api/placements/{id}/approve|reject` (supervisor select on approve) → 3-way notifications.
5. UI: company lookup card + offer button; university approval queue (list OFFERED placements of my university + supervisor dropdown); student placement card from existing `/me`.
6. **Tests**: `PlacementPipelineTest` full journey (lookup found/not-found+audit row, offer → uni notified, approve → ASSIGNED + 3 notifications + wrong-uni supervisor rejected, student `/me` shows supervisor, cross-company offer rejected), `StudentLookupScopeTest`.
   **Gate**: suite + build.

### P8 — Course units (R8 completion)
1. `courses` table + `CourseController` CRUD (ADMIN/SUPERVISOR-own-university) + minimal seed for demo programmes (Nkumba IT programme, years 1-4 — NOT catalog counts; MigrationCatalogCountTest untouched).
2. Wire `UnitCoursesManagement.jsx` to real endpoints (it currently fakes units from schools — fix its data source).
3. Lookup DTO gains `units` filtered by student's programme + year.
4. **Tests**: `CourseCrudTest` + lookup-includes-units; catalog test still green.
   **Gate**: suite + build.

### P9 — Particles responsive (R10)
1. §8.3 implementation in `AuthShell.js` (target formula, resize recompute, pointer gate, reduced-motion, visibility pause, optional DPR).
2. Gate: build + visual matrix at 390/768/1920 widths; zero new ESLint warnings.

After P9: final full verification on `fred` (suite + build), summary report. Push only on request (standing rule from the Chris port).

---

## 10. Notification catalog (event → recipients → title → link)

| # | Event | Recipients | Type | Link |
|---|---|---|---|---|
| 1 | Role requested | all `super_admin` | `ROLE_REQUEST` | `/admin/role-requests` |
| 2 | Role approved | requester | `ROLE_APPROVED` | `homeFor(newRole)` |
| 3 | Role denied | requester | `ROLE_DENIED` | `/` (dashboard) |
| 4 | Role granted/revoked by admin | target | `ROLE_CHANGED` | `/` |
| 5 | Account disabled | target | `ACCOUNT_DISABLED` | `/login` (their session dies) |
| 6 | Registration with unlisted university | all admins | `REGISTRATION_UNLISTED_UNIVERSITY` | `/admin/users` |
| 7 | New vacancy published | all admins | `NEW_VACANCY` | `/admin/marketplace` |
| 8 | Company created field supervisor | new supervisor | `CREDENTIALS_ISSUED` | `/login` |
| 9 | Company offered placement | supervisors of student's university + admins | `PLACEMENT_OFFER` | `/university/placements` |
| 10 | University approved placement | student, company user(s), supervisor | `PLACEMENT_APPROVED` | student→`/student/dashboard`, others→their placements view |
| 11 | Placement rejected | student, company | `PLACEMENT_REJECTED` | `/student/dashboard` |
| 12 | University assigned role/revoked | target | `UNIVERSITY_ROLE_CHANGE` | `/` |

(All created server-side only; `link` validated against an in-app route whitelist — L15.)

---

## 11. Test plan summary

- **Keep green (hard)**: current 41 tests, esp. `MigrationCatalogCountTest` (7 users — no seeded accounts ever, L19), `PlacementSupervisorIntegrationTest` (don't remove supervisor write paths), `UniversityDashboardAnalyticsTest` (scoping).
- **Rewritten in P1/P2**: `AuthFlowIntegrationTest` (login role-param tests removed/reframed; forgot-password trio replaced by token-flow suite).
- **New per phase** (listed in each phase's step: tests): ~9 new test classes, all offline (console email sender, no Resend network).
- **Frontend**: `npm run build` ≤ 9 warnings each phase (baseline from the port — no new unused imports).
- **Manual smoke per phase** where UI-only (bell render, role switch live, lookup card, particles at 3 widths).

---

## 12. Ops runbook (once, before P2 goes live)

1. Create Resend account → add domain → DNS verify (SPF/DKIM per dashboard instructions) → API key.
2. Set env: `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (on verified domain), `APP_BASE_URL` (https in prod), `APP_ALLOWED_ORIGINS`.
3. Send one test email via curl (exact shape from Resend docs) → confirm in Resend dashboard activity log.
4. Watch free-tier caps: 100/day, 3,000/mo — resets only; no marketing mail ever (transactional `/emails` only).
5. H2 dev vs MySQL prod: all DDL additive via `ddl-auto=update`; no `schema.sql` change (already stale/off classpath — standing decision from the port).
6. Backups/rollout: each phase is one ff-merge → revert one merge commit to roll back a phase (same rollback model as the Chris port).

---

## 13. Open decisions (recommendation + alternative) — confirm or override

| # | Decision | Recommendation | Alternative |
|---|---|---|---|
| D1 | Resend client | Spring `RestClient` (0 new deps) | official `com.resend:resend-java` SDK |
| D2 | Password trimming | **Stop trimming passwords everywhere** (register/reset/login consistent) | trim at login too (matches current stored style but silently mutates input) |
| D3 | Verify email at signup (Resend confirmation code) | **Off in first pass**, add as P10 later | on from day one (blocks L14 fully) |
| D4 | Lookup PII scope | Full academic profile + contact (email/phone) — internship office needs it; **every lookup audited** | academic-only until placement accepted, then release contact |
| D5 | Password strength rule | add min 8 server-side in P2 (today: **no minimum anywhere**) | keep as-is (status quo) |
| D6 | University activity feed | defer (dashboards already monitor diaries/stats) | include `GET /api/university/activity` in P5 |
| D7 | Requestable roles | SUPERVISOR, COMPANY, **ADMIN** (per your brief; ADMIN approvals loudly notified to all super admins) | exclude ADMIN from requestable set |
| D8 | Notification transport | polling (15 s) in P0 — zero deps, robust | SSE `SseEmitter` push (upgrade later, same API surface) |

---

## 14. What deliberately does NOT change

- Thymeleaf server-side login (works — proven) and its success handler.
- The4-role `Role` enum and bare-name authorities (every `@PreAuthorize` stays valid).
- Session-based auth (no JWT), CSRF setting (documented residual L17 second step), `pom.xml` (no new dependency anywhere in this plan).
- Existing seeders' row counts (L19) and the 9 pre-existing ESLint warnings.
- The Chris-port docs and history (`docs/PORTING-CHRIS-WORK.md` remains the record of that effort).
