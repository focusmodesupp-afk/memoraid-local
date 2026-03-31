# MemorAId API

Base URL: `/api` (user routes) and `/api/admin` (admin routes).

## Error Response Format

All error responses follow:

```json
{
  "error": "Human-readable error message"
}
```

Additional fields (e.g. `hint`, `details`) may appear depending on the endpoint.
In development, 500 errors may include `stack` for debugging.

---

## Headers

### X-Active-Family

For users in multiple families, pass the active family ID to scope requests:

```
X-Active-Family: <family-uuid>
```

Example:
```
GET /api/tasks
X-Active-Family: 550e8400-e29b-41d4-a716-446655440000
```

---

## Main Endpoints

### Auth (User)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login (returns session cookie) |
| POST | `/api/auth/logout` | Logout (clears session cookie) |
| GET | `/api/auth/me` | Current user (requires session cookie) |
| POST | `/api/auth/forgot-password` | Request password reset email |
| POST | `/api/auth/reset-password` | Reset password with token |
| GET | `/api/auth/google` | Start Google OAuth |
| GET | `/api/auth/google/callback` | Google OAuth callback |

### Auth (Admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/auth/login` | Admin login (returns `mr_admin_session` cookie) |
| POST | `/api/admin/auth/logout` | Admin logout |
| GET | `/api/admin/auth/me` | Current admin (requires admin session) |

### Families

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/family` | Primary family (legacy) |
| GET | `/api/families/me` | User's families and members |
| PATCH | `/api/families/me/members/:userId` | Update member role/permissions |
| GET | `/api/families/me/invites` | List invites |
| POST | `/api/families/me/invites` | Create invite |
| POST | `/api/families/me/invites/send` | Send invite email |

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List tasks (scoped by active family) |
| POST | `/api/tasks` | Create task |
| PATCH | `/api/tasks/:id` | Update task |

### Patients

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/patients/primary` | Primary patient |
| GET | `/api/patients/:id` | Patient by ID |
| POST | `/api/patients` | Create patient |
| PATCH | `/api/patients/:id` | Update patient |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Basic health check |
| GET | `/api/health/db` | Database connectivity check |
| GET | `/api/admin/health` | Admin health check |

---

## Session Cookies

- **User**: `mr_session` (HttpOnly, Path=/, SameSite=Lax)
- **Admin**: `mr_admin_session` (HttpOnly, Path=/, SameSite=Lax)

---

## Swagger / OpenAPI

A Swagger/OpenAPI spec may be added in the future for interactive documentation.
