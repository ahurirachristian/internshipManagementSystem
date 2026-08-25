# Internship Management System — Complete Architecture Walkthrough

A comprehensive analysis of the codebase: structure, data flow, and how everything connects.

> **New here?** Start with [`ONBOARDING.md`](ONBOARDING.md) — a first-week guide with endpoint inventory, gotchas, and recipes. This document is the deeper reference (machine runbook §0, entity/column reference).
>
> **Model B migration note (2026-08-25)**: The Model A → Model B migration is complete through M7. Model B is the sole active schema. Model A entities (`academic/`, `StudentProfile`, `Company`) were purged in M6c. Active packages: `school/`, `department/`, `programme/`, `student/Student`, `company/InternshipCompany`, `supervisor/`. See `ONBOARDING.md §1` and `docs/MIGRATION-MODELB-LOG.md` for the full decision log.

> **Last updated**: 2026-08-25 — after Model B migration M0–M7. System MySQL 8.0.46 is the primary database. 20 tables in `schema.sql`, 15 live in production (4 A-side tables dropped in M7).

---

## 0. HOW TO RUN THIS PROJECT (STEP-BY-STEP RUNBOOK)

> Always follow this order: **start the database first (if MySQL) → start the backend → start the frontend → verify → shut down in reverse order.**

### 0.1 What's already installed on this machine (verified)

> **Last verified: 2026-08-24** — machine state changed since the original walkthrough.

| Tool | Version | Notes |
|------|---------|-------|
| Java | Temurin OpenJDK **17.0.13** | Installed at `~/.local/jdks/jdk-17.0.13+11`, **NOT on PATH** → `export JAVA_HOME=$HOME/.local/jdks/jdk-17.0.13+11` before running Maven |
| Maven wrapper | `./mvnw` → Maven 3.9.16 | Executable (chmod +x committed) |
| Node.js | v26.7.0 | Required by the frontend |
| npm | 11.19.0 | Frontend deps in `frontend1/ims/node_modules` |
| Database engine (primary) | MySQL Community 8.0.46 | systemd service `mysql`, active on port 3306; root password `kasaggafred001` |
| Database engine (alternative) | XAMPP 8.2.12 → MariaDB 10.4.32 | At `/opt/lampp`; stop system MySQL first (`sudo systemctl stop mysql`), then `sudo /opt/lampp/xampp startmysql`; root has EMPTY password |
| Database | `internshipManagementSystem_db` | 15 tables (Model B). Schema managed by Hibernate `ddl-auto=update`. Catalog data seeded via `backend/migration/catalog_seed.sql` |

### 0.2 Quick start — H2 in-memory (zero setup, recommended for daily dev)

```
TERMINAL 1 — Backend
  cd backend
  export JAVA_HOME=$HOME/.local/jdks/jdk-17.0.13+11   # Java is not on PATH on this machine
  ./mvnw spring-boot:run
  # dev profile is the default → H2 in-memory database, no MySQL needed
  # First run is slow (downloads Maven + dependencies). Subsequent runs are fast.
  # Wait for: "Started DemoApplication in ~24s" and "Tomcat started on port 8082"

TERMINAL 2 — Frontend
  cd frontend1/ims
  npm start
  # Wait for: "Compiled successfully!" and "Local: http://localhost:3000"
```

Total startup time: ~30–90 seconds. This is the fastest way to see the app working.

### 0.3 Full start — System MySQL (production-like, persistent data)

> System MySQL 8.0.46 is the primary database. Root password: `kasaggafred001`.
> The database is already loaded with production data (users, students, placements, etc.)
> and catalog data (51 schools, 109 departments, 307 programmes via `catalog_seed.sql`).

#### Daily start

TERMINAL 1 — Backend
```bash
systemctl is-active mysql || sudo systemctl start mysql   # ensure MySQL is running
cd "/home/nuera/Forge/satesoft/Internship Management System/backend"
export JAVA_HOME=$HOME/.local/jdks/jdk-17.0.13+11
./mvnw spring-boot:run -Dspring-boot.run.profiles=mysql
# Wait for: "Tomcat started on port 8082"
# Hibernate ddl-auto=update will create any missing B-side tables on first boot.
```

TERMINAL 2 — Frontend
```bash
cd "/home/nuera/Forge/satesoft/Internship Management System/frontend1/ims"
npm start
# Wait for: "Compiled successfully!" → http://localhost:3000
```

#### First-time setup (fresh database — run ONCE)

```bash
# ── STEP 1: Ensure MySQL is running ─────────────────────────────────
systemctl is-active mysql || sudo systemctl start mysql

# ── STEP 2: Load foundation data from mega_backcopy.sql ──────────────
cd "/home/nuera/Forge/satesoft/Internship Management System"
mysql -u root -pkasaggafred001 < mega_backcopy.sql

# ── STEP 3: Seed B-side catalog (schools/departments/programmes) ─────
mysql -u root -pkasaggafred001 internshipManagementSystem_db < backend/migration/catalog_seed.sql

# ── STEP 4: Verify ──────────────────────────────────────────────────
mysql -u root -pkasaggafred001 internshipManagementSystem_db -e "
  SELECT 'schools' as tbl, count(*) FROM schools
  UNION ALL SELECT 'departments', count(*) FROM departments
  UNION ALL SELECT 'programmes', count(*) FROM programmes;
"
# → 51 / 109 / 307
```

