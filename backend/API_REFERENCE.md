# Internship Management System — API Reference

Base URL: `http://localhost:8082`

> P0 (2026-09-30): the React SPA is the only UI. Server-rendered Thymeleaf pages,
> form login and the Google/LinkedIn/X OAuth2 endpoints have been **removed**
> (plan R12/R13). The browser app is served from :3000 and talks to this JSON API.

---

## Authentication (JSON API, session cookie)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `POST` | `/api/login` | Login (`username`, `password` form fields); server resolves the role | Public |
| `POST` | `/api/register` | Register (JSON body) | Public |
| `POST` | `/api/forgot-password` | Password reset (replaced by email token flow in P2) | Public |
| `POST` | `/logout` | Logout | Authenticated |
| `GET` | `/api/me` | Current user info incl. role, superAdmin flag | Authenticated |
| `PUT` | `/api/me` | Update own email | Authenticated |
| `GET` | `/api/roles` | List role names | Public |

---

## Notifications (P0)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/api/notifications?unreadOnly=&page=` | Own notifications, newest first (page size 20) | Authenticated |
| `GET` | `/api/notifications/unread-count` | `{ "count": n }` | Authenticated |
| `POST` | `/api/notifications/{id}/read` | Mark one read (404 for other users' ids) | Owner |
| `POST` | `/api/notifications/read-all` | Mark all read | Authenticated |

Notifications are created **only by server-side flows** — there is no endpoint to
create or choose recipients from the client (anti-spoofing, plan L15).

---

## API Endpoints

| Method | Endpoint | Description | Access | Returns |
|--------|----------|-------------|--------|---------|
| `GET` | `/` | Health check | Public | Plain text |
| `GET` | `/student/universities/search?q={query}` | Search universities by name prefix | STUDENT, SUPERVISOR, ADMIN | JSON `UniversityDto[]` |

### University Search Response (`GET /student/universities/search`)

```json
[
  { "id": 1, "name": "Harvard University" },
  { "id": 2, "name": "MIT" }
]
```

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

## Demo Accounts (seeded by `DataSeeder` on an empty database)

| Username | Password | Role | Notes |
|----------|----------|------|-------|
| `2400101003` | `Student@123` | STUDENT | must change password at first login |
| `university` | `university123` | SUPERVISOR | Nkumba University (id 19) |
| `kyu` | `kyu123` | SUPERVISOR | Kyambogo University (id 2) |
| `airtel` | `company123` | COMPANY | Airtel Uganda (id 1) |
| `admin` | `admin123` | ADMIN | **super admin** (grants/revokes roles) |

---

## CORS

Allowed origins come from `APP_ALLOWED_ORIGINS` (comma-separated, default
`http://localhost:3000`). Credentials are allowed, so never widen this to `*`
(plan L17).