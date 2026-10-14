# Database Rules — sql.js Operations & Architecture

## Architecture: sql.js WASM → sync wrapper

```
sql.js (WASM) → initDatabase() [async, one-time]
  ↓ creates in-memory DB + loads from disk
  ↓ wraps with Statement class
  ↓
getDb() [sync, after init] → returns proxy object
  ├── .prepare(sql) → Statement
  ├── .exec(sql) → void (DDL/DML)
  ├── .pragma(str) → { value } | void
  ├── .transaction(fn) → wrapped fn
  ├── .run(sql, params) → { changes, lastInsertRowid }
  ├── .close() → saveNow() + close
  └── .exportDatabase() → Uint8Array
```

## Statement Wrapper API

```javascript
// Located at server/src/db/index.js
new Statement(sqlDb, sql)  // Create prepared statement
  .get(params)   // → single row object or undefined
  .all(params)   // → array of row objects ([] if no results)
  .run(params)   // → { changes: number, lastInsertRowid: number }
                 //   AUTO-triggers scheduleSave()
```

### Parameter Normalization (normalizeParams)
- `null` / `undefined` → `[]` (empty array)
- `Array` → pass through `[val1, val2]`
- `Object` (named params) → pass through `{ $name: 'foo' }`
- Other → wrap as single-element `[val]`

### Error Handling
All methods catch errors and re-throw with SQL context:
```
${e.message}\n  SQL: ${this._sql}
```

## Convenience Functions

```javascript
import { getOne, getAll, run, transaction } from '../db/index.js'

getOne(sql, params)  // → getDb().prepare(sql).get(params)
getAll(sql, params)  // → getDb().prepare(sql).all(params)
run(sql, params)     // → getDb().prepare(sql).run(params)
transaction(fn)      // → getDb().transaction(fn)(getDb())
```

## Pragma Configuration (auto-applied by initDatabase)

```sql
PRAGMA journal_mode = WAL      -- Write-Ahead Logging
PRAGMA foreign_keys = ON       -- Enable foreign keys
PRAGMA synchronous = NORMAL    -- Balanced safety/performance
PRAGMA busy_timeout = 5000     -- Lock wait 5 seconds
```

## Debounced Persistence

```
Write → Statement.run() → scheduleSave()
  → clearTimeout(saveTimer)
  → saveTimer = setTimeout(saveNow, 200)
    → 200ms no writes → saveNow() → exportDatabase() → writeFileSync()
```

Key functions:
- `saveNow()` — immediate persist (called on close)
- `scheduleSave()` — debounced trigger (called on every write)
- `isMemory` flag — `:memory:` mode skips all persistence

## Transaction Patterns

### Pattern 1: transaction() utility
```javascript
import { transaction } from '../db/index.js'

transaction((db) => {
  db.prepare('INSERT INTO users (...) VALUES (...)').run([...])
  db.prepare('INSERT INTO user_roles (...) VALUES (...)').run([...])
  // Any failure → full rollback
})
```

### Pattern 2: db.transaction() method
```javascript
const db = getDb()
const transferFunds = db.transaction((db, fromId, toId, amount) => {
  db.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').run(amount, fromId)
  db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').run(amount, toId)
})
transferFunds(fromId, toId, amount) // Auto BEGIN/COMMIT/ROLLBACK
```

## Database Tables (10 + migrations)

- users — user accounts
- roles — role definitions
- permissions — permission codes
- user_roles — user-role mapping
- role_permissions — role-permission mapping
- menus — navigation menu items
- dictionaries — data dictionary entries
- projects — project records
- services — service records
- refresh_tokens — JWT refresh token tracking
- operation_logs — audit log
- _migrations — migration tracking

## Seed Account

| Username | Password | Role | Permissions |
|----------|----------|------|-------------|
| admin | admin123 | admin | All (40+) |

## Database File

- Path: `data/app.db`
- Format: SQLite binary
- Auto-created on first `initDatabase()` if missing
- Auto-migrated via `migrate.js`
- Auto-seeded via `seed.js`
- Reset: `npm run db:reset` (deletes `data/app.db`)

## DO NOT

- Use sql.js native API directly (no `db.prepare().step()`)
- Use string concatenation in SQL
- Use `DELETE` for data (use `status = 'disabled'`)
- Use `.run()` without params when user input is involved
- Forget to call `initDatabase()` before any DB operation
- Use `:memory:` in production
