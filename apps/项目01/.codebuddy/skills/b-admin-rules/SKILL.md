---
name: b-admin-rules
description: This skill should be used whenever any agent works on the B Admin fullstack project (f:/项目02). It contains all mandatory project conventions, API contracts, database rules, cross-plugin collaboration protocols, error recovery procedures, and development lifecycle gates. Any code generation, modification, or analysis within this project MUST load this skill first. For global multi-agent coordination rules, see the sibling skill 'mcp-coordinator'.
---

# B Admin 全栈项目协调规则

## Relationship to MCP Coordinator

This skill defines **project-specific mandatory rules** (code style, API contracts, database operations). For **global multi-agent coordination rules** (communication protocol, agent registry, memory bus, plugin integration contracts, state machine), load the `mcp-coordinator` skill first, then this skill. The two skills are complementary:

- `mcp-coordinator` → HOW agents work together (meta-layer)
- `b-admin-rules` → WHAT rules agents must follow within this project (domain-layer)

## Purpose

This skill serves as the single source of truth for all project-specific rules in the B Admin fullstack project. Every agent operating in this workspace must load and follow these rules. The skill replaces the need to repeatedly check `plugin-coordination.md`, `project-context.md`, and `dev-status.json` by consolidating all mandatory conventions into a structured format.

## When to Use

Load this skill when:
- Generating or modifying any code under `server/` or `b-admin/`
- Adding new API endpoints, database tables, or frontend pages
- Debugging errors or recovering from project issues
- Any external plugin (finance, trading-agent, data-analysis, design-to-code, etc.) accesses this project
- Reviewing code or checking compliance with project standards
- Starting a new development phase

## Global Mandatory Conventions (ALL Agents)

### Code Style [IMMUTABLE]

| Rule | Detail |
|------|--------|
| Module system | ESM (`import/export`), `"type": "module"` in root `package.json` |
| Semicolons | NONE — never use semicolons |
| Quotes | SINGLE quotes only |
| Indentation | 2 spaces |
| Frontend modules | IIFE pattern, mounted to `window.BA.*` global namespace |
| Backend layers | `routes → controllers → services → db` — never skip layers |
| File naming | kebab-case: `auth.routes.js`, `user.service.js` |
| Security | NO hardcoded secrets, NO string-concatenated SQL, NO `eval()` |

### Quick Reference Examples

```javascript
// CORRECT: ESM + no semicolons + single quotes + 2 spaces
import { getDb } from '../db/index.js'
const users = await getDb().prepare('SELECT * FROM users WHERE status = ?').all('active')

// WRONG: CommonJS + semicolons + double quotes + 4 spaces
const { getDb } = require("../db/index.js");
const users = await getDb().prepare("SELECT * FROM users WHERE status = ?").all("active");
```

```javascript
// CORRECT: IIFE + window.BA
;(function (BA) {
  BA.pages = BA.pages || {}
  BA.pages.myPage = function () { /* ... */ }
})((window.BA = window.BA || {}))

// WRONG: ES Module in frontend
export function myPage() { /* ... */ }
```

### Database Rules [IMMUTABLE]

- Must call `await initDatabase()` before `getDb()`
- Use `?` placeholder for all SQL parameters — never string concatenation
- Write operations: use Statement's `run()` method (auto-triggers 200ms debounced save)
- Soft delete: set `status = 'disabled'` instead of DELETE
- Transactions: use `transaction(fn)` utility or `db.transaction()` method
- Tests: use `:memory:` database via `initDatabase(':memory:')`

```javascript
// CORRECT: parameterized query
const user = getDb().prepare('SELECT * FROM users WHERE username = ? AND status = ?').get(username, 'active')

// WRONG: string concatenation
const user = getDb().prepare(`SELECT * FROM users WHERE username = '${username}'`).get()
```

### API Standards [IMMUTABLE]

- Prefix: `/api/v1/`
- Success response: `{ code: 0, message: 'ok', data: ... }`
- Pagination response: `{ code: 0, message: 'ok', data: { list: [...], total: N, page: N, pageSize: N } }`
- Error: `next(fail(message, code, httpStatus))` via errorHandler
- Auth header: `Authorization: Bearer <accessToken>`

### Frontend Conventions [IMMUTABLE]

- Routing: hash-based (`#workbench`, `#list`, `#card`, `#form`, `#login`)
- Events: `data-action` attribute + delegation, NO inline `onclick`
- Auth: sessionStorage stores `access_token`, `refresh_token`, `current_user`
- Token refresh: 401 auto-refresh with refresh token, fail → redirect to `#login`
- API calls: use `BA.api.*` namespace, NOT direct `fetch`

### Testing Rules [IMMUTABLE]

- Framework: Jest + Supertest
- Database: `:memory:` isolation per test
- Init chain: `initDatabase(':memory:')` → `migrate()` → `seed()` → `createApp()`
- Token helper: `loginAs(request, username, password)` returns `{ accessToken, refreshToken }`
- Files: `server/__tests__/`, one `it()` per assertion

## How to Use This Skill

### 1. Loading Flow

When activated, always follow this priority:
1. Read this SKILL.md first (core mandatory rules)
2. Read `references/api-contracts.md` when adding or modifying API endpoints
3. Read `references/database-rules.md` when touching database operations
4. Read `references/error-recovery.md` when encountering errors
5. Read `references/cross-plugin-rules.md` when other plugins interact with the project
6. Read `references/adr.md` to understand architectural decisions
7. Read `references/state-sync.md` when updating dev-status.json or project-context.md
8. Read `references/checklist.md` for development lifecycle gate checks

### 2. Before Any Code Change

Before generating or modifying code, verify:
- Module type (ESM vs IIFE) is correct for the target layer
- SQL uses parameterized queries
- API responses follow the standard format
- Frontend code uses `data-action` delegation
- No secrets are hardcoded
- File naming follows kebab-case

### 3. State Synchronization

After making changes:
- If API endpoints change → update `project-context.md`
- If new DB tables added → update `project-context.md`
- If phase completes → update `dev-status.json` (read first, then write)
- If new decisions made → append to ADR in `references/adr.md`
- Do NOT update these for: style fixes, refactoring without interface changes, bug fixes

### 4. Cross-Plugin Protocol

When external plugins (finance, trading-agent, data-analysis, etc.) interact with this project:
- Finance/analysis plugins: READ-ONLY from databases, output independent files
- Data-analysis: can read SQLite data, cannot modify DB structure
- Product-management: CAN write to `projects`/`services` tables via API
- Design-to-code: CAN modify `b-admin/` HTML/CSS/JS
- All others: READ-ONLY, output independent files (`.html`, `.xlsx`, `.mp4`)
- See `references/cross-plugin-rules.md` for complete table
