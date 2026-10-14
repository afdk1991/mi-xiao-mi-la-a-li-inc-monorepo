# Architecture Decision Records (ADR)

## ADR-001: sql.js instead of better-sqlite3

**Background**: Windows dev environment lacks Python to compile better-sqlite3 native addon.

**Decision**: Use sql.js (SQLite compiled to WASM, pure JS, zero compilation dependencies).

**Impact**:
- sql.js native API is async (`db.prepare()` → `stmt.step()` + `stmt.getAsObject()`)
- Created Statement wrapper class mimicking better-sqlite3's sync `get()`/`all()`/`run()` API
- DB init became async: `await initDatabase()` → then `getDb()` is sync

**Do NOT**: Use sql.js native API directly. Always use Statement wrapper or `getOne()`/`getAll()`/`run()`.

## ADR-002: IIFE + window.BA instead of ES Modules for Frontend

**Background**: Frontend is Vanilla JS with no build tool (Vite `server.proxy` proxies to backend). Browsers don't support bare specifier `import`.

**Decision**: IIFE pattern, all modules mounted to `window.BA`, loaded via `<script>` tag order.

**Module load order** (controlled by `scripts/dev.js`):
```
BA.config → BA.utils → BA.store → BA.i18n → BA.monitor → BA.errorBoundary
                                                          ↓
BA.request → BA.api → BA.api.auth/users/... ← BA.auth
                                                          ↓
BA.form → BA.validate → Components → Icon → Charts → BA.pages.*
```

**Do NOT**: Use `export`/`import` in frontend files.

## ADR-003: sessionStorage for Token Storage

**Background**: Need to store JWT tokens for auth state.

**Decision**: Use `sessionStorage` (not localStorage).

**Reasons**:
- Auto-clear on tab close, no persistent token residue
- Independent JWT sessions per tab
- localStorage has higher XSS exposure risk

**Impact**: Tab close = re-login required. Page refresh = OK (sessionStorage persists for same origin).

## ADR-004: 200ms Debounced Persistence

**Background**: sql.js runs in memory. Each write serializes entire DB to `Uint8Array` and writes to disk.

**Decision**: 200ms debounce (`scheduleSave()`) instead of immediate save after every write.

**Reasons**:
- Reduces disk I/O in batch write scenarios
- 200ms balances UX and data safety (worst case: 200ms data loss)
- `saveNow()` available for forced immediate save (called on DB close)

## ADR-005: JWT Dual Token (access 2h + refresh 7d)

**Background**: Balance security (short expiry) with UX (less frequent login).

**Decision**:
- Access Token: 2h expiry, carries `type: 'access'`
- Refresh Token: 7d expiry, carries `type: 'refresh'` + `jti` (unique ID)
- Refresh Token stored in `refresh_tokens` table, can be actively revoked

**Impact**:
- Frontend `BA.request` intercepts 401 → auto silent refresh → if fail, redirect to login
- Backend auth middleware only accepts `type === 'access'` tokens