Steps 3–4 (backend + frontend) are exactly the "Daily start" commands above.
The password `kasaggafred001` is hardcoded in `application-mysql.properties`.

**Why nothing is recreated on later runs:** Hibernate `ddl-auto=update` only
*adds* missing columns/tables (never wipes), and the Java seeders are
idempotent (`count() == 0` guards — they skip when data exists).

#### Alternative route — XAMPP MariaDB (if system MySQL is unavailable)

```bash
# Stop system MySQL, start XAMPP MariaDB
sudo systemctl stop mysql
sudo /opt/lampp/xampp startmysql
/opt/lampp/bin/mysql -u root -e "SELECT VERSION();"   # → 10.4.32-MariaDB

# Load foundation data (empty password on XAMPP root)
cd "/home/nuera/Forge/satesoft/Internship Management System"
/opt/lampp/bin/mysql -u root < mega_backcopy.sql
/opt/lampp/bin/mysql -u root internshipManagementSystem_db < backend/migration/catalog_seed.sql

# Backend — override password to empty (XAMPP root has no password)
cd "/home/nuera/Forge/satesoft/Internship Management System/backend"
export JAVA_HOME=$HOME/.local/jdks/jdk-17.0.13+11
SPRING_DATASOURCE_PASSWORD= ./mvnw spring-boot:run -Dspring-boot.run.profiles=mysql

# Frontend (separate terminal)
cd "/home/nuera/Forge/satesoft/Internship Management System/frontend1/ims" && npm start
```

### 0.4 Access points

| What | URL | Notes |
|------|-----|-------|
| Backend health check | `http://localhost:8082/` | Returns "Backend is up and running successfully!" |
| React SPA login | `http://localhost:3000/login` | Primary UI |
| H2 console (dev only) | `http://localhost:8082/h2-console` | JDBC URL `jdbc:h2:mem:testdb`, user `sa`, no password |
| MySQL console (system MySQL 8 — primary) | `mysql -u root -pkasaggafred001` | Port 3306, password `kasaggafred001` |
| MySQL console (XAMPP MariaDB) | `/opt/lampp/bin/mysql -u root` | Empty password; requires stopping system MySQL first |

### 0.5 Demo accounts (auto-seeded)

| Username | Password | Role | Profile |
|----------|----------|------|---------|
| `2400101003` | `Student@123` | STUDENT | Kasagga Fred — Nkumba, placed at MicroVest |
| `STU-2026-001` | `Student@123` | STUDENT | Alex Johnson — Nkumba, placed at Airtel Uganda |
| `STU-2026-002` | `Student@123` | STUDENT | Sarah Owen — Nkumba, placed at Airtel Uganda |
| `university` | `university123` | SUPERVISOR | Linked to Nkumba University (id=19) |
| `airtel` | `company123` | COMPANY | Linked to Airtel Uganda (id=1) |
| `admin` | `admin123` | ADMIN | System admin |

> Students log in with their **student_no** as the username (e.g. `2400101003`). Default password is `Student@123` with `must_change_password = TRUE`.

### 0.6 Verification checklist

```bash
curl -s http://localhost:8082/                 # → "Backend is up and running successfully!"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8082/login   # → 200

# Login smoke test (admin):
curl -s -c /tmp/ims.txt -X POST http://localhost:8082/api/login \
  -d "username=admin" -d "password=admin123"
# → {"username":"admin","role":"ADMIN","redirect":"http://.../admin/dashboard"}

# Login smoke test (student):
curl -s -c /tmp/ims.txt -X POST http://localhost:8082/api/login \
  -d "username=2400101003" -d "password=Student@123" -d "role=STUDENT"
# → {"username":"2400101003","role":"STUDENT","redirect":"http://.../student/dashboard"}

# Verify current user:
curl -s -b /tmp/ims.txt http://localhost:8082/api/me
# → {"username":"2400101003","role":"STUDENT","universityId":19,"companyId":null}
```

### 0.7 Shutdown order (reverse of startup)

```
1. Ctrl+C in the frontend terminal (npm start)
2. Ctrl+C in the backend terminal (spring-boot:run)
3. Stop the database (optional — safe to leave running):
   sudo systemctl stop mysql    # system MySQL
   # or
   sudo /opt/lampp/xampp stopmysql   # XAMPP MariaDB
```

### 0.8 Troubleshooting

