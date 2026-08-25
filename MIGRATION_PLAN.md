# Model B Migration Plan — `migration/schema-b`

Status: APPROVED (pending execution) · Date: 2026-08-25 · Base: fred @ a7c7cf4
Target: merge PR → `developer` after M7

## 1. Locked Rulings
| # | Ruling |
|---|--------|
| R1 | Chris's schema (Model B) is target-of-record; Model A purged by M6c |
| R2 | Entity pairs coexist until each pair's porting phase (StudentProfile↔Student, Company↔InternshipCompany); A-University retained permanently |
| R3 | Student gains intake, academicYear, semester, startDate, endDate; picture blob dropped |
| R4 | schools gains parent_school_id INT NULL + type VARCHAR(20) (COLLEGE/SCHOOL/DIRECTORATE) |
| R5 | Catalog = 3 universities: Nkumba (ours) + Kyambogo & Makerere slices (Chris's uni-2/uni-1 rows, id-aligned) |
| R6 | ETL runs between M5 and M6c only; reconciliation gates mandatory before any deletion |
| R7 | Config: dev=H2 auto-ddl stays default; mysql profile = ddl-auto=none + committed schema.sql; DB NOT renamed (skip Chris's lowercase choice) |
| R8 | roles table dormant; ROLE_* names must never be treated as authorities (authorities stay STUDENT/SUPERVISOR/COMPANY/ADMIN) |

## 2. Catalog Sources (boot totals: 52 / 109 / 307 / 4)
| Source | schools | departments | programmes |
|---|---|---|---|
| Nkumba uni 19 (ours: AcademicUnit+Course+UnitCourse seeders) | 9 (8 SCHOOL + DPGSR DIRECTORATE) | 0 (deptId NULL) | 62 (schoolId from UnitCourse links) |
| Kyambogo uni 2 (developer SchoolDataSeeder uni-2 rows) | 14 | 58 | 131 |
| Makerere uni 1 (developer uni-1 rows, imported FLAT) | 29 | 51 | 114 |

## 3. Phases & Tests

### M0 — Branch + ADR + kill landmine
- `git checkout -b migration/schema-b`; write docs/ADR-002-schema-direction.md (R1–R8, rationale: university structures differ)
- Stub School/Department/ProgrammeDataSeeder bodies to no-ops (they are ACTIVE @Components today — any fresh boot seeds 1,023 foreign rows)
- TEST: `./mvnw compile` green; boot dev → log contains zero school/programme inserts

### M1 — Seeder order + catalog + DDL
- Renumber 18 seeder @Orders unique 20–37 (collisions today: 3,3 / 4,4 / 6,6 / 8,8)
- Rewrite catalog seeders per §2 (Nkumba codes NU-*); add UniversitySupervisorDataSeeder + IndustrialSupervisorDataSeeder (Nkumba demo sets)
- Generate backend/schema.sql with -Dspring.jpa.properties.hibernate.dialect=…MySQLDialect (MySQL flavor)
- Record boot evidence in docs/MIGRATION-MODELB-LOG.md
- TEST: boot ×2 (idempotency: counts stable); SQL counts = 52/109/307/4/50 universities/6 users; compile green

### M2 — Auth regression proof → ⛔ CHECKPOINT (user review)
- TEST: `./mvnw test` 19/19; curl matrix: register/login/me/logout/forgot-password, admin list users, unauth'd /students/** → 401/403
- STOP for user sign-off before M3

### M3 — Student domain rebind
- New dto/StudentDto.java; StudentService rewrite; StudentController → B repo; AuthApiController.register writes Student row (R3 columns included); DashboardController:162-165 rewritten (internship_company_id NULL vs NOT NULL counts); frontend: api.js, InternshipProgress.jsx:21 relative-URL bug, csvExport.js:34 credentials, RegisterPage/StudentEditModal single-model
- TEST: new StudentCrudIntegrationTest; suite ≥20 green; curl register → students row exists; dashboard counts correct

### M4 — Diaries rekey
- DayDiary.studentProfile @ManyToOne → Long studentId (JSON shape change!); ownership check added to DayDiaryApiController; frontend diary components retarget flat fields
- TEST: owner CRUD 200; cross-user access 403; suite green

### M5 — Placements/Vacancies/Evaluations rekey
- ADD Long cols beside strings: placements.university_supervisor_id/company_supervisor_id, evaluations.supervisor_id (strings die in M6c); delete SupervisorController (hash leak) + CompanyService.findStudentsByCompanyId substring matcher
- TEST: placement create resolves both supervisor ids from usernames; orphan-string rows still readable; suite green

### M5.5 — One-time ETL + GATES (window: old+new tables coexist)
- Precondition: `mysqldump … > backup_pre_modelb.sql`
- Write + run backend/migration/modelb_etl.sql (+ rollback file): company→InternshipCompany(+enrichment) w/ company_id_map; company_supervisors→industrial_supervisors; student_profiles→students (user join via username=student_no, R3 cols verbatim, organisation→company match); resolve supervisor strings→ids via users.username; rekey day_diaries/placements/evaluations/vacancies/users.companyId
- GATES (paste output into MIGRATION-MODELB-LOG.md): per-table old-count == converted-count; zero orphans on every rekeyed FK; unmatched supervisor/organisation report reviewed → STOP until user verifies

### M6 — Academic CRUD + purge (3 sub-commits)
- M6a: School/Department/Programme CRUD controllers (rules already covered by /university/** SUPERVISOR|ADMIN — verify)
- M6b: frontend retarget: AcademicUnitsManagement.jsx, api.js, App.js, routes.test.js, DashboardLayout.js; pickers group by parent_school_id when present
- M6c purge: drop entities/repos/controllers/seeders of StudentProfile, Company(+children), academic_units/courses/unit_courses/staff, A-side duplicates; drop string supervisor cols
- TEST: compile; full suite; boot mysql profile ddl-auto=none off committed schema.sql; repeat curl matrix

### M7 — Config + docs + PR
- Final config per R7; align .env.example; load schema.sql into real MySQL once; update ONBOARDING.md/README (+ local CODEBASE_ANALYSIS)
- TEST: fresh boot on mysql profile end-to-end; full curl matrix; open PR → developer (link logged)

## 4. Deferred (explicitly out of scope)
profile-picture storage · OAuth2 dead-code removal · FileManagement real uploads · AuditLogs API_ROOT dedupe · roles-table authority alignment

## 5. Rollback
Per-phase commits → `git revert`; DB point-in-time = backup_pre_modelb.sql; ETL never mutates without backup present.
