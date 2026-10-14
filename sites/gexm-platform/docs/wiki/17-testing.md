# 17. 测试体系

> 本章描述 `gexm-platform` 的完整测试体系，包括测试栈、配置文件、测试约束、测试目录结构、测试命令、CI 集成、视觉回归、Trae CN 资源管控规则等。所有路径以 `file:///` 协议给出。

---

## 17.1 测试栈总览

| 层级 | 工具 | 版本 | 配置文件 |
| --- | --- | --- | --- |
| 单元测试（后端） | Jest | 30.4.2 | [packages/server/jest.config.js](file:///f:/gexm/packages/server/jest.config.js) |
| 单元测试（PC） | Vitest | 4.1.10 | [packages/pc/vitest.config.ts](file:///f:/gexm/packages/pc/vitest.config.ts) |
| 单元测试（SDK） | Jest | 30.4.2 | [packages/sdk/jest.config.js](file:///f:/gexm/packages/sdk/jest.config.js) |
| 集成测试 | Jest + supertest | 7.2.2 | [packages/server/jest.config.js](file:///f:/gexm/packages/server/jest.config.js) |
| PostgreSQL 集成 | Jest + Docker | — | [packages/server/jest.config.postgres.js](file:///f:/gexm/packages/server/jest.config.postgres.js) |
| 异步 PG 集成 | Jest | — | [packages/server/jest.config.postgres.async.js](file:///f:/gexm/packages/server/jest.config.postgres.async.js) |
| E2E | Playwright | 1.61.1 | [playwright.config.ts](file:///f:/gexm/playwright.config.ts) |
| 视觉回归 | Playwright + 自研脚本 | — | [preview/scripts/visual-compare.js](file:///f:/gexm/preview/scripts/visual-compare.js) |

---

## 17.2 测试约束（来自项目记忆）

按 `project_memory.md` 工程约定：

### 17.2.1 串行执行

- **`maxWorkers: 1`**：所有测试套件串行执行，确保模块作用域隔离
- **原因**：共享数据库文件会导致测试套件间数据残留

### 17.2.2 内存数据库

- **`DB_PATH=:memory:`**：测试环境使用 SQLite 内存数据库
- **原因**：防止测试套件间数据污染，每个测试文件通过 `getDb()` 获取全新实例

### 17.2.3 跳过速率限制

- **`NODE_ENV=test`**：测试环境跳过速率限制
- **原因**：避免 5 次/5 分钟限制导致测试超时

### 17.2.4 Docker PostgreSQL

- **测试用 PostgreSQL 15**：用于迁移验证
- **WSL2 后端**：Docker Linux 容器必需
- **独立 Compose**：`docker-compose.test.yml`

### 17.2.5 CLI 参数陷阱

- **`testPathIgnorePatterns` CLI 参数会覆盖 `jest.config.js`**：需谨慎使用
- **建议**：在 `jest.config.js` 中配置 `testPathIgnorePatterns`，避免 CLI 传参

### 17.2.6 PostgreSQL 同步客户端陷阱

- **`PgSyncClient.syncAwait()` 使用 `deasync.loopWhile()`**：阻塞事件循环
- **Jest 异步测试环境中易引发 Promise 死锁**
- **新代码应使用 `IAsyncDbClient`**

### 17.2.7 测试套件间隔离

```typescript
// 每个测试文件使用独立数据库实例
beforeAll(async () => {
  process.env.DB_PATH = ':memory:'
  process.env.NODE_ENV = 'test'
  await closeDb()  // 清空缓存
  const db = getDb()  // 获取全新实例
  await initDatabase()
})

afterAll(async () => {
  await closeDb()
})
```

---

## 17.3 后端测试

### 17.3.1 Jest 配置

**文件**：[packages/server/jest.config.js](file:///f:/gexm/packages/server/jest.config.js)

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  maxWorkers: 1,                       // 串行执行
  testTimeout: 30000,
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '__tests__/postgres/',             // 默认跳过 PG 集成
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'clover'],
}
```

### 17.3.2 PostgreSQL 集成测试

**文件**：[packages/server/jest.config.postgres.js](file:///f:/gexm/packages/server/jest.config.postgres.js)

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  maxWorkers: 1,
  testTimeout: 60000,
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/postgres/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/postgres/setup.ts'],
}
```

### 17.3.3 测试目录结构

```
packages/server/src/__tests__/
├── postgres/                    # PostgreSQL 集成测试
│   ├── setup.ts                 # 测试环境 setup
│   ├── async-setup.ts           # 异步 PG setup
│   ├── auth.e2e.test.ts         # 认证 E2E
│   ├── db-init.test.ts          # 数据库初始化
│   ├── dualWrite.test.ts        # 双写测试
│   ├── order.e2e.test.ts        # 订单 E2E
│   ├── postgres-db.test.ts      # PG 客户端测试
│   └── product.e2e.test.ts      # 商品 E2E
└── unit/                        # 单元测试
    ├── asyncEventHandler.test.ts
    ├── cacheWarmup.test.ts
    ├── dbClient.test.ts
    ├── performance.test.ts
    ├── pgSyncClient.test.ts
    └── sqlDialect.test.ts
```

### 17.3.4 测试 setup 示例

**文件**：[packages/server/src/__tests__/postgres/setup.ts](file:///f:/gexm/packages/server/src/__tests__/postgres/setup.ts)

```typescript
import { closeDb, getDb } from '../../models'
import { initDatabase } from '../../app'

beforeAll(async () => {
  process.env.NODE_ENV = 'test'
  process.env.DB_TYPE = 'postgres'
  process.env.DB_HOST = 'localhost'
  process.env.DB_PORT = '5433'         // 测试 PG 端口
  process.env.DB_NAME = 'gexm_test'
  process.env.DB_USER = 'gexm'
  process.env.DB_PASSWORD = 'gexm_test_password'

  closeDb()
  const db = getDb()
  await initDatabase()
})

afterAll(async () => {
  closeDb()
})
```

### 17.3.5 单元测试示例

```typescript
// packages/server/src/__tests__/unit/sqlDialect.test.ts
import { translateSql, isPostgres } from '../../models/sqlDialect'

describe('sqlDialect', () => {
  describe('translateSql', () => {
    it('should convert ? placeholders to $N for PostgreSQL', () => {
      process.env.DB_TYPE = 'postgres'
      const sql = 'SELECT * FROM users WHERE id = ? AND name = ?'
      const translated = translateSql(sql)
      expect(translated).toBe('SELECT * FROM users WHERE id = $1 AND name = $2')
    })

    it('should keep ? placeholders for SQLite', () => {
      process.env.DB_TYPE = 'sqlite'
      const sql = 'SELECT * FROM users WHERE id = ?'
      const translated = translateSql(sql)
      expect(translated).toBe('SELECT * FROM users WHERE id = ?')
    })
  })
})
```

### 17.3.6 集成测试示例（supertest）

```typescript
// packages/server/src/__tests__/postgres/auth.e2e.test.ts
import request from 'supertest'
import app from '../../app'

describe('POST /api/v1/auth/login', () => {
  beforeEach(async () => {
    // 创建测试用户
    await request(app)
      .post('/api/v1/auth/register')
      .send({ username: 'testuser', password: 'Test1234!' })
  })

  it('should login successfully with valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'testuser', password: 'Test1234!' })

    expect(res.status).toBe(200)
    expect(res.body.data.accessToken).toBeDefined()
    expect(res.body.data.refreshToken).toBeDefined()
  })

  it('should fail with wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'testuser', password: 'wrong' })

    expect(res.status).toBe(401)
  })
})
```

---

## 17.4 PC 测试

### 17.4.1 Vitest 配置

**文件**：[packages/pc/vitest.config.ts](file:///f:/gexm/packages/pc/vitest.config.ts)

```typescript
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
  },
})
```

### 17.4.2 测试工具

- `@vue/test-utils` 2.4.11：Vue 组件测试
- `jsdom` 29.1.1：DOM 模拟
- `canvas` 3.2.3：Canvas API 模拟（验证码组件测试）

### 17.4.3 组件测试示例

```typescript
// packages/pc/src/components/__tests__/CaptchaCanvas.test.ts
import { mount } from '@vue/test-utils'
import CaptchaCanvas from '../CaptchaCanvas.vue'

describe('CaptchaCanvas', () => {
  it('should render canvas with 4 chars', () => {
    const wrapper = mount(CaptchaCanvas)
    expect(wrapper.vm.code).toHaveLength(4)
  })

  it('should refresh code on click', async () => {
    const wrapper = mount(CaptchaCanvas)
    const oldCode = wrapper.vm.code
    await wrapper.trigger('click')
    expect(wrapper.vm.code).not.toBe(oldCode)
  })
})
```

### 17.4.4 Pinia Store 测试

```typescript
// packages/pc/src/store/__tests__/user.test.ts
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from '../user'

describe('useUserStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('should restore from localStorage', () => {
    localStorage.setItem('token', 'xxx')
    const store = useUserStore()
    store.initFromStorage()
    expect(store.token).toBe('xxx')
  })

  it('should check permission correctly', () => {
    const store = useUserStore()
    store.permissions = ['user:read', 'order:read']
    expect(store.hasPermission('user:read')).toBe(true)
    expect(store.hasPermission('user:delete')).toBe(false)
  })
})
```

---

## 17.5 SDK 测试

**文件**：[packages/sdk/jest.config.js](file:///f:/gexm/packages/sdk/jest.config.js)

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  maxWorkers: 1,
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}
```

---

## 17.6 E2E 测试（Playwright）

### 17.6.1 配置

**文件**：[playwright.config.ts](file:///f:/gexm/playwright.config.ts)

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './preview/tests',
  timeout: 30000,
  retries: 2,
  reporter: [['html'], ['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
})
```

### 17.6.2 测试场景

| 场景 | 文件 | 覆盖 |
| --- | --- | --- |
| 登录流程 | `preview/tests/auth.spec.ts` | 登录、登出、Token 刷新 |
| 商品浏览 | `preview/tests/products.spec.ts` | 列表、详情、搜索 |
| 购物车 | `preview/tests/cart.spec.ts` | 加购、修改数量、删除 |
| 下单流程 | `preview/tests/checkout.spec.ts` | 地址、支付、订单确认 |
| 用户中心 | `preview/tests/profile.spec.ts` | 资料、订单、收藏 |
| 后台管理 | `preview/tests/admin.spec.ts` | 商品、订单、用户管理 |

### 17.6.3 运行命令

```bash
# 全部 E2E
npm run preview:ci

# 指定浏览器
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# 指定测试文件
npx playwright test auth.spec.ts

# UI 模式（交互调试）
npx playwright test --ui

# 查看报告
npx playwright show-report
```

---

## 17.7 视觉回归

### 17.7.1 视觉对比脚本

**文件**：[preview/scripts/visual-compare.js](file:///f:/gexm/preview/scripts/visual-compare.js)

```bash
# 创建基线
npm run preview:baseline

# 对比当前与基线
npm run preview:compare
```

### 17.7.2 工作原理

1. 启动 Playwright 浏览器
2. 遍历 `preview/baseline/` 中的页面配置
3. 对每个页面截图
4. 与基线图片对比（pixelmatch 算法）
5. 生成差异图和报告
6. 阈值 > 0.1% 视为不通过

### 17.7.3 配置文件

```javascript
// preview/scripts/visual-compare.js
const pages = [
  { name: 'home', url: '/', viewport: { width: 1440, height: 900 } },
  { name: 'products', url: '/products', viewport: { width: 1440, height: 900 } },
  { name: 'mobile-home', url: '/', viewport: { width: 375, height: 812 } },
  // ...
]
```

---

## 17.8 测试命令汇总

### 17.8.1 根目录命令

```bash
# 运行 PC 包测试（默认）
npm test

# 监听模式
npm run test:watch

# 覆盖率
npm run test:coverage
```

### 17.8.2 工作区命令

```bash
# PC 测试
npm --workspace @gexm/pc run test
npm --workspace @gexm/pc run test:watch
npm --workspace @gexm/pc run test:coverage

# 服务端测试
npm --workspace @gexm/server run test
npm --workspace @gexm/server run test:watch

# PostgreSQL 集成测试
npm --workspace @gexm/server run test:postgres

# SDK 测试
npm --workspace @gexm/sdk run test
npm --workspace @gexm/sdk run test:coverage
```

### 17.8.3 PostgreSQL 集成测试设置

```bash
# 启动测试 PostgreSQL（Docker）
npm --workspace @gexm/server run test:postgres:setup

# 运行测试
npm --workspace @gexm/server run test:postgres

# 停止测试 PostgreSQL
npm --workspace @gexm/server run test:postgres:teardown
```

### 17.8.4 E2E 与视觉回归

```bash
# 全平台预览
npm run preview

# 仅 PC
npm run preview:pc

# 仅 H5
npm run preview:h5

# 视觉对比
npm run preview:compare

# 创建基线
npm run preview:baseline

# CI E2E
npm run preview:ci

# 启动画廊
npm run preview:gallery
```

---

## 17.9 数据库迁移测试

### 17.9.1 迁移命令

```bash
# 运行迁移
npm --workspace @gexm/server run migrate

# 运行迁移（显式）
npm --workspace @gexm/server run migrate:run

# 验证迁移
npm --workspace @gexm/server run migrate:verify
```

### 17.9.2 迁移脚本

**文件**：[packages/server/src/commands/migrate.ts](file:///f:/gexm/packages/server/src/commands/migrate.ts)

```typescript
import { runMigrations, verifyMigrations } from '../utils/migration'

async function main() {
  const command = process.argv[2] || 'run'

  if (command === 'run') {
    const result = await runMigrations()
    console.log(`Migrations applied: ${result.applied.length}`)
  } else if (command === 'verify') {
    const result = await verifyMigrations()
    if (result.ok) {
      console.log('All migrations verified')
    } else {
      console.error('Migration verification failed:', result.missing)
      process.exit(1)
    }
  }
}

main().catch(console.error)
```

---

## 17.10 测试覆盖率

### 17.10.1 覆盖率目标

| 模块 | 目标 | 当前 |
| --- | --- | --- |
| `@gexm/server` | 80% | — |
| `@gexm/pc` | 70% | — |
| `@gexm/sdk` | 90% | — |
| `@gexm/shared` | 100% | — |

### 17.10.2 覆盖率报告

- 输出位置：`packages/<pkg>/coverage/`
- 格式：`text`、`lcov`、`clover`
- HTML 报告：`coverage/lcov-report/index.html`

### 17.10.3 CI 集成

通过 GitHub Actions / GitLab CI 上传覆盖率到 Codecov / Coveralls：

```yaml
# .github/workflows/test.yml
- name: Run tests with coverage
  run: npm run test:coverage

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./packages/server/coverage/lcov.info,./packages/pc/coverage/lcov.info
```

---

## 17.11 CI/CD 集成

### 17.11.1 GitHub Actions 示例

```yaml
name: Test

on: [push, pull_request]

jobs:
  server-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: gexm_test
          POSTGRES_USER: gexm
          POSTGRES_PASSWORD: gexm_test_password
        ports: ['5432:5432']
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm ci
      - run: npm --workspace @gexm/server run test
      - run: npm --workspace @gexm/server run test:postgres

  pc-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm ci
      - run: npm --workspace @gexm/pc run test

  e2e-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run preview:ci
```

---

## 17.12 Trae CN 资源管控规则

**文件**：[.trae/rules/task-scheduling-rules.md](file:///f:/gexm/.trae/rules/task-scheduling-rules.md)

### 17.12.1 强制规则

| 规则 | 描述 |
| --- | --- |
| 串行执行 | lint、test、build、docker build、migrate、E2E 严禁并行启动 |
| ESLint 包装 | 必须通过 `scripts/lint-guarded.js` 调用 ESLint，文件锁保证全局唯一实例 |
| 并行 Agent 处理 | 子 Agent 不允许独立调用 `npm run lint`，由主 Agent 统一调度 |
| CPU 监控 | CPU > 80% 禁止启动 build/docker；> 90% 自动停止 eslint |

### 17.12.2 ESLint 调用方式

```bash
# 推荐：通过 npm script（已内置文件锁）
npm run lint              # 检查
npm run lint:fix          # 自动修复

# 备用：直接调用包装脚本
node scripts/lint-guarded.js
node scripts/lint-guarded.js --fix

# 强制绕过锁（仅在用户明确要求"强制 lint"时使用）
npm run lint:force
```

### 17.12.3 CPU 监控

```powershell
# 后台启动 CPU 监控（DryRun 模式）
powershell -ExecutionPolicy Bypass -File f:\gexm\scripts\monitor-cpu.ps1 `
    -IntervalSeconds 30 -AlertThreshold 80 -CriticalThreshold 90 -DryRun `
    -LogPath f:\gexm\logs\cpu-monitor.jsonl

# 查询当前 CPU 占用
(Get-CimInstance Win32_Processor).LoadPercentage
```

### 17.12.4 优先级队列

| 优先级 | 任务类型 | 描述 |
| --- | --- | --- |
| P0 | 用户当前对话请求 | 如"修复 bug 后跑测试" |
| P1 | 提交前钩子 | lint-staged / husky pre-commit |
| P2 | 背景验证 | 代码审查后的 lint 验证 |
| P3 | 定时清理 | 健康检查、报告生成 |

低优先级任务不得阻塞高优先级任务。

---

## 17.13 测试常见问题

### 17.13.1 测试超时

**原因**：速率限制触发（5 次/5 分钟）导致测试超时

**解决**：确保 `NODE_ENV=test`

```typescript
// packages/server/src/__tests__/setup.ts
process.env.NODE_ENV = 'test'
```

### 17.13.2 数据库残留

**原因**：测试套件共享数据库导致数据污染

**解决**：使用 `:memory:` 数据库 + 每个测试文件 `closeDb()` 后 `getDb()`

### 17.13.3 PostgreSQL 集成测试挂起

**原因**：`PgSyncClient` 阻塞事件循环

**解决**：使用异步客户端 `IAsyncDbClient`，参考 [packages/server/docs/PG_ASYNC_MIGRATION_GUIDE.md](file:///f:/gexm/packages/server/docs/PG_ASYNC_MIGRATION_GUIDE.md)

### 17.13.4 WSL2 缺失

**原因**：Windows 无 WSL2 后端，Docker Linux 容器无法运行

**解决**：安装 WSL2 + Docker Desktop

### 17.13.5 CLI 参数覆盖配置

**原因**：CLI `testPathIgnorePatterns` 参数覆盖 `jest.config.js`

**解决**：在 `jest.config.js` 中配置，避免 CLI 传参

---

## 17.14 参考文档

- [packages/server/jest.config.js](file:///f:/gexm/packages/server/jest.config.js) — 后端 Jest 配置
- [packages/server/jest.config.postgres.js](file:///f:/gexm/packages/server/jest.config.postgres.js) — PG 集成配置
- [packages/server/src/__tests__/](file:///f:/gexm/packages/server/src/__tests__/) — 测试目录
- [packages/pc/vitest.config.ts](file:///f:/gexm/packages/pc/vitest.config.ts) — PC Vitest 配置
- [packages/sdk/jest.config.js](file:///f:/gexm/packages/sdk/jest.config.js) — SDK Jest 配置
- [playwright.config.ts](file:///f:/gexm/playwright.config.ts) — E2E 配置
- [preview/scripts/visual-compare.js](file:///f:/gexm/preview/scripts/visual-compare.js) — 视觉回归
- [.trae/rules/task-scheduling-rules.md](file:///f:/gexm/.trae/rules/task-scheduling-rules.md) — 资源管控规则
- [packages/server/docs/PG_ASYNC_MIGRATION_GUIDE.md](file:///f:/gexm/packages/server/docs/PG_ASYNC_MIGRATION_GUIDE.md) — PG 异步迁移
- [docs/test-report.md](file:///f:/gexm/docs/test-report.md) — 测试报告