| Symptom | Root cause | Fix |
|---------|-----------|-----|
| `./mvnw: Permission denied` | Wrapper not executable | `chmod +x backend/mvnw` |
| `./mvnw` fails with `java: command not found` | Java not on PATH on this machine | `export JAVA_HOME=$HOME/.local/jdks/jdk-17.0.13+11` |
| XAMPP MariaDB (`startmysql`) fails to bind 3306 | Port held by system MySQL | Stop it first: `sudo systemctl stop mysql`, then retry `startmysql` |
| Backend exits with "Connection refused" on 3306 | The database you chose isn't running | System MySQL: `sudo systemctl start mysql`; XAMPP: `sudo /opt/lampp/xampp startmysql` (stop system MySQL first) |
| Backend won't start with `mysql` profile | Stale schema incompatible with new entities | Hibernate `ddl-auto=update` usually auto-fixes. If not: drop and recreate the database |
| Auth fails / "Access denied for user 'root'" with mysql profile | Wrong password in `application-mysql.properties` | Password is `kasaggafred001` (system MySQL) or empty (XAMPP MariaDB). For XAMPP: `SPRING_DATASOURCE_PASSWORD= ./mvnw spring-boot:run ...` |
| Port already in use (8082/3000/3306) | Another process | `ss -tlnp \| grep -E '8082\|3000\|3306'`, then stop/kill it |
| Frontend login fails / "failed to fetch" | Backend not running on 8082 | Start backend first |
| First `./mvnw` run hangs on downloads | Wrapper downloading Maven + deps | Wait; needs internet once |
| Data resets on restart | Running the H2 `dev` profile | Switch to the `mysql` profile for persistent data |

---

## 1. HIGH-LEVEL OVERVIEW

This is an **Internship Management System** built with:
- **Backend**: Java 17 + Spring Boot **4.1.0** (Spring MVC, Spring Security, Spring Data JPA, Thymeleaf, Validation)
- **Frontend**: React SPA (`frontend1/ims/`) with React Router, Tailwind CSS, Lucide icons
- **Database**: H2 in-memory (default `dev` profile) or MySQL 8.0.46 (`mysql` profile)
- **Build Tool**: Maven (with wrapper `./mvnw`)

The system has **4 user roles**:
| Role | Purpose |
|------|---------|
| `STUDENT` | Interns who log daily diary entries and manage their profile |
| `SUPERVISOR` | University staff who manage schools/departments/programmes, review diaries |
| `COMPANY` | Company reps who view their profile, departments, and interns |
| `ADMIN` | System-wide management (users, universities, companies, placements, audit logs) |

**Key fact**: authorities are matched as **raw role names** (`ADMIN`, `SUPERVISOR`, …) — no `ROLE_` prefix anywhere. `CustomUserDetailsService` wraps `user.getRole().name()` in a `SimpleGrantedAuthority`.

---

## 2. PROJECT STRUCTURE

```
internshipManagementSystem/
├── backend/
│   ├── src/main/java/com/example/demo/
│   │   ├── DemoApplication.java         # Entry point
│   │   ├── auth/                         # Security config, UserEntity, Role, seeders
│   │   ├── company/                      # InternshipCompany, CompanyDepartment, CompanySupervisor + controllers
│   │   ├── controller/                   # REST + MVC controllers (Auth, Student, Dashboard, Admin, School, Dept, Programme, etc.)
│   │   ├── country/                      # Country entity, repo, service, seeder
│   │   ├── department/                   # Department entity + CRUD controller (M6a)
│   │   ├── dto/                          # DTOs (StudentDto, CompanyRequest, etc.)
│   │   ├── placement/                    # Placement, Vacancy entities + repos, controllers
│   │   ├── evaluation/                   # Evaluation entity + repo, controller
│   │   ├── audit/                        # AuditLog entity + repo, controller
│   │   ├── school/                       # School entity + CRUD controller (M6a)
│   │   ├── programme/                    # Programme entity + CRUD controller (M6a)
│   │   ├── supervisor/                   # IndustrialSupervisor, UniversitySupervisor entities
│   │   ├── service/                      # StudentService, UniversityService, AdminService
│   │   ├── student/                      # Student, DayDiary entities + repos
│   │   └── university/                   # University entity, repo, seeder
│   ├── src/main/resources/
│   │   ├── templates/                    # Thymeleaf HTML templates (legacy server-rendered UI)
│   │   ├── static/                       # CSS, images, assets
│   │   └── application*.properties       # Config (port 8082, profiles: dev/mysql)
│   └── src/test/                         # Integration + unit tests
├── frontend1/ims/                        # React SPA (primary UI)
│   ├── src/
│   │   ├── App.js                        # React Router with role-based protected routes
│   │   ├── context/AuthContext.js         # Auth state management
│   │   ├── services/api.js               # REST API client (~60 functions)
│   │   └── components/
│   │       ├── dashboards/               # Role-specific dashboards
│   │       ├── StudentEditModal.js       # 4-step student profile wizard
│   │       ├── CompanyEditModal.js       # Company edit form
│   │       ├── DiaryReviewModal.jsx      # Supervisor diary feedback
│   │       ├── InternshipProgress.jsx    # Progress tracker
│   │       ├── SchoolsManagement.jsx     # School CRUD (M6b)
│   │       ├── DepartmentsManagement.jsx # Department CRUD (M6b)
│   │       ├── ProgrammesManagement.jsx  # Programme CRUD (M6b)
│   │       └── ...                       # Other components
│   └── public/                           # Static HTML/JS pages
├── backend/schema.sql                    # MySQL DDL reference (20 tables, regenerated M7)
├── backend/migration/catalog_seed.sql    # B-side catalog data (51 schools, 109 depts, 307 programmes)
├── backend/migration/modelb_etl.sql      # ETL script (A→B migration, verified dry-run)
├── mega_backcopy.sql                     # Foundation database dump (legacy A-side, still loaded for shared tables)
├── CODEBASE_ANALYSIS.md                  # This file
└── README.md
```

