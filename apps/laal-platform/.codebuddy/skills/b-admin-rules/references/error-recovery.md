# Error Recovery Handbook

## Scenario 1: Corrupted Database File

**Symptoms**: Startup error `file is not a database` or SQLite errors.

**Diagnosis**:
```bash
ls -la data/app.db  # Check file size (0 or abnormally small = corrupted)

# Try reading with sql.js
node -e "import('sql.js').then(S => S.default().then(s => {
  const db = new s.Database(require('fs').readFileSync('data/app.db'))
  console.log('OK')
})).catch(e => console.error('CORRUPT:', e.message))"
```

**Recovery**:
```bash
cp data/app.db data/app.db.corrupted.$(date +%Y%m%d%H%M%S)  # Backup
rm data/app.db                                               # Remove
npm run dev                                                  # Rebuild + migrate + seed
```

**Verification**: Login with admin/admin123, confirm workbench data displays.

---

## Scenario 2: Token Expiry → Infinite 401 Loop

**Symptoms**: After page refresh all API calls return 401, page loops to login.

**Diagnosis** (browser console):
```javascript
console.log(sessionStorage.getItem('access_token'))
console.log(sessionStorage.getItem('refresh_token'))

// Manual test refresh
fetch('/api/v1/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken: sessionStorage.getItem('refresh_token') })
}).then(r => r.json()).then(console.log)
```

**Recovery**:
1. DevTools → Application → Storage → Session Storage
2. Clear `access_token`, `refresh_token`, `current_user`
3. Refresh page, re-login
4. If backend refresh_tokens table is corrupted: `npm run db:reset`

---

## Scenario 3: API Unavailable (Port 3000)

**Symptoms**: Frontend returns `ERR_CONNECTION_REFUSED` or 502.

**Diagnosis**:
```bash
netstat -ano | findstr :3000    # Windows
lsof -i :3000                    # macOS/Linux
tasklist | findstr node          # Windows: check node process
ps aux | grep "node.*server"     # macOS/Linux
curl http://localhost:3000/api/v1/health
```

**Recovery**:
```bash
npx kill-port 3000    # Kill process on port 3000
npm run dev           # Restart
```

**Verification**: `curl http://localhost:3000/api/v1/health` should return `{ code: 0, data: { uptime, timestamp } }`.

---

## Scenario 4: npm install Fails (Windows, no Python)

**Symptoms**: `npm install` shows `gyp ERR!` or `python not found`.

**Diagnosis**:
```bash
npm install --dry-run 2>&1 | grep -i "error\|gyp\|python"
```

**Recovery**:
```bash
rm -rf node_modules package-lock.json    # Clean
npm install --ignore-scripts             # Skip native builds
npm install sql.js@1.10.3 --ignore-scripts  # Manual WASM install

# Verify sql.js
node -e "import('sql.js').then(m => m.default().then(s => console.log('OK:', Object.keys(s))))"
```

---

## Scenario 5: Port Conflict (8080 or 3000)

**Symptoms**: `EADDRINUSE: address already in use :::3000` or `:::8080`.

**Diagnosis**:
```bash
# Windows
netstat -ano | findstr ":3000"
netstat -ano | findstr ":8080"
taskkill /PID <PID> /F    # Kill by PID

# macOS/Linux
lsof -i :3000
kill -9 <PID>
```

**Recovery**:
```bash
npx kill-port 3000 8080
npm run dev
```

---

## Scenario 6: Frontend Fallback (mock mode)

When backend API is completely unavailable, use mock mode:
```
http://localhost:8080/#workbench?mock=1
```

This bypasses all backend API calls and uses hardcoded data from `BA.api.mock`.

---

## Error Propagation Path

```
Controller:
  → Param validation fail: next(fail('field: message', 40001, 400))
  → Resource not found:    next(fail('Resource not found', 40401, 404))
  → Service exception:     try/catch → next(fail(e.message, 50001, 500))

Service:
  → getOne() returns undefined → throw Error or return null
  → run() throws Error (with SQL context)
  → Business rule violation → throw new Error('description')

errorHandler (middleware):
  → Unified catch of next(err)
  → Returns { code: err.code || 50001, message: err.message, data: err.data || null }
  → HTTP status: err.status || 500

errorLogger (middleware):
  → console.error full stack trace server-side
```

## Quick Commands

```bash
npm run dev        # Start dev (frontend 8080 + backend 3000)
npm run server     # Backend only
npm run client     # Frontend only
npm test           # Run all tests
npm test -- --testPathPattern=auth  # Specific tests
npm run db:reset   # Delete app.db, rebuild on restart

# Check database tables
node -e "import('./server/src/db/index.js').then(db => db.initDatabase().then(() => {
  const d = db.getDb()
  console.log(d.prepare(\"SELECT name FROM sqlite_master WHERE type='table' ORDER BY name\").all().map(r => r.name))
}))"
```
