# Internship Management System

A Spring Boot application for managing internships, reorganized into `backend/` and `frontend/` folders.

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
- **Default profile**: `mysql` (connects to `internshipmanagementsystem_db` on WampServer)
- **MySQL connection**: `localhost:3306`, user `root`, empty password
- **Dev profile**: `dev` (uses H2 in-memory database)
- **Switch profiles**: update `spring.profiles.active` in `application.properties`

### How to Run

**With MySQL (default):**

Ensure WampServer MySQL is running, then:

```bash
cd backend
./mvnw spring-boot:run
```

The app connects to `internshipmanagementsystem_db` on `localhost:3306`.

**Dev profile (H2 in-memory database):**

```bash
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

Or package and run the JAR:

```bash
cd backend
./mvnw clean package
java -jar target/demo-0.0.1-SNAPSHOT.jar
```

Then open [http://localhost:8082](http://localhost:8082).

### Running Tests

```bash
cd backend
./mvnw test
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
   ./mvnw spring-boot:run
   ```
5. Open [http://localhost:8082](http://localhost:8082)

If you want to use the H2 in-memory database instead, run with the `dev` profile:
```bash
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
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