---

## 3. DATABASE SCHEMA (20 Tables in schema.sql, 15 Live in Production)

`schema.sql` is the MySQL DDL reference (20 tables). The live production database has 15 tables after the A-side purge in M7. Schema is managed by Hibernate `ddl-auto` (`create-drop` on dev, `update` on mysql). Catalog data (schools/departments/programmes) is seeded via `backend/migration/catalog_seed.sql`.

### 3.1 `countries` — Country.java
```java
@Entity @Table(name = "countries")
public class Country {
    Long id;       // @Id, IDENTITY
    String name;   // NOT NULL
    String code;   // NOT NULL, UNIQUE — ISO-2 code (e.g. "UG")
}
```

### 3.2 `universities` — University.java
```java
@Entity @Table(name = "universities")
public class University {
    Integer universityId;  // @Id, IDENTITY — NOT Long
    String shortForm;      // NOT NULL, UNIQUE (e.g. "MAK", "NU")
    String fullName;       // NOT NULL, UNIQUE (e.g. "Makerere University")
    String country;        // default "Uganda"
    Integer establishedYear;
}
```

### 3.3 `company` — Company.java
```java
@Entity @Table(name = "company")
public class Company {
    Long id;
    String name;              // NOT NULL, UNIQUE
    String registrationNumber;// UNIQUE (e.g. "UBS-2010-12345")
    String industry;          // e.g. "Telecommunications"
    Size size;                // ENUM: Small, Medium, Large, Enterprise
    String website;
    String email;
    String phone;
    String country;           // default "Uganda"
    String city;
    String physicalAddress;
    String postalAddress;
    String description;       // @Lob TEXT
    String logoUrl;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
    @OneToMany List<CompanyDepartment> departments;
    @OneToMany List<CompanySupervisor> supervisors;
}
```

### 3.4 `company_departments` — CompanyDepartment.java
```java
@Entity @Table(name = "company_departments")
public class CompanyDepartment {
    Long id;
    @ManyToOne Company company;          // FK, NOT NULL, CASCADE delete
    String departmentName;               // NOT NULL, UNIQUE per company
    String headName;
    String headContact;
    String headEmail;
}
```

### 3.5 `company_supervisors` — CompanySupervisor.java
```java
@Entity @Table(name = "company_supervisors")
public class CompanySupervisor {
    Long id;
    @ManyToOne Company company;            // FK, NOT NULL, CASCADE delete
    @ManyToOne CompanyDepartment department; // FK, nullable, SET NULL on delete
    String fullName;                       // NOT NULL
    String contact;
    String email;
    String role;                           // e.g. "Field Supervisor"
    Boolean isPrimary;                     // default FALSE
}
```

### 3.6 `users` — UserEntity.java
```java
@Entity @Table(name = "users")
public class UserEntity {
    Long id;
    String username;            // NOT NULL, UNIQUE — students use student_no
    String password;            // NOT NULL, BCrypt encoded
    Role role;                  // ENUM: STUDENT, SUPERVISOR, ADMIN, COMPANY
    Long companyId;             // FK to company (nullable)
    Long universityId;          // FK to universities (nullable)
    String provider;            // OAuth provider (nullable)
    String providerId;          // OAuth ID, UNIQUE (nullable)
    String email;
    Boolean mustChangePassword; // default TRUE for STUDENTs
    String passwordResetToken;
}
```

### 3.7 `schools` — School.java
```java
@Entity @Table(name = "schools")
public class School {
    Integer schoolId;           // @Id, noGeneratedValue (seeders assign IDs)
    Integer universityId;       // NOT NULL
    String schoolName;          // NOT NULL
    String schoolCode;          // e.g. "NU-SCI", "COCIS"
    Integer parentSchoolId;     // self-FK, nullable
    String type;                // SCHOOL, COLLEGE, DIRECTORATE
}
```

### 3.8 `departments` — Department.java
```java
@Entity @Table(name = "departments")
public class Department {
    Integer departmentId;       // @Id, noGeneratedValue
    Integer schoolId;           // NOT NULL
    Integer universityId;       // NOT NULL
    String departmentName;      // NOT NULL
}
```

