# Internship Management System

A Spring Boot application for managing internships, reorganized into `backend/` and `frontend/` folders.

> **Onboarding a new developer?** Start with [`ONBOARDING.md`](ONBOARDING.md) (up-to-date setup, architecture, API inventory, known gotchas) and [`CODEBASE_ANALYSIS.md`](CODEBASE_ANALYSIS.md). Note: parts of this README are outdated — the backend runs on port **8082** (not 8081), and the primary UI is the React SPA in [`frontend1/ims/`](frontend1/ims).

---

## Repository Structure

```
internshipManagementSystem/
├── backend/          ─ Working backend (Spring Boot demo reference implementation)
├── frontend/         ─ Reserved for frontend (currently empty)
├── README.md
└── .history/         ─ Git history backups
```

---

## Backend (`backend/`)

The `backend/` folder contains the complete reference implementation from the original `demo/` project.

### Stack
- **Spring Boot 3.x** (Spring Web, Spring Security, Spring Data JPA, Thymeleaf)
- **Java 17**
- **MySQL** (via WampServer) or **H2** (in-memory, for local development)
- **Maven** (with wrapper)

### Features
- Spring MVC web application
- Spring Security 6 with role-based access control
- Thymeleaf templates (login, dashboard, admin, student, supervisor)
- Role-based access control (STUDENT, SUPERVISOR, ADMIN)
- REST API (`/api/me`)
- Access control tests

### Demo Users

Demo accounts are created automatically when the backend runs (idempotent).

| Username | Password | Role |
|----------|----------|------|
| `student` | `student123` | STUDENT |
| `supervisor` | `supervisor123` | SUPERVISOR |
| `university` | `university123` | SUPERVISOR (University portal) |
| `airtel` | `company123` | COMPANY |
| `admin` | `admin123` | ADMIN |

| Role       | Home URL                | Access                                  |
|------------|-------------------------|-----------------------------------------|
| STUDENT    | `/student/dashboard`    | Personal dashboard, day-diary           |
| SUPERVISOR | `/university/dashboard` | University portal, student registration |
| COMPANY    | `/company/dashboard`    | Company profile + intern management     |
| ADMIN      | `/admin/dashboard`      | Admin console                           |

### Admin Dashboard
The admin dashboard at `/admin/dashboard` provides full user management:
- **Add User** — create new users with username, role, and auto-generated password (`{username}123`)
- **Edit User** — update username and role inline
- **Delete User** — remove users with confirmation

### OAuth2 Social Login
Login with Google, LinkedIn, or X/Twitter is available on the login page. OAuth2 client credentials need to be configured in `application-dev.properties` or `application-mysql.properties` (see API Reference).

### Database Configuration
- **Default profile**: `dev` (H2 in-memory — zero setup; schema recreated each boot)
- **MySQL profile**: run with `-Dspring-boot.run.profiles=mysql` (connects to `internshipManagementSystem_db`; `localhost:3306`, user `root`, password `kasaggafred001` by default — override via `MYSQL_PASSWORD=`; XAMPP/MariaDB uses an empty password)
- **Switch profiles**: use the `-Dspring-boot.run.profiles=` flag, or edit `spring.profiles.active` in `application.properties`
- See also `backend/DATABASE_CONNECTION_GUIDE.md` for the alternate connection setup proposed on `developer`

### How to Run

> **Java is not on PATH on the dev machine** — always invoke Maven via the included
> `backend/start.sh` helper (it sets `JAVA_HOME` automatically), or run
> `export JAVA_HOME=$HOME/.local/jdks/jdk-17.0.13+11` first. A bare `./mvnw` will fail
> with "JAVA_HOME is not defined correctly". The React SPA is the primary UI:
> `cd frontend1/ims && npm start`, then open http://localhost:3000/login.

**Dev profile (H2 in-memory database, zero setup — default):**

```bash
cd backend
./start.sh spring-boot:run
```

**With MySQL (persistent data):**

Ensure MySQL is running, then:

```bash
cd backend
./start.sh spring-boot:run -Dspring-boot.run.profiles=mysql
```

The app connects to `internshipmanagementsystem_db` on `localhost:3306` as `root`. The
password default is `kasaggafred001`; override with `MYSQL_PASSWORD=<pw>` (e.g.
`MYSQL_PASSWORD= ` for XAMPP's passwordless root).

Or package and run the JAR:

```bash
cd backend
./start.sh clean package
$JAVA_HOME/bin/java -jar target/demo-0.0.1-SNAPSHOT.jar
```

Note: `java` is also not on PATH, so run the JAR with `$JAVA_HOME/bin/java`.

Then open [http://localhost:8082](http://localhost:8082).

### Running Tests

```bash
cd backend
./start.sh test
```

---

## Frontend (`frontend/`)

Reserved for frontend assets and code. Currently empty.

---

## Prerequisites

- **Java 17+**
- **Maven 3.6+** (or use the included Maven wrapper `./mvnw`)
- **WampServer** with MySQL running (for production database access)

---

## Contributing

### Setup for New Contributors

1. Clone the repository
2. Ensure **Java 17+** and **Maven 3.6+** are installed
3. Ensure WampServer is running if using MySQL
4. Run the app:
   ```bash
   cd backend
   ./start.sh spring-boot:run
   ```
5. Open [http://localhost:8082](http://localhost:8082)

If you want to use the H2 in-memory database instead, run with the `dev` profile:
```bash
cd backend
./start.sh spring-boot:run
```

All team members must follow this branching workflow:

1. **Start from `developer`** — always pull the latest changes from the `developer` branch before starting work:
   ```bash
   git checkout developer
   git pull origin developer
   ```

2. **Create your own branch** — create a feature branch from `developer` with a descriptive name:
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Push your branch** — push your branch to the remote repository:
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Open a Pull Request** — open a PR from your feature branch to the `developer` branch. Include a clear description of the changes.

5. **Pull before pushing** — before pushing any new commits to your branch, always pull the latest from `developer` first to avoid conflicts:
   ```bash
   git checkout developer
   git pull origin developer
   git checkout feature/your-feature-name
   git rebase developer
   git push origin feature/your-feature-name --force
   ```

### Branch Strategy

| Branch | Purpose |
|--------|---------|
| `developer` | Integration branch — all PRs target this branch |
| `feature/*` | Individual feature branches — created from `developer` |
| `main` | Production-ready releases |