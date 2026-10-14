# State Synchronization Protocols

## Frontend-Backend Token Sync

```
sessionStorage                  SQLite DB
  access_token  ←─ login ──    users table
  refresh_token ←─ login ──    refresh_tokens table
  current_user  ←─ /profile ── user_roles table
                                roles table

  BA.auth.refreshToken() ──→   POST /auth/refresh
    → success: update token     → new access token
    → fail: clear + #login      → revoke old refresh
```

**Sync guarantees**:
- Login: backend returns `{ accessToken, refreshToken, user }`, frontend stores in sessionStorage
- Refresh: new access + new refresh (old revoked), frontend updates sessionStorage
- Logout: backend `DELETE FROM refresh_tokens`, frontend `sessionStorage.clear()`
- Password change: no token cleanup needed, but can optionally revoke all refresh tokens

## dev-status.json Protocol (Multi-Agent Coordination)

### Write Rules
1. Read latest version before modifying (prevent overwriting other agents' updates)
2. Update `lastUpdated` to current date immediately after any change
3. Only modify the phase relevant to current task
4. Never touch phases being worked on by other agents

### Status Semantics
- `done` → phase complete, irreversible (unless user requests refactor)
- `done` → `pending` is FORBIDDEN (indicates rework needed → add new phase instead)
- `in_progress` → one phase at a time

### Phase Tracking Format
```json
{
  "phases": {
    "X_title": {
      "status": "done" | "in_progress" | "pending",
      "note": "One-sentence summary of work done"
    }
  },
  "pending": ["item 1", "item 2"]
}
```

### Conflict Handling
If `lastUpdated` is newer than local cache when reading → another agent has updated → base operations on latest version.

## project-context.md Update Rules

**Must update when**:
- API endpoints added/removed/renamed
- New database tables created
- New architectural decisions made
- Seed account credentials changed

**Do NOT update for**:
- Implementation detail changes only
- Style/formatting changes
- Bug fixes not affecting interface contracts
- Refactoring without interface changes

## When to Update dev-status.json

| Event | Action |
|-------|--------|
| All tasks in a phase complete | Set phase status to `done`, update `lastUpdated` |
| Starting work on a phase | Set phase status to `in_progress` |
| New pending item discovered | Append to `pending` array |
| Pending item resolved | Remove from `pending` array |