### 3.9 `programmes` — Programme.java
```java
@Entity @Table(name = "programmes")
public class Programme {
    Integer programmeId;        // @Id, noGeneratedValue
    Integer schoolId;           // NOT NULL
    Integer universityId;       // NOT NULL
    Integer departmentId;       // nullable (Nkumba is flat — no departments)
    String programmeName;       // NOT NULL
    String programmeCode;       // NOT NULL, e.g. "NK-P001", "MBCHB_MAK"
    String programmeLevel;      // NOT NULL: Certificate, Diploma, Bachelors, Masters, PhD
    Integer durationYears;      // NOT NULL
}
```
Catalog data: 51 schools (29 MAK + 14 KYU + 8 NU), 109 departments (51 MAK + 58 KYU), 307 programmes (114 MAK + 131 KYU + 62 NU). Seeded via `backend/migration/catalog_seed.sql`.

### 3.10 `students` — Student.java (Model B)
```java
@Entity @Table(name = "students")
public class Student {
    Long id;                    // @Id, IDENTITY
    Long userId;                // FK to users
    Long universityId;          // NOT NULL
    Long internshipCompanyId;   // nullable
    Long uniSupervisorId;       // nullable, FK to university_supervisors
    Long indSupervisorId;       // nullable, FK to industrial_supervisors
    String firstName;           // NOT NULL
    String lastName;            // NOT NULL
    String studentNumber;       // NOT NULL
    String registrationNumber;  // NOT NULL
    String degreeProgram;       // NOT NULL
    String phoneNumber;
    String academicYear;
    String intake;
    String semester;
    Integer yearOfStudy;
    LocalDate startDate;
    LocalDate endDate;
}
```

### 3.11 `student_profiles` — StudentProfile.java (legacy A-side, still exists)
```java
@Entity @Table(name = "student_profiles")
public class StudentProfile {
    Long id;
    String studentName;               // NOT NULL
    String studentNo;                 // NOT NULL, UNIQUE — login username
    String regNo;                     // NOT NULL, UNIQUE
    String intake;                    // e.g. "AUG/2024"
    String program;                   // e.g. "BSCCS"
    String courseName;                // e.g. "Internship"
    String mobileNo;
    String email;                     // NOT NULL, UNIQUE
    String yearOfStudy;               // String, e.g. "2026"
    String academicYear;              // e.g. "Two"
    String semester;                  // e.g. "Two"
    String organisation;              // company name, e.g. "MicroVest"
    String location;                  // e.g. "National ICT Innovation Hub, Nakawa"
    String academicSupervisor;        // text name
    String academicSupervisorContact;
    String fieldSupervisor;           // text name
    String fieldSupervisorContact;
    LocalDate startDate;
    LocalDate endDate;
    byte[] picture;                   // @Lob, nullable
    Integer unitId;                   // FK to academic_units (dead, FK dropped)
    Integer courseId;                 // FK to courses (dead, FK dropped)
    Integer academicSupervisorId;     // FK to staff (dead, FK dropped)
    Integer fieldSupervisorId;        // FK to staff (dead, FK dropped)
}
```
⚠️ Legacy table from Model A. Still exists in MySQL but no longer read/written by B-side code. FK constraints to `academic_units`/`courses`/`staff` were dropped in M7. Will be removed in a future cleanup.

### 3.12 `industrial_supervisors` — IndustrialSupervisor.java
```java
@Entity @Table(name = "industrial_supervisors")
public class IndustrialSupervisor {
    Long id;
    Long companyId;
    Long userId;
    String firstName;
    String lastName;
    String department;
    String jobTitle;
    String phoneNumber;
}
```

### 3.13 `university_supervisors` — UniversitySupervisor.java
```java
@Entity @Table(name = "university_supervisors")
public class UniversitySupervisor {
    Long id;
    Long universityId;
    Long userId;
    String firstName;
    String lastName;
    String department;
    String phoneNumber;
}
```

### 3.14 `internship_companies` — InternshipCompany.java
```java
@Entity @Table(name = "internship_companies")
public class InternshipCompany {
    Long id;
    Integer countryId;
    Long universityId;          // nullable
    String companyName;
    String branch;
    String email;
    String website;
    String physicalAddress;
    String postalAddress;
    LocalDateTime createdAt;
}
```

### 3.15 `day_diaries` — DayDiary.java
```java
@Entity @Table(name = "day_diaries")
public class DayDiary {
    Long id;
    LocalDate date;
    String dailyActivities;           // @Lob TINYTEXT
    String knowledgeAndSkillsGained;  // @Lob TINYTEXT
    String accomplishments;           // @Lob TINYTEXT
    String status;                    // default "PENDING"
    String supervisorFeedback;        // @Lob, nullable
    @ManyToOne Student student;  // FK student_id, NOT NULL (was studentProfile in A-side)
}
```

