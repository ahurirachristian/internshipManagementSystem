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
- **MySQL** (production database)
- **Maven** (with wrapper)

### Features
- Spring MVC web application
- Spring Security 6 with role-based access control
- Thymeleaf templates (login, dashboard, admin, student, supervisor)
- Role-based access control (STUDENT, SUPERVISOR, ADMIN)
- REST API (`/api/me`)
- Access control tests

### Demo Users
- `student` / `student123`
- `supervisor` / `supervisor123`
- `admin` / `admin123`

### How to Run

```bash
cd backend
./mvnw spring-boot:run
```

Or package and run the JAR:

```bash
cd backend
./mvnw clean package
java -jar target/demo-0.0.1-SNAPSHOT.jar
```

Then open [http://localhost:8080](http://localhost:8080).

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
- **MySQL** (create database `internshipManagementSystem_db` before running)

---

## Contributing

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
