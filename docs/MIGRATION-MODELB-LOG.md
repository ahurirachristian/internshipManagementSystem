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