### 3.16 `placements` — Placement.java
```java
@Entity @Table(name = "placements")
public class Placement {
    Long id;
    Long studentId;                 // FK to students
    Long companyId;                 // FK to internship_companies
    Long universitySupervisorId;    // nullable, FK to university_supervisors (B-side)
    Long companySupervisorId;       // nullable, FK to company_supervisors (B-side)
    String universitySupervisor;    // legacy string (kept for backward compat)
    String companySupervisor;       // legacy string (kept for backward compat)
    Status status;                  // ENUM: PENDING, ASSIGNED, ACTIVE, COMPLETED, CANCELLED
}
```

### 3.17 `evaluations` — Evaluation.java
```java
@Entity @Table(name = "evaluations")
public class Evaluation {
    Long id;
    Long studentId;                 // FK to students
    Long placementId;               // nullable
    Long supervisorUserId;          // nullable, FK to users (B-side)
    String supervisorType;          // e.g. "COMPANY", "UNIVERSITY"
    String supervisorUsername;
    Integer punctuality;
    Integer practicalWorkEthics;
    Integer attendance;
    Integer workplacePerformance;
    Integer logbookQuality;         // nullable
    Integer academicReport;         // nullable
    Integer presentation;           // nullable
    Integer overallGrade;           // nullable
}
```

### 3.18 `vacancies` — Vacancy.java
```java
@Entity @Table(name = "vacancies")
public class Vacancy {
    Long id;
    String title;
    String description;             // max 1000
    Long companyId;
    String location;
    String requirements;            // max 1000, nullable
    String status;                  // e.g. "OPEN"
    LocalDate deadline;
    LocalDate createdAt;
}
```

### 3.19 `audit_logs` — AuditLog.java
```java
@Entity @Table(name = "audit_logs")
public class AuditLog {
    Long id;
    LocalDateTime timestamp;
    String username;
    String role;
    String action;                  // e.g. "LOGIN", "CREATE", "UPDATE"
    String targetEntity;            // e.g. "User", "Company", "DayDiary"
    String details;
    String ipAddress;
}
```

### 3.20 `roles` — Role.java (dormant)
```java
@Entity @Table(name = "roles")
public class Role {
    Integer id;
    String name;
    String description;
}
```
⚠️ Dormant table (ruling R8). Seeded with 4 rows but never queried by application code. Authorities use the raw `auth.Role` enum, not this table.

---

## 4. AUTHENTICATION & AUTHORIZATION

### 4.1 Security Configuration

CSRF **disabled**, CORS **enabled** (any origin with credentials). Session-based auth (HTTP cookies).

```
Request → Spring Security Filter Chain
    ↓
[CSRF Disabled] → [CORS: *] → [URL Authorization]
    ↓
Public: /, /login, /register, /forgot-password, /api/login, /api/register, /api/forgot-password, /h2-console/**
/admin/**          → ADMIN
/university/**     → SUPERVISOR, ADMIN
/company/**        → ADMIN, SUPERVISOR, COMPANY
/student/**        → STUDENT, SUPERVISOR, ADMIN
Everything else    → AUTHENTICATED
```

### 4.2 Login Flow

**React SPA (primary):**
```
1. POST /api/login (form-urlencoded: username, password, role)
2. AuthApiController validates credentials via AuthenticationManager
3. Validates selected role matches actual role in DB
4. Returns JSON: { username, role, companyId, universityId, redirect }
5. React AuthContext stores user, navigates to role home
```

**Role → Home URL:**
| Role | Home |
|------|------|
| STUDENT | `/student/dashboard` |
| SUPERVISOR | `/university/dashboard` |
| COMPANY | `/company/dashboard` |
| ADMIN | `/admin/dashboard` |

### 4.3 Password Encoding

BCrypt via `PasswordEncoder` bean. `DataSeeder` uses `passwordEncoder.encode()`. Students get `must_change_password = TRUE`.

---

## 5. DATA FLOW — KEY REQUEST JOURNEYS

### 5.1 Student Creates a Diary Entry (REST API)

```
POST /api/diaries (JSON body: date, dailyActivities, etc.)
  → DayDiaryApiController.createDiary()
    → Looks up StudentProfile by studentNo (from Principal)
    → Sets diary.studentProfile = profile
    → Saves via DayDiaryRepository
  → Returns 201 with saved entry
```

### 5.2 Company Views Interns

```
GET /api/students/company/{companyId}
  → StudentController.getStudentsByCompany()
    → CompanyService.findStudentsByCompanyId(companyId)
      → Looks up Company name by ID
      → Finds StudentProfiles by organisation (contains company name)
    → Returns list of StudentProfile objects
```

### 5.3 University Supervisor Creates Student Credentials

```
POST /api/university/students/credential
  → UniversityApiController.createStudentCredential()
    → UniversityService.createStudentCredential(request, supervisorUsername)
      → Creates UserEntity(username=studentNo, password="Student@123", role=STUDENT)
      → Creates StudentProfile with new fields (studentName, studentNo, regNo, etc.)
      → Both saved in @Transactional block
    → Returns 201
```

### 5.4 Admin Manages Users

