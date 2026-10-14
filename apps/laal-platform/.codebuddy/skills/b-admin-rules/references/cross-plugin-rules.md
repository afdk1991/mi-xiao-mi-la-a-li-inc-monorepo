# Cross-Plugin Collaboration Rules

> **MCP Protocol Reference**: All cross-plugin communication follows the MCP communication protocol defined in `mcp-coordinator/references/mcp-protocol.md`. Plugins must register via `mcp-coordinator/references/plugin-contract.md` before interacting with this project. See `mcp-coordinator/references/agent-registry.md` for the complete agent registry.

## Interaction Matrix

| External Plugin | Behavior on Trigger | B Admin Interaction | Output Constraint |
|----------------|---------------------|---------------------|-------------------|
| finance / financial-analysis | Analyze financials, build models | READ-ONLY: read project/service data for analysis. DO NOT modify B Admin code | Independent files (`.xlsx`, reports) outside `server/` and `b-admin/` |
| trading-agent / ai-hedge-fund | Investment analysis, stock evaluation | READ-ONLY: read service company data as input for analysis | Independent report files. `.html` visualizations at project root |
| data-analysis | Data analysis, visualization | READ: read SQLite via `getDb().prepare().all()`. DO NOT modify DB structure | Output `.html` dashboard or `.xlsx` files |
| product-management | PRD, roadmap, competitive analysis | WRITE ALLOWED: write to `projects` and `services` tables via API or direct DB. MUST follow module schema contracts | Data fused with B Admin project data |
| design-to-code | Design to code conversion | WRITE ALLOWED: modify `b-admin/` HTML/CSS/JS. MUST follow frontend conventions (IIFE + BA.* + hash routing + data-action) | Code output to `b-admin/` directory |
| investment-banking / equity-research / private-equity | IB analysis, research reports | READ-ONLY: read project/service data | Independent files |
| wealth-management | Wealth management | DO NOT modify B Admin code | Independent files |
| spglobal / lseg | Market data | DO NOT modify B Admin code | Analysis reports |
| cloudbase | Cloud deployment | READ config, assist deployment. DO NOT change Express + sql.js architecture | Follow cloudbase plugin specs |
| remotion-video-generator | Video generation | DO NOT modify B Admin code | Video output files |

## Data Bridge Rules

When external plugins need B Admin data, use in this priority:

1. **Backend API (if running)**: `GET /api/v1/projects`, `GET /api/v1/services`, etc.
2. **Database direct read (offline)**: Via sql.js reading `data/app.db`:
   ```javascript
   import initSqlJs from 'sql.js'
   import { readFileSync } from 'fs'
   const SQL = await initSqlJs()
   const buffer = readFileSync('data/app.db')
   const db = new SQL.Database(buffer)
   // READ-ONLY operations only
   ```
3. **JSON export**: From backup or mock data

**Critical principle**: External plugins do READ-ONLY analysis on B Admin data, NO structural modifications. Writing requires going through REST API, not direct DB.

## Plugin Conflict Avoidance

When multiple agents work simultaneously:

1. **File isolation**: External plugin output goes to independent files (`.html`, `.xlsx`), NOT to `server/` or `b-admin/`
2. **Data isolation**: External plugins use DB copy or API for reads, don't lock the DB file
3. **State coordination**: `dev-status.json` only tracks B Admin development phases, external plugin tasks are NOT recorded there
