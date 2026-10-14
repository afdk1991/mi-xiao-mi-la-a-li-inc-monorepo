# API Contracts — B Admin Full Endpoint Reference

## Module Overview

| Module | Route File | Controller | Service(s) | Validator | Permission Prefix |
|--------|-----------|------------|------------|-----------|-------------------|
| auth | auth.routes.js | auth.controller.js | auth.service.js | auth.validator.js | - (open) |
| users | user.routes.js | user.controller.js | user.service.js, rbac.service.js | user.validator.js | user |
| roles | role.routes.js | role.controller.js | role.service.js, rbac.service.js | role.validator.js | role |
| permissions | permission.routes.js | role.controller.js | rbac.service.js | - | permission |
| menus | menu.routes.js | menu.controller.js | menu.service.js | - | menu |
| projects | project.routes.js | project.controller.js | project.service.js | project.validator.js | project |
| services | service.routes.js | service.controller.js | service.service.js | service.validator.js | service |
| workbench | workbench.routes.js | workbench.controller.js | workbench.service.js | - | - (login required) |
| dictionaries | dictionary.routes.js | dictionary.controller.js | dictionary.service.js | - | dict |
| logs | log.routes.js | log.controller.js | log.service.js | - | log |

## auth — Authentication

| Method | Path | Auth | Validator | Description |
|--------|------|------|-----------|-------------|
| POST | `/api/v1/auth/login` | None (loginLimiter: 10/min) | loginSchema | Login, returns tokens + user |
| POST | `/api/v1/auth/refresh` | None | refreshSchema | Refresh access token |
| POST | `/api/v1/auth/logout` | authMiddleware | - | Logout, revoke refresh token |
| GET | `/api/v1/auth/profile` | authMiddleware | - | Current user info |
| PUT | `/api/v1/auth/password` | authMiddleware | changePasswordSchema | Change password |

**loginSchema**: `username: string(1-50)`, `password: string(1-100)`, `remember: boolean?`
**changePasswordSchema**: `oldPassword: string(1+)`, `newPassword: string(6-100)`

## users — User Management

| Method | Path | Permission | Validator | Description |
|--------|------|------------|-----------|-------------|
| GET | `/api/v1/users` | user:read | - | Paginated list (filter: keyword, status) |
| GET | `/api/v1/users/:id` | user:read | - | User detail with roles |
| POST | `/api/v1/users` | user:create | createUserSchema | Create user |
| PUT | `/api/v1/users/:id` | user:update | updateUserSchema | Update user |
| DELETE | `/api/v1/users/:id` | user:delete | - | Soft delete user |
| PUT | `/api/v1/users/:id/roles` | user:assign | updateUserRolesSchema | Update user roles |

**createUserSchema**:
```
username: string(2-50, required)
password: string(6-100, required)
display_name: string(0-100, default: '')
email: string(email, or '')
phone: string(regex /^1[3-9]\d{9}$/, or '')
avatar: string(default: '')
status: enum('active','disabled','locked', default:'active')
role_ids: string[] (default: [])
```

**updateUserSchema** (all optional): display_name, email, phone, avatar, status, role_ids
**updateUserRolesSchema**: `role_ids: string[].min(1)` (non-empty array)

## roles — Role Management

| Method | Path | Permission | Validator | Description |
|--------|------|------------|-----------|-------------|
| GET | `/api/v1/roles` | role:read | - | Role list with permissions |
| GET | `/api/v1/roles/:id` | role:read | - | Role detail with permissions |
| POST | `/api/v1/roles` | role:create | createRoleSchema | Create role |
| PUT | `/api/v1/roles/:id` | role:update | updateRoleSchema | Update role |
| DELETE | `/api/v1/roles/:id` | role:delete | - | Delete role (soft delete) |

**createRoleSchema**: `code: string(1-50)`, `name: string(1-50)`, `description: string(0-200)?`, `permission_ids: string[]?`
**Edge case**: Built-in role (admin) cannot be deleted or have code modified

## permissions — Permission Management

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/v1/permissions` | permission:read | Permission list (grouped: user/role/permission/menu/project/service/dict/log) |
| GET | `/api/v1/permissions/tree` | permission:read | Permission tree structure |

**Note**: Uses `role.controller.js` (getPermissions, getPermissionTree)

## menus — Menu Management

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/v1/menus/tree` | Login required (NO extra permission) | Current user's menu tree |
| GET | `/api/v1/menus` | menu:read | All menus list |
| GET | `/api/v1/menus/:id` | menu:read | Menu detail |
| POST | `/api/v1/menus` | menu:create | Create menu |
| PUT | `/api/v1/menus/:id` | menu:update | Update menu |
| DELETE | `/api/v1/menus/:id` | menu:delete | Delete menu |

**Critical**: `/tree` does NOT require `menu:read` — all logged-in users can access it for navigation.

## projects — Project Management

