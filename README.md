# Internship Management System

A Spring Boot application for managing internships. The repository currently contains a scaffold project (`internship-management/`) alongside a complete reference implementation (`demo/`).

---

## Repository Structure

```
internship-management/          ← Repository root
├── internship-management/      │  Main project (scaffold — see status below)
├── demo/                       │  Reference implementation (working, run this)
└── .history/                   │  Git history backups
```

---

## Project Status

### Main Project — `internship-management/`

| Component | Status | Notes |
|-----------|--------|-------|
| Spring Boot scaffold | Implemented | Boot 4.1.0, Java 21 |
| Maven dependencies (JPA, MySQL, Lombok) | Implemented | `pom.xml` exists |
| `Country` entity | Partial | **Compilation bug**: duplicate `package` declaration (lines 1 & 3) |
| Controllers (REST/MVC) | **Not implemented** | Missing `spring-boot-starter-web` (has SOAP `web-services` instead) |
| Security / Auth | **Not implemented** | No `spring-boot-starter-security`, no `UserEntity`, no `Role`, no `SecurityConfig` |
| Repositories | **Not implemented** | No JPA repository interfaces |
| Services | **Not implemented** | — |
| Validation | **Not implemented** | No `spring-boot-starter-validation` |
| Frontend (Thymeleaf/templates) | **Not implemented** | No templates, no static assets |
| Database config | Partial | Hardcoded MySQL with placeholder password; `ddl-auto=validate` requires pre-existing schema |
| Tests | Partial | Only an empty `contextLoads()` test |

**Known bugs preventing the main project from building/running:**
1. `src/main/java/com/example/internship_management/entity/Country.java` — duplicate `package` declaration.
2. `pom.xml` uses `spring-boot-starter-web-services` (SOAP) instead of `spring-boot-starter-web` (REST/MVC).
3. `application.properties` has `YOUR_MYSQL_PASSWORD` placeholder and `ddl-auto=validate`, so the app will fail to start without a MySQL server and matching schema.

### Reference Implementation — `demo/`

| Component | Status |
|-----------|--------|
| Spring Boot scaffold | Implemented |
| Web (Spring MVC) | Implemented |
| Security (Spring Security 6) | Implemented |
| Thymeleaf templates (login, dashboard, admin, student, supervisor) | Implemented |
| Role-based access control (STUDENT, SUPERVISOR, ADMIN) | Implemented |
| H2 in-memory database | Implemented |
| Data seeder (default users) | Implemented |
| REST API (`/api/me`) | Implemented |
| Access control tests | Implemented |

Demo users: `student/student123`, `supervisor/supervisor123`, `admin/admin123`

---

## Prerequisites

- **Java 17+** (demo uses Java 17; main project targets Java 21)
- **Maven 3.6+** (or use the included Maven wrapper `./mvnw`)
- **MySQL** (only needed for the main project; demo uses H2 in-memory — no external DB required)

---

## How to Run

### Option A — Run the Demo (Reference Implementation)

The demo is self-contained with an in-memory H2 database and requires no external setup.

```bash
cd demo
./mvnw spring-boot:run
```

Or package and run the JAR:

```bash
cd demo
./mvnw clean package
java -jar target/demo-0.0.1-SNAPSHOT.jar
```

Then open [http://localhost:8080](http://localhost:8080) — log in with:
- `student` / `student123`
- `supervisor` / `supervisor123`
- `admin` / `admin123`

H2 Console: [http://localhost:8080/h2-console](http://localhost:8080/h2-console) (JDBC URL: `jdbc:h2:mem:demo`)

### Option B — Run the Main Project

The main project is not yet in a runnable state. To run it you would first need to:

1. **Fix `Country.java`** — remove the duplicate `package` declaration.
2. **Fix `pom.xml`** — replace `spring-boot-starter-web-services` with `spring-boot-starter-web`.
3. **Add Spring Security dependency** to `pom.xml`.
4. **Configure MySQL** — create database `internshipManagementSystem_db`, update the password in `application.properties`, and set `ddl-auto=update` (or create the schema manually).
5. **Start a MySQL server** on `localhost:3306`.

```bash
cd internship-management
./mvnw spring-boot:run
```

> If you only need a working system now, use **Option A** with the `demo/` project.

---

## Running Tests

```bash
# Demo project
cd demo
./mvnw test

# Main project (currently only an empty context-load test; will fail due to the compilation bug)
cd internship-management
./mvnw test
```

---

## What Needs to Be Built (Main Project Roadmap)

1. **Fix compilation** — clean up `Country.java`.
2. **Switch to Spring Web** — replace the SOAP web-services starter with `spring-boot-starter-web`.
3. **Add Spring Security** — `spring-boot-starter-security`, `UserEntity`, `Role`, `UserRepository`, `UserDetailsService`, `SecurityConfig`.
4. **Set up the database** — use H2 in-memory for development (fallback to MySQL for production).
5. **Build entities** — expand beyond `Country` to cover `Internship`, `Student`, `Supervisor`, `Application`, etc. (model after the demo auth entities).
6. **Create repositories** — JPA interfaces for each entity.
7. **Create services** — business logic layer.
8. **Create controllers** — REST APIs and/or MVC controllers.
9. **Add validation** — `spring-boot-starter-validation` with DTOs.
10. **Build the frontend** — Thymeleaf templates and static resources.
11. **Add tests** — unit and integration tests mirroring `demo/src/test/.../AuthAccessTest.java`.
