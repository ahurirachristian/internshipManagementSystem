# Internship Management System — API Reference

Base URL: `http://localhost:8081`

---

## Authentication

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/login` | Login page | Public |
| `GET` | `/register` | Registration page | Public |
| `POST` | `/register` | Create new account | Public |
| `POST` | `/login` | Form-based login (Spring Security) | Public |
| `POST` | `/logout` | Logout | Authenticated |
| `GET` | `/oauth2/authorization/google` | Google OAuth2 login | Public |
| `GET` | `/oauth2/authorization/linkedin` | LinkedIn OAuth2 login | Public |
| `GET` | `/oauth2/authorization/twitter` | X/Twitter OAuth2 login | Public |

### Register Request (`POST /register`)

**Content-Type:** `application/x-www-form-urlencoded`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | string | Yes | Desired username |
| `password` | string | Yes | Account password |
| `role` | string | Yes | One of: `STUDENT`, `SUPERVISOR`, `ADMIN` |

**Response:** Redirects to `/login` on success, or back to `/register` with error on failure.

### Login Request (`POST /login`)

**Content-Type:** `application/x-www-form-urlencoded`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | string | Yes | Username |
| `password` | string | Yes | Password |

**Response:** Redirects to `/dashboard` on success, or back to `/login?error` on failure.

---

## API Endpoints

| Method | Endpoint | Description | Access | Returns |
|--------|----------|-------------|--------|---------|
| `GET` | `/` | Health check | Public | Plain text |
| `GET` | `/api/me` | Current authenticated user info | Authenticated | JSON `{ "username": "..." }` |
| `GET` | `/student/universities/search?q={query}` | Search universities by name prefix | STUDENT, SUPERVISOR, ADMIN | JSON `UniversityDto[]` |

### University Search Response (`GET /student/universities/search`)

```json
[
  { "id": 1, "name": "Harvard University" },
  { "id": 2, "name": "MIT" }
]
```

---

## Dashboard Pages

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/dashboard` | Main dashboard with role-based links | Authenticated |
| `GET` | `/student/dashboard` | Student dashboard | STUDENT, ADMIN |
| `GET` | `/supervisor/dashboard` | Supervisor dashboard | SUPERVISOR, ADMIN |
| `GET` | `/admin/dashboard` | Admin dashboard with user management | ADMIN |

---

## Student Profile

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/student/profile/edit` | Edit profile page | STUDENT, ADMIN |
| `POST` | `/student/profile/edit` | Save profile | STUDENT, ADMIN |

### Save Profile Request (`POST /student/profile/edit`)

**Content-Type:** `application/x-www-form-urlencoded`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `firstName` | string | Yes | |
| `lastName` | string | Yes | |
| `email` | string | Yes | |
| `phoneNumber` | string | Yes | |
| `studentNumber` | string | Yes | |
| `registrationNumber` | string | Yes | |
| `degreeProgram` | string | Yes | |
| `yearOfStudy` | integer | Yes | 1–5 |
| `phoneNumber` | string | Yes | |
| `internshipCompany` | string | Yes | |
| `universitySupervisor` | string | Yes | University name (from dropdown) |
| `industrialSupervisorId` | string | Yes | |
| `companyId` | string | Yes | |
| `pictureUrl` | string | No | URL to profile picture |

**Response:** Redirects to `/student/dashboard` on success.

---

## Admin — User Management

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/admin/dashboard` | Admin dashboard with user list | ADMIN |
| `POST` | `/admin/users` | Add a new user | ADMIN |
| `POST` | `/admin/users/update` | Update existing user | ADMIN |
| `POST` | `/admin/users/delete` | Delete a user | ADMIN |

### Add User Request (`POST /admin/users`)

**Content-Type:** `application/x-www-form-urlencoded`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | string | Yes | Username (must be unique) |
| `role` | string | Yes | One of: `STUDENT`, `SUPERVISOR`, `ADMIN` |

**Default password:** `{username}123`

**Response:** Redirects to `/admin/dashboard`.

### Update User Request (`POST /admin/users/update`)

**Content-Type:** `application/x-www-form-urlencoded`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | long | Yes | User ID |
| `username` | string | Yes | New username |
| `role` | string | Yes | New role |

**Response:** Redirects to `/admin/dashboard`.

### Delete User Request (`POST /admin/users/delete`)

**Content-Type:** `application/x-www-form-urlencoded`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | long | Yes | User ID to delete |

**Response:** Redirects to `/admin/dashboard`.

---

## Access Control

| URL Pattern | Allowed Roles |
|-------------|---------------|
| `/`, `/login`, `/register`, `/css/**`, `/js/**` | Public |
| `/admin/**` | `ADMIN` |
| `/supervisor/**` | `SUPERVISOR`, `ADMIN` |
| `/student/**` | `STUDENT`, `SUPERVISOR`, `ADMIN` |
| All other | Authenticated (any role) |

---

## OAuth2 Configuration

OAuth2 client registrations are configured in `application-dev.properties` and `application-mysql.properties`. Replace the placeholder values with real credentials from the provider consoles:

| Provider | Registration ID | Scope |
|----------|----------------|-------|
| Google | `google` | `openid`, `email`, `profile` |
| LinkedIn | `linkedin` | `openid`, `profile`, `email` |
| X/Twitter | `twitter` | (configured in provider console) |

---

## Demo Accounts

| Username | Password | Role |
|----------|----------|------|
| `student` | `student123` | STUDENT |
| `supervisor` | `supervisor123` | SUPERVISOR |
| `admin` | `admin123` | ADMIN |