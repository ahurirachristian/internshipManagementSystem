# Model B Migration Log

Running evidence record for MIGRATION_PLAN.md phases.

## M1 — Seeder order + catalog + DDL (2026-08-25, branch migration/schema-b)

### Seeder order map (21 seeders, unique 20–40)
| Order | Seeder | Notes |
|---|---|---|
| 20 | country/CountryDataSeeder | 196 countries |
| 21 | university/UniversityDataSeeder | 50 (A-shape retained) |
| 22 | role/RoleDataSeeder | 4 roles (dormant, R8) |
| 23 | school/SchoolDataSeeder | **51 rows: NK 901–908 / KYU verbatim / MAK verbatim** |
| 24 | department/DepartmentDataSeeder | **109 rows: KYU+MAK verbatim; Nkumba none by design** |
| 25 | programme/ProgrammeDataSeeder | **307 rows: NK 2001–2062 (deptId NULL, school-linked; durationYears 0 = sub-year) + KYU/MAK verbatim** |
| 26–29 | academic/AcademicUnit, Course, UnitCourse, Staff | A-side legacy until M6c |
| 30 | company/CompanyDataSeeder | A-side legacy until M6c |
| 31 | company/InternshipCompanyDataSeeder | NEW — demo Airtel Uganda anchor |
| 32 | auth/DataSeeder | 6 users |
| 33 | auth/StudentProfileDataSeeder | A-side legacy |
| 34 | supervisor/UniversitySupervisorDataSeeder | NEW — bound to user `university`, uni 19 |
| 35 | supervisor/IndustrialSupervisorDataSeeder | NEW — bound to user `airtel` + demo company |
| 36–40 | student/DayDiary, placement/Placement, evaluation/Evaluation, placement/Vacancy, audit/AuditLog | unchanged content |

Collisions resolved: former duplicated orders 3/3/3, 4/4, 6/6, 8/8 are gone.

### Schema generation
`schema.sql` generated with MySQL dialect override:
```
./mvnw spring-boot:run -Dspring-boot.run.arguments="\
--spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQLDialect \
--spring.jpa.properties.jakarta.persistence.schema-generation.scripts.action=create \
--spring.jpa.properties.jakarta.persistence.schema-generation.scripts.create-target=schema.sql"
```
(Note for future regens: run from `backend/`; a `file:` URI with the repo's
spaces breaks Hibernate script targets — use the bare filename.)

Result: 24 tables, engine=InnoDB. Confirms:
- `schools.parent_school_id` + `schools.type` present (R4)
- `programmes.department_id` nullable (R3/Nkumba flat ruling)

Entity edits this phase: `School` += parentSchoolId/type;
`Programme.departmentId` nullable=true.

### Boot verification
`MigrationCatalogCountTest` (@SpringBootTest, fresh H2 per run):
- schools=51, departments=109, programmes=307, roles=4, universities=50,
  countries=196, users=6, university_supervisors=1, industrial_supervisors=1,
  internship_companies≥1 — PASS
- every NK programme has NULL departmentId — PASS
- DPGSR row typed DIRECTORATE with NULL parent — PASS
- full suite: **Tests run: 20, Failures: 0, Errors: 0 — BUILD SUCCESS**

Idempotency: all catalog seeders guard on `repository.count() > 0 → return`;
repeat boots in one DB lifetime insert nothing (guards verified by code
inspection; fresh-context test proves determinism from empty).

## M2 — Auth regression proof (2026-08-25, branch migration/schema-b)

`./mvnw test`: **Tests run: 20, Failures: 0, Errors: 0 — BUILD SUCCESS**
(13 AuthFlowIntegrationTest + 4 AuthAccessTest + 1 MigrationCatalogCountTest
+ 1 UniversityServiceTest + 1 DemoApplicationTests).

Live curl matrix (dev profile, H2 in-memory, port 8082):

| # | Probe | Result |
|---|-------|--------|
| 1 | unauth'd `GET /api/students` | 302 → login (form-login gate) ✅ |
| 2 | `POST /api/login` admin/admin123 | 200, JSESSIONID issued ✅ |
| 3 | `GET /api/me` (admin) | `{"role":"ADMIN","username":"admin"}` ✅ |
| 4 | `GET /api/admin/users` (admin) | 200 ✅ |
| 5 | `POST /api/register` STUDENT m2probe | 201 created ✅ |
| 6–7 | student login + `/api/me` | 200 / role STUDENT ✅ |
| 8 | admin creds with `role=STUDENT` | rejected "role does not match" ✅ |
| 9 | wrong password | 401 ✅ |
| 10 | forgot-password full flow | reset 200; old pw 401; new pw 200 ✅ |
| 11 | `POST /logout` then `/api/me` | 302 / session dead ✅ |

Notes:
- Earlier 500 on probe 10 was a malformed curl (form-encoded vs required
  JSON body) — endpoint verified correct with proper payload.
- H2 in-memory wipes between restarts: probes must re-register per boot
  (observed and confirmed intentional dev behavior).