```
GET /api/admin/users → List<UserDto> (id, username, role, email, companyId, universityId)
POST /api/admin/users → Creates user with password "{username}123"
PUT /api/admin/users/{id} → Updates username/role
DELETE /api/admin/users/{id} → Deletes user
```

---

## 6. FRONTEND ARCHITECTURE

### 6.1 React SPA (`frontend1/ims/`)

A full React SPA with React Router, AuthContext, and per-role dashboards:

| Route | Component | Roles |
|-------|-----------|-------|
| `/login` | LoginPage | Public |
| `/register` | RegisterPage | Public |
| `/forgot-password` | ForgotPasswordPage | Public |
| `/student/dashboard` | StudentDashboard | STUDENT, ADMIN |
| `/university/dashboard` | UniversityDashboard | SUPERVISOR, ADMIN |
| `/company/dashboard` | CompanyDashboard | COMPANY, ADMIN |
| `/company` | CompanyPage (management) | ADMIN, SUPERVISOR |
| `/company/:id` | CompanyProfilePage | ADMIN, SUPERVISOR, COMPANY |
| `/admin/dashboard` | AdminDashboard | ADMIN |
| `/admin/users` | AdminUsersPage | ADMIN |
| `/admin/audit-logs` | AuditLogs | ADMIN |
| `/admin/universities` | UniversitiesManagement | ADMIN |
| `/admin/placements` | PlacementMatching | ADMIN |
| `/file-management` | FileManagement | All |

### 6.2 Key React Components

| Component | Purpose |
|-----------|---------|
| `AuthContext.js` | Auth state, login/logout, role-based home URL mapping |
| `api.js` | ~40 REST API functions (login, CRUD for students, diaries, companies, etc.) |
| `DashboardLayout.js` | Shared shell with sidebar, header, tabs |
| `StudentEditModal.js` | 4-step wizard: Personal → Academic → Placement → Review |
| `CompanyEditModal.js` | Company form with size dropdown |
| `DiaryReviewModal.jsx` | Supervisor feedback on diary entries |
| `InternshipProgress.jsx` | Visual progress tracker (4 milestones) |

### 6.3 API Client (`src/services/api.js`)

All requests use `credentials: 'include'` for session cookies. API base: `http://localhost:8082`.

---

## 7. ENDPOINT INVENTORY

### 7.1 REST API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | Public | Health check |
| GET | `/api/me` | Auth | Current user (username, role, companyId, universityId) |
| GET | `/api/roles` | Public | All role enum names |
| POST | `/api/login` | Public | Login |
| POST | `/api/register` | Public | Register |
| POST | `/api/forgot-password` | Public | Reset password |
| **Students** | | | |
| GET | `/api/students` | ADMIN, SUPERVISOR, COMPANY | All students |
| GET | `/api/students/me` | STUDENT, ADMIN | Own profile |
| PUT | `/api/students/me` | STUDENT, ADMIN | Update own profile |
| GET | `/api/students/me/progress` | STUDENT, ADMIN | Progress data |
| GET | `/api/students/{id}` | ADMIN, SUPERVISOR, COMPANY, STUDENT | Student by ID |
| GET | `/api/students/company/{companyId}` | ADMIN, SUPERVISOR, COMPANY | Students by company |
| GET | `/api/students/search?q=` | ADMIN, SUPERVISOR, COMPANY | Search by name |
| PUT | `/api/students/{id}` | ADMIN, SUPERVISOR, COMPANY | Update student |
| DELETE | `/api/students/{id}` | ADMIN, SUPERVISOR, COMPANY | Delete student + diaries |
| GET | `/api/students/export/csv` | ADMIN, SUPERVISOR, COMPANY | CSV export |
| **Diaries** | | | |
| GET | `/api/diaries` | ADMIN, SUPERVISOR | All entries |
| GET | `/api/diaries/student/{studentNo}` | ADMIN, SUPERVISOR, STUDENT | By student |
| GET | `/api/diaries/{id}` | ADMIN, SUPERVISOR, STUDENT | By ID |
| POST | `/api/diaries` | STUDENT, ADMIN | Create |
| PUT | `/api/diaries/{id}` | STUDENT, ADMIN, SUPERVISOR | Update |
| POST | `/api/diaries/{id}/feedback` | ADMIN, SUPERVISOR | Supervisor feedback |
| DELETE | `/api/diaries/{id}` | ADMIN, SUPERVISOR, STUDENT | Delete |
| GET | `/api/diaries/export/csv` | ADMIN, SUPERVISOR | CSV export |
| **Companies** | | | |
| GET | `/api/companies` | Auth | All companies |
| GET | `/api/companies/{id}` | Auth | By ID |
| POST | `/api/companies` | Auth | Create |
| PUT | `/api/companies/{id}` | Auth | Update |
| DELETE | `/api/companies/{id}` | Auth | Delete |
| GET | `/api/companies/export/csv` | Auth | CSV export |
| **Universities** | | | |
| GET | `/api/universities` | ADMIN | All universities |
| POST | `/api/universities` | ADMIN | Create |
| PUT | `/api/universities/{id}` | ADMIN | Update |
| DELETE | `/api/universities/{id}` | ADMIN | Delete |
| POST | `/api/university/students/credential` | SUPERVISOR, ADMIN | Create student account |
| **Placements** | | | |
| GET | `/api/placements` | Auth | All placements |
| POST | `/api/placements` | Auth | Create |
| PUT | `/api/placements/{id}` | Auth | Update |
| DELETE | `/api/placements/{id}` | Auth | Delete |
| **Evaluations** | | | |
| GET | `/api/evaluations/student/{studentId}` | Auth | By student |
| POST | `/api/evaluations` | Auth | Create |
| PUT | `/api/evaluations/{id}` | Auth | Update |
| DELETE | `/api/evaluations/{id}` | Auth | Delete |
| **Vacancies** | | | |
| GET | `/api/vacancies` | Auth | All vacancies |
| GET | `/api/vacancies/{id}` | Auth | By ID |
| POST | `/api/vacancies` | ADMIN, SUPERVISOR, COMPANY | Create |
| PUT | `/api/vacancies/{id}` | ADMIN, SUPERVISOR, COMPANY | Update |
| DELETE | `/api/vacancies/{id}` | ADMIN, SUPERVISOR, COMPANY | Delete |
| **Users (Admin)** | | | |
| GET | `/api/admin/users` | ADMIN | All users |
| POST | `/api/admin/users` | ADMIN | Create |
| PUT | `/api/admin/users/{id}` | ADMIN | Update |
| DELETE | `/api/admin/users/{id}` | ADMIN | Delete |

