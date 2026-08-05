<<<<<<< HEAD
# Internship Management System

A Spring Boot application for managing internships, reorganized into `backend/` and `frontend/` folders.

---

## Repository Structure

```
internshipManagementSystem/
â”œâ”€â”€ backend/          â”‚  Working backend (Spring Boot demo reference implementation)
â”œâ”€â”€ frontend/         â”‚  Reserved for frontend (currently empty)
â”œâ”€â”€ README.md
â””â”€â”€ .history/         â”‚  Git history backups
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
=======
# internshipManagementSystem
>>>>>>> 1170dc09a1fd6d981c294ae91cd7607cba403cb5
