# Database Connection Configuration Guide

## Overview

This guide explains how to establish a connection between the **Internship Management System** backend and the MySQL database `internshipManagementSystem_db`.

---

## 1. Database Technology

| Component | Details |
|-----------|---------|
| Database | MySQL 8.0+ |
| Database Name | `internshipManagementSystem_db` |
| Driver | `com.mysql.cj.jdbc.Driver` (MySQL Connector/J 9.x) |
| ORM | Spring Data JPA / Hibernate 6.x |
| Port | `3306` (default) |

---

## 2. Driver Requirements

Add the MySQL Connector/J dependency in `pom.xml`:

```xml
<dependency>
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-j</artifactId>
    <scope>runtime</scope>
</dependency>
```

> **Note:** The `mysql-connector-j` artifact is already present in the project's `pom.xml`.

---

## 3. Connection Strings

### 3.1 JDBC URL Format

```
jdbc:mysql://<HOST>:<PORT>/internshipManagementSystem_db?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true
```

### 3.2 Connection Parameters Explained

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `useSSL` | `false` | Disables SSL for local development. Set to `true` in production. |
| `serverTimezone` | `UTC` | Explicitly sets the timezone to avoid timezone mismatch warnings. |
| `allowPublicKeyRetrieval` | `true` | Allows public key retrieval for caching_sha2_password authentication. |

---

## 4. Configuration Files

### 4.1 `application.properties` (Root Config)

The project uses profile-based configuration with `.env` variable substitution.

```properties
spring.config.import=optional:dotenv:.env

# Use the 'mysql' profile to connect to MySQL
spring.profiles.active=mysql

# Database connection properties
spring.datasource.url=${MYSQL_URL:jdbc:mysql://localhost:3306/internshipManagementSystem_db?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true}
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver
spring.datasource.username=${MYSQL_USER:root}
spring.datasource.password=${MYSQL_PASSWORD:}

# JPA / Hibernate
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQLDialect

# Disable H2 console when using MySQL
spring.h2.console.enabled=false
```

### 4.2 `.env` File

Create a `.env` file in the `backend/` directory:

```env
MYSQL_URL=jdbc:mysql://localhost:3306/internshipManagementSystem_db?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true
MYSQL_USER=root
MYSQL_PASSWORD=your_password_here
```

> **Security:** The `.env` file is listed in `.gitignore` and should never be committed to version control.

### 4.3 `application-mysql.properties` (MySQL Profile)

The project already includes a MySQL profile. Activate it by setting:

```properties
spring.profiles.active=mysql
```

Or by running with the profile flag:

```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=mysql
```

---

## 5. Prerequisites

### 5.1 MySQL Server

Ensure MySQL Server is running locally on port `3306`:

```bash
# Verify MySQL is running
mysql -u root -p -e "SELECT 1;"
```

### 5.2 Create the Database

```sql
CREATE DATABASE IF NOT EXISTS internshipManagementSystem_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
```

> **Important:** The database name is case-sensitive on Linux/macOS. Use `internshipManagementSystem_db` exactly.

---

## 6. Verification Query

After starting the application, verify the connection with:

```sql
-- Check database connectivity and list tables
SELECT 
    TABLE_NAME,
    TABLE_ROWS,
    ENGINE
FROM 
    information_schema.TABLES
WHERE 
    TABLE_SCHEMA = 'internshipManagementSystem_db'
ORDER BY 
    TABLE_NAME;
```

Expected tables (auto-created by Hibernate `ddl-auto=update`):

| Table | Description |
|-------|-------------|
| `users` | User accounts |
| `student_profiles` | Student profiles |
| `day_diaries` | Daily diary entries |
| `company` | Companies offering placements |
| `placements` | Student placements |
| `vacancies` | Job vacancies |
| `evaluations` | Placement evaluations |
| `universities` | Universities |
| `countries` | Countries |
| `audit_logs` | Audit log entries |

---

## 7. Application Startup Verification

Run the application with the MySQL profile:

```bash
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=mysql
```

Check the console output for:

```
2026-08-19 13:05:11.123  INFO 12345 --- [           main] com.zaxxer.hikari.HikariDataSource       : HikariPool-1 - Starting...
2026-08-19 13:05:11.456  INFO 12345 --- [           main] com.zaxxer.hikari.HikariDataSource       : HikariPool-1 - Start completed.
2026-08-19 13:05:12.789  INFO 12345 --- [           main] o.hibernate.engine.jdbc.env.internal.JdbcEnvironmentInitiator  : HHH000400: Using dialect: org.hibernate.dialect.MySQLDialect
```

If connection fails, check:

1. MySQL server is running on `localhost:3306`
2. Database `internshipManagementSystem_db` exists
3. User credentials in `.env` are correct
4. No firewall blocking port `3306`

---

## 8. Connection String Variations

### Remote MySQL Server

```properties
spring.datasource.url=jdbc:mysql://192.168.1.100:3306/internshipManagementSystem_db?useSSL=true&serverTimezone=UTC&allowPublicKeyRetrieval=true
```

### Docker MySQL Container

```properties
spring.datasource.url=jdbc:mysql://mysql-container:3306/internshipManagementSystem_db?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true
```

### Custom Port

```properties
spring.datasource.url=jdbc:mysql://localhost:3307/internshipManagementSystem_db?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true
```

---

## 9. Project File Locations

| File | Path |
|------|------|
| Application Properties | `backend/src/main/resources/application.properties` |
| MySQL Profile Properties | `backend/src/main/resources/application-mysql.properties` |
| Dev Profile (H2) | `backend/src/main/resources/application-dev.properties` |
| Environment Variables | `backend/.env` |
| Maven POM | `backend/pom.xml` |
| Backend Entry Point | `backend/src/main/java/com/example/demo/DemoApplication.java` |