- ⛔ CHECKPOINT reached — awaiting user sign-off before M3.

## M3 — Student domain rebind (2026-08-25, branch migration/schema-b)

### Backend
- `Student` entity += R3 columns: intake, academicYear, semester,
  start_date, end_date (all nullable). Picture blob intentionally dropped.
- `dto/StudentDto.java` NEW — flat B projection incl. computed fullName +
  username convenience; no legacy aliases.
- `StudentRepository` += finders: findByUserId, findByStudentNumber,
  findByInternshipCompanyId, findByUniversityId, findByUniSupervisorId,
  findByIndSupervisorId, name search.
- `StudentController` REWRITTEN onto B: /me, /me/progress (diary count via
  A link — transitional until M4), PUT /me partial merge, CRUD, CSV export
  with B columns, `/company/{id}` = exact FK lookup (substring matcher no
  longer used here), `/search`.
- `AuthApiController.register` now creates a linked `students` row for every
  STUDENT signup (university default 19/Nkumba; accepts optional
  firstName/lastName/fullName/studentNumber/degreeProgram/yearOfStudy/
  phoneNumber/intake/academicYear/semester/dates).
- `DashboardController` assigned/pending counts rewritten from the
  `"Pending"` string heuristic to `internshipCompanyId != null`, scoped to
  the supervisor via university_supervisors (loophole #3 fix).
- Transitional A-side consumers left intact by design (R2 coexistence):
  StudentService legacy methods, MVC student-edit pages, credential flow.

### Frontend
- `InternshipProgress.jsx` relative-URL bug fixed (API_ROOT).
- `csvExport.js` fallback fetch now sends credentials.
- Field renames to B DTO across: StudentDashboard, AdminDashboard (student-
  list parts only; diary studentProfile reads untouched until M4),
  UniversityDashboard table + company-name resolution by id,
  UniversityStudents (filter/row/add-payload), CompanyProfilePage interns,
  PlacementMatching, StudentEditModal (full rework: names split,
  supervisor/company id inputs, R3 fields).
- RegisterPage was already B-shaped; its saveMyProfile merge lands on the
  new row. Credential form payloads unchanged (A endpoint dies at M5).

### Verification
- New `StudentCrudIntegrationTest` (4 tests): registration→students row
  (+R3 values, uni 19, studentNumber=username); non-STUDENT registration
  creates no row; admin fetch/search on B fields; company lookup = exact FK
  single hit.
- Full suite: **Tests run: 24, Failures: 0 — BUILD SUCCESS**
- Live boot curl proof: register m3live → login → GET /api/students/me
  returns the Model-B row (fullName "Live Proof", universityId 19,
  intake AUG/2024, yearOfStudy 3).

## M4 — DayDiary rekey (2026-08-25, branch migration/schema-b)

### Backend
- `DayDiary` rekeyed: dropped the codebase's only `@ManyToOne` join
  (`student_profile_id`) for a flat `student_id` Long → Model-B
  students.id. `DayDiaryRepository` reduced to
  `findByStudentIdOrderByDateDesc`.
- `DayDiaryApiController` rewritten: every response is now a flattened view
  (`studentName`, `studentNumber`, `studentId` resolved per entry — no more
  nested `studentProfile` object). New `/me` endpoint for self-scoped reads.
  Ownership enforced: STUDENT create binds to own row; update/delete require
  owner or ADMIN/SUPERVISOR; **fixed loophole** — any STUDENT could
  previously delete any diary. `/student/{id}` now takes the B id and
  rejects foreign students.
- MVC `DayDiaryController.save` attaches to the B row via username→user→
  student resolution.
- `StudentService.findDiaryEntriesByStudentNo` (username arg) resolves the
  B row; empty list when absent.
- `AdminService`: countActiveStudents by distinct studentId;
  diary counts keyed by username; NEW getDiaryViews() feeds the Thymeleaf
  admin page (template switched off entry.studentProfile.*).
- Cascade deletes: StudentController DELETE removes owned diaries;
  DashboardController A-flow delete bridges through studentNumber until M6c.
- `DayDiaryDataSeeder` now guarantees a B students row for the demo
  `student` account before attaching its two demo entries.

### Frontend
- api.js: new fetchMyDiaries(); API_ROOT exported (InternshipProgress
  needed it as a module import).
- DiaryReviewModal + AdminDashboard read flattened identity fields
  (entry.studentName/studentNumber); local diary-count map keyed by
  studentNumber; StudentDashboard uses `/me`.

### Verification
- New `DayDiaryIntegrationTest` (3 tests): student creates diary against
  B row (studentId bound server-side); stranger's delete → 403, owner's →
  204; supervisor feedback + flattened GET list identity.
- Full suite: **Tests run: 27, Failures: 0 — BUILD SUCCESS**
- React production build compiles (warnings only).
- Live curl proof: register m4live → POST /api/diaries 201 (studentId 1 =
  auto-created B row) → GET /api/diaries/me shows flattened entry →
  /me/progress diaryCount = 1.
