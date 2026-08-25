# Migration Readme — 16-Table Schema Migration

> **Date**: 2026-08-20
> **Branch**: `fred`
> **Migrated by**: Buffy (AI agent)
> **Purpose**: Migrate the entire project from the old 7-table schema to the new 16-table `mega_backcopy.sql` foundation database design.

---

## Table of Contents

1. [Why This Migration](#1-why-this-migration)
2. [What Changed At A Glance](#2-what-changed-at-a-glance)
3. [Phase-by-Phase Breakdown](#3-phase-by-phase-breakdown)
4. [New Database Schema](#4-new-database-schema)
5. [Updated Login Credentials](#5-updated-login-credentials)
6. [What Each Role Sees](#6-what-each-role-sees)
7. [How To Verify The Migration](#7-how-to-verify-the-migration)
8. [Team Guidelines Going Forward](#8-team-guidelines-going-forward)
9. [Known Limitations](#9-known-limitations)
10. [File Change Summary](#10-file-change-summary)

---

## 1. Why This Migration

The old schema had 7 tables with a flat, limited design:

- `users` — only 3 roles (no COMPANY), no email, no `must_change_password`
- `student_profiles` — flat fields like `firstName`, `lastName`, `degreeProgram`, `companyId` (String), `username`
- `universities` — just `id` and `name` (no structure)
- `company` — `location`, `department`, `profile` (pipe-delimited), `fieldSupervisor`
- No academic hierarchy (no colleges, schools, departments)
- No staff table (supervisors were hardcoded text)
- No placements, evaluations, or audit logs

The new schema (`mega_backcopy.sql`) introduces a proper multi-university academic hierarchy, separates company departments and supervisors into their own tables, adds placements/evaluations/vacancies/audit_logs, and uses `student_no` as the login identifier.

---

## 2. What Changed At A Glance

| Area | Before | After |
|------|--------|-------|
| Database tables | 7 | **16** |
| User roles | 3 (STUDENT, SUPERVISOR, ADMIN) | **4** (adds COMPANY) |
| Student login | `username` (arbitrary string) | `student_no` (e.g. `2400101003`) |
| Student profile fields | 15 (firstName, lastName, companyId, etc.) | **24** (studentName, studentNo, regNo, intake, programme, etc.) |
| University model | `Long id, name` | `Integer universityId, shortForm, fullName, country, establishedYear` |
| Company model | `name, location, department, profile, fieldSupervisor` | `name, registrationNumber, industry, size(ENUM), country, city, physicalAddress, postalAddress, description` |
| Academic structure | None | Self-referencing `academic_units` tree (colleges → schools → departments) |
| Staff | Hardcoded text fields | Separate `staff` table with university/unit FKs |
| Data seeders | 5 | **14** |
| Dummy test accounts | 4 (student/university/airtel/admin) | **6** (3 students + supervisor + company + admin) |

---

## 3. Phase-by-Phase Breakdown

### Phase 1: JPA Entities (7 files modified/created)

**Goal**: Make Java entities match the `mega_backcopy.sql` schema exactly.

| File | Action | Details |
|------|--------|---------|
| `auth/UserEntity.java` | Updated | Added `email`, `mustChangePassword`, `passwordResetToken` fields |
| `university/University.java` | **Rewritten** | PK changed from `Long id` to `Integer universityId`. Fields: `shortForm`, `fullName`, `country`, `establishedYear` |
| `student/StudentProfile.java` | **Rewritten** | 24 fields matching SQL: `studentName`, `studentNo`, `regNo`, `intake`, `program`, `courseName`, `mobileNo`, `email`, `yearOfStudy` (String), `academicYear`, `semester`, `organisation`, `location`, `academicSupervisor`, `fieldSupervisor`, `startDate`, `endDate`, `picture` (byte[]), `unitId`, `courseId`, `academicSupervisorId`, `fieldSupervisorId` |
| `academic/AcademicUnit.java` | **Created** | Self-referencing tree: `unitId`, `universityId`, `parentUnitId`, `unitType` (ENUM), `unitName`, `shortForm` |
| `academic/Course.java` | **Created** | `courseId`, `universityId`, `courseName`, `duration`, `level` (String — SQL ENUM has "Short Course" with space) |
| `academic/UnitCourse.java` | **Created** | Junction table: `id`, `unitId`, `courseId` |
| `academic/Staff.java` | **Created** | `staffId`, `universityId`, `unitId`, `fullName`, `contact`, `email`, `role` |
| `company/Company.java` | Verified | Already matched (uncommitted changes from before migration) |
| `company/CompanyDepartment.java` | Verified | Already matched |
| `company/CompanySupervisor.java` | Verified | Already matched |
| `student/DayDiary.java` | Verified | Already matched |
| `placement/Placement.java` | Verified | Already matched |
| `placement/Vacancy.java` | Verified | Already matched |
| `evaluation/Evaluation.java` | Verified | Already matched |
| `audit/AuditLog.java` | Verified | Already matched |
| `country/Country.java` | Verified | Already matched |

### Phase 2: Repositories (8 files modified/created)

**Goal**: Update query methods for new entity field names.

| File | Action | Key Changes |
|------|--------|-------------|
| `university/UniversityRepository.java` | **Rewritten** | `JpaRepository<University, Integer>`, `findByShortForm`, `findByFullName`, `findByFullNameContainingIgnoreCase` |
| `student/StudentProfileRepository.java` | **Rewritten** | `findByStudentNo`, `findByRegNo`, `findByEmail`, `findByOrganisationContainingIgnoreCase`, `findByUnitId`, `findByCourseId`, `findByAcademicSupervisorId`, `findByFieldSupervisorId`, `findByStudentNameContainingIgnoreCase`, `findByAcademicSupervisor` |
| `student/DayDiaryRepository.java` | **Updated** | `findByStudentProfileStudentNoOrderByDateDesc` (was `...Username...`) |
| `auth/UserRepository.java` | **Updated** | Added `findByEmail()` |
| `academic/AcademicUnitRepository.java` | **Created** | `findByUniversityId`, `findByParentUnitId`, `findByUnitType`, tree queries |
| `academic/CourseRepository.java` | **Created** | `findByUniversityId`, `findByLevel`, compound queries |
| `academic/UnitCourseRepository.java` | **Created** | `findByUnitId`, `findByCourseId`, `findByUnitIdAndCourseId` |
| `academic/StaffRepository.java` | **Created** | `findByUniversityId`, `findByUnitId`, `findByRole` |

### Phase 3: DTOs (5 files rewritten)

**Goal**: DTOs must match the new entity fields.

| File | Action | Key Changes |
|------|--------|-------------|
| `dto/StudentProfileDto.java` | **Rewritten** | 23 fields matching new StudentProfile |
| `dto/UniversityRequest.java` | **Rewritten** | `shortForm`, `fullName`, `country`, `establishedYear` |
| `dto/UniversityDto.java` | **Rewritten** | `Integer universityId`, `shortForm`, `fullName`, `country`, `establishedYear` |
| `dto/StudentCredentialRequest.java` | **Rewritten** | `studentName`, `studentNo`, `regNo`, `intake`, `program`, `courseName`, `email` |
| `dto/UserDto.java` | **Updated** | Added `email`, `companyId`, `universityId` |

### Phase 4: Services (5 files rewritten)

**Goal**: Business logic must use new field names and query methods.

| File | Action | Key Changes |
|------|--------|-------------|
| `service/StudentService.java` | **Rewritten** | `findByStudentNo()`, new `toDto`/`toEntity` with 23 fields, `findDiaryEntriesByStudentNo()` |
| `service/UniversityService.java` | **Rewritten** | `Integer` PK, `findByShortForm`/`findByFullName` validation, `createStudentCredential` uses `studentNo` as login username |
| `service/AdminService.java` | **Updated** | Sort by `studentName`, count by `studentNo`, `getDiaryCountsByStudentNo()` |
| `company/CompanyService.java` | **Updated** | `findStudentsByCompanyId()` now resolves company name then queries by `organisation` |
| `auth/UserService.java` | **Updated** | `toDto()` now includes `email`, `companyId`, `universityId` |

### Phase 5: Controllers (7 files rewritten)

**Goal**: REST and MVC controllers use new field names.

| File | Action | Key Changes |
|------|--------|-------------|
| `controller/StudentController.java` | **Rewritten** | `findByStudentNo()` lookups, `merge()` uses 23 new fields, CSV export with new columns |
| `controller/DashboardController.java` | **Rewritten** | `Integer universityId`, `findByStudentNo()`, `getDiaryEntriesByStudentNo()` |
| `controller/AdminUniversityController.java` | **Rewritten** | `Integer` path variables, new CSV columns |
| `controller/DayDiaryApiController.java` | **Rewritten** | `findByStudentNo()` lookups, feedback writes to `supervisorFeedback` + `status` |
| `controller/DayDiaryController.java` | **Fixed** | `findByStudentNo()` |
| `controller/AdminController.java` | **Fixed** | `getDiaryCountsByStudentNo()` |
| `controller/StudentProfileController.java` | **Fixed** | `findOrCreateByStudentNo()`, `findByStudentNo()` |

### Phase 6: Data Seeders (12 files created/rewritten)

**Goal**: Recreate all `mega_backcopy.sql` dummy data via Java seeders.

| Order | Seeder | Action | Records |
|-------|--------|--------|---------|
| 1 | `CountryDataSeeder` | No change | 196 countries |
| 2 | `UniversityDataSeeder` | **Rewritten** | 50 Ugandan universities (was 10 US universities) |
| 3 | `AcademicUnitDataSeeder` | **Created** | 26 academic units (Nkumba 8 + Makerere 18) |
| 4 | `CourseDataSeeder` | **Created** | 64 courses (62 Nkumba + 2 Makerere) |
| 5 | `UnitCourseDataSeeder` | **Created** | 79 junction links |
| 6 | `StaffDataSeeder` | **Created** | 2 staff members |
| 7 | `CompanyDataSeeder` | No change | 2 companies + 6 departments + 2 supervisors |
| 8 | `DataSeeder` (auth) | **Rewritten** | 6 users (3 students, supervisor, company, admin) |
| 9 | `StudentProfileDataSeeder` | **Rewritten** | 3 student profiles (Kasagga Fred, Alex Johnson, Sarah Owen) |
| 10 | `DayDiaryDataSeeder` | **Created** | 2 diary entries |
| 11 | `PlacementDataSeeder` | **Created** | 3 placements (all ACTIVE) |
| 12 | `EvaluationDataSeeder` | **Created** | 2 mid-term evaluations |
| 13 | `VacancyDataSeeder` | **Created** | 3 vacancies (2 Airtel + 1 MTN) |
| 14 | `AuditLogDataSeeder` | **Created** | 5 audit log entries |

### Phase 7: Frontend (5 files rewritten)

**Goal**: React components use new field names from the API.

| File | Action | Key Changes |
|------|--------|-------------|
| `services/api.js` | **Updated** | `fetchStudentDiaries(studentNo)` — renamed param |
| `dashboards/StudentDashboard.js` | **Rewritten** | 17 profile fields, shows `supervisorFeedback` |
| `components/StudentEditModal.js` | **Rewritten** | 4-step wizard with all new fields |
| `dashboards/CompanyDashboard.js` | **Updated** | New company profile fields, unused import fixed |
| `components/CompanyEditModal.js` | **Rewritten** | 13 Company fields + Size dropdown |

### Phase 8: Configuration

**Goal**: Verify app configs work with new schema.

| File | Status | Notes |
|------|--------|-------|
| `application-dev.properties` | ✅ No change | H2 with `create-drop` — correct |
| `application.properties` | ✅ No change | MySQL with `update` — correct |
| `application-mysql.properties` | ✅ No change | MySQL connection — correct |

### Phase 9: Tests & Templates

**Goal**: Fix all test failures and Thymeleaf template references.

| File | Action | Changes |
|------|--------|---------|
| `AuthFlowIntegrationTest.java` | **Fixed** | Credentials: `student/student123` → `2400101003/Student@123` |
| `AuthAccessTest.java` | **Fixed** | Expected content: `Massachusetts Institute of Technology` → `Nkumba University` |
| `UniversityServiceTest.java` | **Rewritten** | Uses new `StudentCredentialRequest` fields |
| `university-credentials.html` | **Fixed** | 12 field references updated (`university.name` → `fullName`, `student.firstName` → `studentName`, etc.) |
| `CODEBASE_ANALYSIS.md` | **Rewritten** | Complete rewrite for 16-table schema |
| `MIGRATION_README.md` | **Created** | This file |

---

## 4. New Database Schema

### Entity Relationship Diagram (Text)

```
countries (196)
universities (50)
    └── academic_units (26, self-referencing tree)
            └── unit_courses (79) ── courses (64)
    └── staff (2)
    └── courses (64)

company (2)
    ├── company_departments (6)
    └── company_supervisors (2) ── company_departments

users (6) ── company (FK)
         ── universities (FK)

student_profiles (3) ── academic_units (FK)
                      ── courses (FK)
                      ── staff (FK × 2)

day_diaries (2) ── student_profiles
placements (3)   ── student + company
evaluations (2)  ── student + placement
vacancies (3)    ── company
audit_logs (5)   ── standalone
```

### Tables Summary

| Table | Records | Purpose |
|-------|---------|---------|
| `countries` | 196 | World countries (ISO-2 codes) |
| `universities` | 50 | All Ugandan universities |
| `academic_units` | 26 | Self-referencing tree (colleges → schools → departments) |
| `courses` | 64 | Courses scoped per university |
| `unit_courses` | 79 | Junction: which courses belong to which units |
| `staff` | 2 | Academic + field supervisors |
| `company` | 2 | Airtel Uganda, MTN Uganda |
| `company_departments` | 6 | 3 per company |
| `company_supervisors` | 2 | 1 per company (primary field supervisor) |
| `users` | 6 | 3 students + supervisor + company + admin |
| `student_profiles` | 3 | Kasagga Fred, Alex Johnson, Sarah Owen |
| `day_diaries` | 2 | Both for Kasagga Fred |
| `placements` | 3 | One active placement per student |
| `evaluations` | 2 | Mid-term evaluations for Alex and Sarah |
| `vacancies` | 3 | 2 Airtel + 1 MTN openings |
| `audit_logs` | 5 | Sample login/create events |

---

## 5. Updated Login Credentials

| Username | Password | Role | Profile | Notes |
|----------|----------|------|---------|-------|
| `2400101003` | `Student@123` | STUDENT | Kasagga Fred | Nkumba BSCCS, placed at MicroVest |
| `STU-2026-001` | `Student@123` | STUDENT | Alex Johnson | Nkumba BSCCS, placed at Airtel Uganda |
| `STU-2026-002` | `Student@123` | STUDENT | Sarah Owen | Nkumba BSE, placed at Airtel Uganda |
| `university` | `university123` | SUPERVISOR | — | Linked to Nkumba University (id=19) |
| `airtel` | `company123` | COMPANY | — | Linked to Airtel Uganda (id=1) |
| `admin` | `admin123` | ADMIN | — | System admin |

**Important**: Students log in with their **student_no** as the username. The old `student/student123` account no longer exists.

---

## 6. What Each Role Sees

### STUDENT (`2400101003`)
- **Profile tab**: Full student details (name, reg no, intake, programme, course, supervisors, dates)
- **Diary tab**: 2 existing entries + create/edit/delete
- **Progress tab**: Visual internship progress tracker

### SUPERVISOR (`university`)
- **Students tab**: 3 students under Nkumba supervision with counts (total, assigned, pending)
- **Credentials tab**: Create new student accounts (generates login with `Student@123`)

### COMPANY (`airtel`)
- **Profile tab**: Airtel Uganda details (industry, size, registration number, departments, supervisors)
- **Interns tab**: Alex Johnson + Sarah Owen listed as placed interns

### ADMIN (`admin`)
- **Dashboard**: Stats (3 students, 2 diary entries, search/filter)
- **Students tab**: All students with diary counts and CSV export
- **Diaries tab**: All diary entries with review/feedback
- **Users tab**: All 6 user accounts
- **Companies tab**: Airtel + MTN with departments/supervisors
- **Universities tab**: 50 Ugandan universities
- **Placements tab**: 3 active placements
- **Audit Logs tab**: Sample audit trail

---

## 7. How To Verify The Migration

### Quick Verification (2 minutes)

```bash
# 1. Start the backend
cd backend
./mvnw spring-boot:run

# 2. In another terminal, test login
curl -s -X POST http://localhost:8082/api/login \
  -d "username=2400101003" -d "password=Student@123" -d "role=STUDENT"
# Expected: {"username":"2400101003","role":"STUDENT","redirect":".../student/dashboard"}

# 3. Test admin login
curl -s -X POST http://localhost:8082/api/login \
  -d "username=admin" -d "password=admin123"
# Expected: {"username":"admin","role":"ADMIN","redirect":".../admin/dashboard"}

# 4. Check student count
curl -s -b /tmp/ims.txt http://localhost:8082/api/students | python3 -m json.tool | head -5
# Expected: 3 student profiles
```

### Full Verification

```bash
# Run all tests (should show 19/19 pass)
cd backend && ./mvnw test

# Build frontend (should show BUILD SUCCESS)
cd frontend1/ims && CI=false npx react-scripts build
```

### H2 Console Verification

1. Start backend with dev profile
2. Open `http://localhost:8082/h2-console`
3. JDBC URL: `jdbc:h2:mem:testdb`, User: `sa`, Password: (empty)
4. Run: `SELECT COUNT(*) FROM users;` → should return 6
5. Run: `SELECT COUNT(*) FROM student_profiles;` → should return 3
6. Run: `SELECT COUNT(*) FROM academic_units;` → should return 26
7. Run: `SELECT COUNT(*) FROM courses;` → should return 64

---

## 8. Team Guidelines Going Forward

### DO

- **Students login with `student_no`** — the `users.username` column stores the student number
- **Use `organisation` (text)** to link students to companies — there is no `companyId` FK on `student_profiles`
- **University PK is `Integer universityId`** — not `Long id`
- **Course level is a `String`** — not an enum (SQL ENUM has "Short Course" with a space)
- **Run seeders in order** — they have FK dependencies (countries → universities → academic_units → courses → staff → companies → users → student_profiles)
- **Test with the dev profile** — `create-drop` ensures clean schema every boot

### DON'T

- Don't use `username` to look up students — use `studentNo`
- Don't reference `university.name` in Thymeleaf — use `university.fullName`
- Don't reference `student.firstName`/`student.lastName` — use `student.studentName`
- Don't reference `student.degreeProgram` — use `student.program`
- Don't reference `student companyId` — use `student.organisation`
- Don't add data directly to MySQL and skip seeders — the Java seeders are the source of truth

### When Adding New Features

1. **Entities**: Create in the appropriate package (`academic/`, `student/`, `company/`, `placement/`, `evaluation/`, `audit/`)
2. **Repositories**: Follow existing naming conventions (`findByXxx`, `findByXxxContainingIgnoreCase`)
3. **DTOs**: Create in `dto/` package with validation annotations
4. **Services**: Add to existing service or create new one in `service/`
5. **Controllers**: REST in `controller/` with `@RestController`, MVC with `@Controller`
6. **Seeders**: Create in the appropriate package with `@Order(N)` and `count() == 0` guard
7. **Frontend**: Update `api.js` with new API functions, create/update components in `components/`

---

## 9. Known Limitations

1. **No pagination** — all list endpoints return all records at once
2. **Thymeleaf templates are legacy** — many still reference old field names. The React SPA is the primary UI. Templates that aren't used by tests may have broken references.
3. **OAuth2 social login is not wired** — buttons exist in old templates but `SecurityConfig` has no `.oauth2Login()` config
4. **CSRF is disabled globally** — acceptable for API-first architecture but should be enabled for production
5. **CORS allows any origin** — should be restricted in production
6. **`mega_backcopy.sql` is NOT auto-loaded** — it's the reference design. Java seeders recreate the data. Don't expect `mysql -u root -p < mega_backcopy.sql` to work alongside the app.
7. **H2 vs MySQL differences** — H2 is used for dev. Some MySQL-specific syntax may not work in H2. Always test with the `dev` profile first.

---

## 10. File Change Summary

### Backend Files Modified (28 files)

```
auth/UserEntity.java          — added email, mustChangePassword, passwordResetToken
auth/DataSeeder.java          — rewritten: 6 users with new fields
auth/StudentProfileDataSeeder.java — rewritten: 3 profiles with new fields
auth/UserRepository.java      — added findByEmail()
auth/UserService.java         — updated toDto with new fields

university/University.java    — rewritten: Integer PK, new fields
university/UniversityRepository.java — rewritten: Integer PK, new queries
university/UniversityDataSeeder.java — rewritten: 50 Ugandan universities

company/CompanyService.java   — updated findStudentsByCompanyId via organisation

student/StudentProfile.java   — rewritten: 24 fields
student/StudentProfileRepository.java — rewritten: new queries
student/DayDiaryRepository.java — updated query name
student/DayDiaryDataSeeder.java — created: 2 diary entries

academic/AcademicUnit.java         — created
academic/AcademicUnitRepository.java — created
academic/AcademicUnitDataSeeder.java — created: 26 units
academic/Course.java               — created
academic/CourseRepository.java     — created
academic/CourseDataSeeder.java     — created: 64 courses
academic/UnitCourse.java           — created
academic/UnitCourseRepository.java — created
academic/UnitCourseDataSeeder.java — created: 79 links
academic/Staff.java                — created
academic/StaffRepository.java      — created
academic/StaffDataSeeder.java      — created: 2 staff

dto/StudentProfileDto.java         — rewritten: 23 fields
dto/UniversityRequest.java         — rewritten: shortForm/fullName/country/establishedYear
dto/UniversityDto.java             — rewritten: new fields
dto/StudentCredentialRequest.java  — rewritten: studentNo/regNo/intake/program/courseName
dto/UserDto.java                   — updated: added email, companyId, universityId

service/StudentService.java        — rewritten: findByStudentNo
service/UniversityService.java     — rewritten: Integer PK, new create/update
service/AdminService.java          — updated: sort by studentName
service/AdminService.java          — updated: getDiaryCountsByStudentNo

controller/StudentController.java        — rewritten
controller/DashboardController.java      — rewritten
controller/AdminUniversityController.java — rewritten
controller/DayDiaryApiController.java    — rewritten
controller/DayDiaryController.java       — fixed
controller/AdminController.java          — fixed
controller/StudentProfileController.java — fixed

placement/PlacementDataSeeder.java    — created: 3 placements
evaluation/EvaluationDataSeeder.java  — created: 2 evaluations
placement/VacancyDataSeeder.java      — created: 3 vacancies
audit/AuditLogDataSeeder.java         — created: 5 audit logs

templates/university-credentials.html — fixed 12 field references

test/AuthFlowIntegrationTest.java  — fixed credentials
test/AuthAccessTest.java           — fixed expected content
test/UniversityServiceTest.java    — rewritten for new DTO
```

### Frontend Files Modified (5 files)

```
services/api.js                    — updated fetchStudentDiaries param name
dashboards/StudentDashboard.js     — rewritten for new profile fields
components/StudentEditModal.js     — rewritten: 4-step wizard with new fields
dashboards/CompanyDashboard.js     — updated for new company fields
components/CompanyEditModal.js     — rewritten: all new Company fields
```

### Documentation Files (2 files)

```
CODEBASE_ANALYSIS.md  — complete rewrite for 16-table schema
MIGRATION_README.md   — this file
```

---

> **Total files changed: ~55** | **Backend tests: 19/19 passing** | **Frontend build: SUCCESS**