| Method | Path | Permission | Validator | Description |
|--------|------|------------|-----------|-------------|
| GET | `/api/v1/projects` | project:read | - | Paginated project list |
| GET | `/api/v1/projects/:id` | project:read | - | Project detail |
| POST | `/api/v1/projects` | project:create | createProjectSchema | Create project |
| PUT | `/api/v1/projects/:id` | project:update | updateProjectSchema | Update project |
| DELETE | `/api/v1/projects/:id` | project:delete | - | Soft delete |
| POST | `/api/v1/projects/batch-delete` | project:delete | - | Batch soft delete |

**createProjectSchema**:
```
project_name: string(1-100, required)
project_code: string(0-50, default: '')
category: string(0-50, default: '')
status: enum('active','archived','pending', default:'active')
owner: string(0-50, default: '')
description: string(0-500, default: '')
priority: enum('low','medium','high','urgent', default:'medium')
start_date: string(default: '')
end_date: string(default: '')
```

**Sorting**: `sortField` ∈ {project_name, project_code, created_at, status, priority}; `sortDir` ∈ {asc, desc}

## services — Service Management

| Method | Path | Permission | Validator | Description |
|--------|------|------------|-----------|-------------|
| GET | `/api/v1/services` | service:read | - | Service list |
| GET | `/api/v1/services/:id` | service:read | - | Service detail |
| POST | `/api/v1/services` | service:create | createServiceSchema | Create service |
| PUT | `/api/v1/services/:id` | service:update | updateServiceSchema | Update service |
| DELETE | `/api/v1/services/:id` | service:delete | - | Soft delete |

**createServiceSchema**:
```
title: string(1-100, required)
description: string(0-500, default: '')
category: string(0-50, default: '')
icon: string(0-50, default: '')
sort_order: int(default: 0)
```

## workbench — Dashboard

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/v1/workbench/overview` | Login required | Cards: projects count, services, users, todos |
| GET | `/api/v1/workbench/sales-trend` | Login required | Last 12 months/weeks trend |
| GET | `/api/v1/workbench/channel-distribution` | Login required | Channel distribution (pie chart) |
| GET | `/api/v1/workbench/todos` | Login required | Todo items |
| GET | `/api/v1/workbench/activities` | Login required | Recent activity log |

## dictionaries — Data Dictionary

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/v1/dictionaries/:type` | Login required | Get dict items by type |
| GET | `/api/v1/dictionaries` | dict:read | Dict list |
| POST | `/api/v1/dictionaries` | dict:create | Create dict |
| PUT | `/api/v1/dictionaries/:id` | dict:update | Update dict |
| DELETE | `/api/v1/dictionaries/:id` | dict:delete | Delete dict |

## logs — Operation Logs

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/v1/logs` | log:read | Paginated log list |

## Error Code Reference

| Code | HTTP | Meaning | Trigger |
|------|------|---------|---------|
| 0 | 200/201 | Success | Normal response |
| 40101 | 401 | Not authenticated | No/invalid token |
| 40102 | 401 | Token expired | Access token expired |
| 40301 | 403 | Forbidden | Missing permission |
| 40001 | 400 | Bad request | Zod validation failed |
| 40401 | 404 | Not found | Resource ID doesn't exist |
| 42901 | 429 | Rate limited | Exceeded throttle limit |
| 50001 | 500 | Internal error | Unexpected exception |

## Permission Code Reference

| Group | Codes |
|-------|-------|
| User | `user:read`, `user:create`, `user:update`, `user:delete`, `user:assign` |
| Role | `role:read`, `role:create`, `role:update`, `role:delete` |
| Permission | `permission:read` |
| Menu | `menu:read`, `menu:create`, `menu:update`, `menu:delete` |
| Project | `project:read`, `project:create`, `project:update`, `project:delete` |
| Service | `service:read`, `service:create`, `service:update`, `service:delete` |
| Dictionary | `dict:read`, `dict:create`, `dict:update`, `dict:delete` |
| Log | `log:read` |

## Response Format Tools

Located at `server/src/utils/response.js`:

```javascript
// Success
res.json(success(data, message?, code?))
// → { code: 0, message: 'ok', data: ... }

// Error (via next())
next(fail(message, code?, httpStatus?, data?))

// Pagination normalization
pagination(req.query)  // → { page, pageSize, offset }, page≥1, pageSize 1~100
```

## Zod Validation Middleware

Located at `server/src/middleware/validate.js`:

```javascript
validateRequest(schema, source = 'body')
// source: 'body' | 'query' | 'params'
// Success: req[source] replaced with Zod-transformed data
// Failure: next(fail('field: message', 40001, 400, issues))
```

## JWT Token Structure

| Field | Access Token | Refresh Token |
|-------|-------------|---------------|
| sub | userId | userId |
| username | username | username |
| roles | [roleCodes] | - |
| type | 'access' | 'refresh' |
| jti | - | UUID (for revocation) |
| exp | 2h | 7d |

```javascript
import { signAccessToken, signRefreshToken, verifyToken } from '../utils/jwt.js'
// signAccessToken({ sub, username, roles }) → JWT (2h)
// signRefreshToken({ sub, username, jti }) → JWT (7d)
// verifyToken(token) → payload | null
```