---

## 8. DATA SEEDING (14 CommandLineRunners)

All seeders are idempotent (`count() == 0` guard). Execution order matters for FK dependencies.

| Order | Seeder | Records | Key Data |
|-------|--------|---------|----------|
| 1 | `CountryDataSeeder` | 196 | All world countries (AF → ZW) |
| 2 | `UniversityDataSeeder` | 50 | All Ugandan universities (MAK, KYU, NU, etc.) |
| 3 | `AcademicUnitDataSeeder` | 26 | Nkumba: 8 schools; Makerere: 9 colleges + 5 schools + 4 departments |
| 4 | `CourseDataSeeder` | 64 | 62 Nkumba + 2 Makerere courses |
| 5 | `UnitCourseDataSeeder` | 79 | Junction links between units and courses |
| 6 | `StaffDataSeeder` | 2 | 1 academic supervisor (Nkumba) + 1 field supervisor |
| 7 | `CompanyDataSeeder` | 10 | 2 companies + 6 departments + 2 supervisors |
| 8 | `DataSeeder` | 6 | 3 students + supervisor + company + admin users |
| 9 | `StudentProfileDataSeeder` | 3 | Kasagga Fred, Alex Johnson, Sarah Owen |
| 10 | `DayDiaryDataSeeder` | 2 | Diary entries for Kasagga Fred |
| 11 | `PlacementDataSeeder` | 3 | One active placement per student |
| 12 | `EvaluationDataSeeder` | 2 | Mid-term evaluations for Alex and Sarah |
| 13 | `VacancyDataSeeder` | 3 | 2 Airtel + 1 MTN job openings |
| 14 | `AuditLogDataSeeder` | 5 | Sample login/create audit events |

---

## 9. CONFIGURATION & PROFILES

### 9.1 `application.properties` (base)
- `server.port=8082`
- `spring.profiles.active=dev`
- MySQL defaults (overridable via env vars)

### 9.2 `application-dev.properties` (active)
- H2 in-memory `jdbc:h2:mem:testdb`
- `ddl-auto=create-drop` (fresh schema every boot)
- H2 console at `/h2-console`

### 9.3 `application-mysql.properties`
- MySQL `jdbc:mysql://localhost:3306/internshipManagementSystem_db`
- `ddl-auto=update` (preserves data, adds missing columns)

---

## 10. KEY DESIGN PATTERNS

1. **Controller → Service → Repository** layered architecture
2. **Constructor injection** everywhere (no `@Autowired` on fields)
3. **Role-based access control** at 3 levels: method (`@PreAuthorize`), URL (`SecurityConfig`), view (React `ProtectedRoute`)
4. **Data seeding via ordered `CommandLineRunner`** beans with `count() == 0` guards
5. **Students login with `student_no`** as the username — the `users.username` column stores the student number
6. **Company → Student link** is via `student_profiles.organisation` (text match on company name), not a FK
7. **University hierarchy** uses a self-referencing `academic_units` tree supporting arbitrary nesting depth

---

## 11. BUILD STATUS

| Component | Status | Command |
|-----------|--------|---------|
| Backend | ✅ BUILD SUCCESS | `cd backend && ./mvnw compile` |
| Frontend | ✅ BUILD SUCCESS | `cd frontend1/ims && CI=false npx react-scripts build` |
