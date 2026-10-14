# 开发指南

**文档版本**：v2.0.0
**最后更新**：2026-07-21
**适用项目**：Gexm 全平台应用系统

---

## 目录

1. [开发环境搭建](#1-开发环境搭建)
2. [项目结构说明](#2-项目结构说明)
3. [代码风格规范](#3-代码风格规范)
4. [命名规范](#4-命名规范)
5. [Git 开发规范](#5-git-开发规范)
6. [前端开发规范](#6-前端开发规范)
7. [后端开发规范](#7-后端开发规范)
8. [SDK 开发规范](#8-sdk-开发规范)
9. [测试规范](#9-测试规范)
10. [文档规范](#10-文档规范)
11. [安全开发规范](#11-安全开发规范)
12. [性能优化指南](#12-性能优化指南)
13. [调试技巧](#13-调试技巧)
14. [常见问题](#14-常见问题)

---

## 1. 开发环境搭建

### 1.1 系统要求

| 软件 | 版本要求 | 说明 |
|------|----------|------|
| Node.js | >= 18.0.0（推荐 20.x LTS） | JavaScript 运行时 |
| npm | >= 9.0.0 | 包管理器 |
| Git | >= 2.30 | 版本控制 |
| VS Code | 最新版 | 推荐 IDE |
| Docker Desktop | >= 20.10 | 容器化开发（可选） |

### 1.2 推荐 VS Code 插件

- **ESLint** - 代码质量检查
- **Prettier** - 代码格式化
- **TypeScript Vue Plugin (Volar)** - Vue 3 + TypeScript 支持
- **Vue Language Features (Volar)** - Vue 语言支持
- **GitLens** - Git 增强
- **DotENV** - .env 文件语法高亮
- **Markdown All in One** - Markdown 编辑
- **YAML** - YAML 文件支持

### 1.3 环境搭建步骤

```bash
# 1. 克隆仓库
git clone https://github.com/gexm/gexm.git
cd gexm

# 2. 安装依赖（npm workspaces 自动链接子包）
npm install

# 3. 启用 Husky Git 钩子
npm run prepare

# 4. 复制环境变量
copy packages\server\.env.example packages\server\.env
copy packages\pc\.env.example packages\pc\.env

# 5. 启动开发环境
npm run dev
```

### 1.4 开发命令速查

| 命令 | 说明 |
|------|------|
| `npm run dev` | 并行启动后端 + H5 前端 |
| `npm run dev:all` | 并行启动后端 + H5 + 桌面端 |
| `npm run dev:server` | 仅启动后端 |
| `npm run dev:app-h5` | 仅启动 H5 前端 |
| `npm run dev:app-mp-weixin` | 启动微信小程序开发模式 |
| `npm run dev:pc` | 启动 PC 管理端 |
| `npm run dev:desktop` | 启动 Electron 桌面端 |
| `npm run build:server` | 构建后端生产产物 |
| `npm run build:app-h5` | 构建 H5 生产产物 |
| `npm run build:pc` | 构建 PC 管理端 |
| `npm run lint` | ESLint 全量检查 |
| `npm run lint:fix` | ESLint 自动修复 |
| `npm run format` | Prettier 全量格式化 |
| `npm test` | 运行所有测试 |
| `npm run typecheck` | TypeScript 类型检查 |

---

## 2. 项目结构说明

### 2.1 Monorepo 结构

```
gexm/
├── packages/              # 子包目录
│   ├── server/            # 后端服务（Express + TypeScript）
│   ├── app/               # 跨端前端（uni-app + Vue 3）
│   ├── sdk/               # 跨平台 SDK
│   ├── pc/                # PC 管理端
│   ├── desktop/           # Electron 桌面端
│   ├── shared/            # 共享工具与类型
│   └── ...                # 其他业务子包
├── docs/                  # 项目文档
├── deploy/                # 部署脚本
├── docker/                # Docker 配置
├── scripts/               # 工具脚本
├── .github/workflows/     # CI/CD 工作流
├── .husky/                # Git 钩子
└── package.json           # 根配置
```

### 2.2 子包依赖关系

```
@gexm/shared（共享基础）
    ↑
    ├── @gexm/sdk（跨平台 SDK）
    │       ↑
    │       └── @gexm/app（移动端应用）
    │
    └── @gexm/server（后端服务）
            ↑
            ├── @gexm/pc（PC 管理端）
            │       ↑
            │       └── @gexm/desktop（桌面端）
            └── @gexm/app（移动端应用）
```

---

## 3. 代码风格规范

### 3.1 通用规范

- **缩进**：使用 2 个空格，禁止使用 Tab
- **行尾**：LF（Unix 风格），Windows 下配置 Git 自动转换
- **引号**：JavaScript/TypeScript 使用单引号，HTML/Vue 使用双引号
- **分号**：JavaScript/TypeScript 不使用分号
- **行尾空格**：不允许行尾空格
- **文件末尾空行**：文件末尾保留一个空行
- **最大行长度**：建议 120 字符，最长不超过 160 字符

### 3.2 ESLint 与 Prettier

项目已配置统一的 ESLint + Prettier 规则，所有代码必须通过检查：

```bash
# 检查
npm run lint

# 自动修复
npm run lint:fix

# 格式化
npm run format
```

> **重要**：不要绕过 lint 检查。提交代码前 Husky 会自动运行 lint-staged，确保只有通过检查的代码才能提交。

### 3.3 注释规范

#### 3.3.1 JSDoc 注释

所有公共 API、函数、类必须包含 JSDoc 注释：

```typescript
/**
 * 用户登录验证
 * @param {string} username - 用户名
 * @param {string} password - 密码
 * @returns {Promise<User>} 用户信息
 * @throws {AuthError} 认证失败时抛出
 * @example
 * const user = await login('admin', 'password123')
 */
async function login(username: string, password: string): Promise<User> {
  // ...
}
```

#### 3.3.2 行内注释

- 复杂逻辑必须添加行内注释
- 业务规则说明需要注释
- 特殊处理（hack / workaround）必须说明原因
- 禁止无意义的注释（如 `// 定义变量 a`）

#### 3.3.3 TODO / FIXME

```typescript
// TODO: 优化性能，改用缓存
// FIXME: 边界条件处理有问题，需要修复
// HACK: 临时解决方案，待重构
```

---

## 4. 命名规范

### 4.1 文件命名

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件文件 | PascalCase | `UserProfile.vue`、`Button.tsx` |
| 页面文件 | kebab-case | `user-profile.vue`、`order-list.vue` |
| 工具函数 | camelCase | `formatDate.ts`、`validate.js` |
| 常量定义 | UPPER_SNAKE_CASE | `error-codes.ts` |
| 类型定义 | PascalCase，`.d.ts` 或 `.types.ts` | `user.types.ts` |
| 测试文件 | 与源文件同名 + `.test` | `formatDate.test.ts` |

### 4.2 变量命名

| 类型 | 规范 | 示例 |
|------|------|------|
| 变量/函数 | camelCase | `userInfo`、`getUserById` |
| 类/接口/类型 | PascalCase | `UserService`、`UserProfile` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| 布尔值 | is/has/should/can 前缀 | `isActive`、`hasPermission` |
| 私有变量 | _ 前缀（可选） | `_internalState` |

### 4.3 CSS 类名命名

- 使用 BEM 命名法：`block__element--modifier`
- 所有类名带项目前缀：`gexm-`
- 全部小写，连字符分隔

```scss
.gexm-button { }
.gexm-button__icon { }
.gexm-button--primary { }
```

### 4.4 数据库命名

- 表名：snake_case，复数形式
- 字段名：snake_case
- 主键：`id`
- 外键：`{table}_id`
- 时间字段：`created_at`、`updated_at`
- 软删除：`deleted_at`

---

## 5. Git 开发规范

### 5.1 分支策略

采用 Git Flow 简化模型：

| 分支 | 用途 | 命名规则 |
|------|------|----------|
| `main` | 生产发布分支 | - |
| `develop` | 集成分支 | - |
| `feature/*` | 新功能开发 | `feature/功能描述` |
| `fix/*` | Bug 修复 | `fix/issue-编号-描述` |
| `release/*` | 发布预备 | `release/v1.0.0` |
| `hotfix/*` | 生产紧急修复 | `hotfix/v1.0.1` |

### 5.2 工作流程

```bash
# 1. 从 develop 切出功能分支
git checkout develop
git pull origin develop
git checkout -b feature/cart-coupon

# 2. 开发并提交
git add .
git commit -m "feat(cart): add coupon support"

# 3. 同步最新代码
git checkout develop
git pull origin develop
git checkout feature/cart-coupon
git rebase develop

# 4. 推送到远端
git push origin feature/cart-coupon

# 5. 创建 PR（Pull Request）
# 在 GitHub 上发起 PR：feature/cart-coupon -> develop
```

### 5.3 提交规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/v1.0.0/) 规范：

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

#### 类型（type）

| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档变更 |
| `style` | 代码格式（不影响功能） |
| `refactor` | 重构（既非新增也非修复） |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `build` | 构建系统或依赖变更 |
| `ci` | CI 配置变更 |
| `chore` | 杂项 |
| `revert` | 回滚提交 |

#### 示例

```bash
# 功能开发
feat(server): 新增订单退款审核接口

# Bug 修复
fix(app): 修复购物车数量更新时未同步 SKU 库存的问题

# 文档
docs(readme): 补充 SDK 模块的适配器开发指南

# 性能优化
perf(server): 将用户列表查询改为批量预加载，消除 N+1

# 依赖升级
chore(deps): 升级 express 至 5.0.1
```

### 5.4 PR 规范

PR 标题格式同提交信息，PR 描述需包含：

- 变更说明：简要描述做了什么，为什么做
- 变更类型：feat / fix / docs / refactor / perf
- 关联 Issue：Closes #123
- 自检清单：lint、构建、测试、文档
- 截图/录屏：UI 变更必须附带

---

## 6. 前端开发规范

### 6.1 Vue 3 规范

#### 6.1.1 组件结构

```vue
<script setup lang="ts">
// 1. import
import { ref, computed } from 'vue'

// 2. props & emits
const props = defineProps<{
  title: string
  count?: number
}>()

const emit = defineEmits<{
  (e: 'update', value: number): void
}>()

// 3. 响应式数据
const localCount = ref(props.count || 0)

// 4. 计算属性
const doubled = computed(() => localCount.value * 2)

// 5. 方法
const increment = () => {
  localCount.value++
  emit('update', localCount.value)
}

// 6. 生命周期
onMounted(() => {
  // ...
})
</script>

<template>
  <div class="gexm-counter">
    <span>{{ title }}: {{ localCount }}</span>
    <button @click="increment">+1</button>
  </div>
</template>

<style scoped lang="scss">
.gexm-counter {
  // 样式
}
</style>
```

#### 6.1.2 组合式函数（Composables）

- 统一放在 `composables/` 目录
- 以 `use` 开头命名
- 返回值使用对象解构

```typescript
// composables/usePagination.ts
export function usePagination<T>(fetchFn: (params: any) => Promise<{ list: T[]; total: number }>) {
  const page = ref(1)
  const pageSize = ref(20)
  const total = ref(0)
  const list = ref<T[]>([])
  const loading = ref(false)

  const loadData = async () => {
    loading.value = true
    try {
      const res = await fetchFn({ page: page.value, pageSize: pageSize.value })
      list.value = res.list
      total.value = res.total
    } finally {
      loading.value = false
    }
  }

  return {
    page,
    pageSize,
    total,
    list,
    loading,
    loadData,
  }
}
```

### 6.2 状态管理（Pinia）

- Store 放在 `store/` 目录
- 使用 Setup Store 风格（组合式 API）
- 命名：`use{Name}Store`

```typescript
// store/user.ts
export const useUserStore = defineStore('user', () => {
  const userInfo = ref<User | null>(null)
  const token = ref<string>('')

  const isLoggedIn = computed(() => !!token.value)

  const setUser = (user: User, t: string) => {
    userInfo.value = user
    token.value = t
  }

  const logout = () => {
    userInfo.value = null
    token.value = ''
  }

  return {
    userInfo,
    token,
    isLoggedIn,
    setUser,
    logout,
  }
})
```

### 6.3 跨端开发（uni-app）

#### 6.3.1 条件编译

```javascript
// #ifdef H5
console.log('仅在 H5 执行')
// #endif

// #ifdef MP-WEIXIN
console.log('仅在微信小程序执行')
// #endif

// #ifdef APP-PLUS
console.log('仅在 App 执行')
// #endif
```

#### 6.3.2 平台差异封装

**不要在业务代码中直接判断平台！** 统一通过 `@gexm/sdk` 适配器：

```typescript
// ❌ 错误
if (uni.getSystemInfoSync().platform === 'devtools') {
  // ...
}

// ✅ 正确
import { GexmSDK } from '@gexm/sdk'

const platform = GexmSDK.getPlatform()
```

---

## 7. 后端开发规范

### 7.1 分层架构

```
routes/          # 路由层：URL 映射、参数接收
    ↓
middleware/      # 中间件：认证、日志、限流、安全
    ↓
controllers/     # 控制器：请求处理、参数校验、响应封装
    ↓
services/        # 业务服务层：核心业务逻辑（可选，复杂业务用）
    ↓
models/          # 数据模型层：数据库操作
    ↓
database         # 数据库
```

### 7.2 路由规范

- RESTful API 设计
- 资源使用复数形式：`/api/users`、`/api/orders`
- HTTP 方法对应操作：
  - GET：查询
  - POST：创建
  - PUT：全量更新
  - PATCH：部分更新
  - DELETE：删除

### 7.3 参数校验

使用 Zod 进行参数校验：

```typescript
// schemas/auth.ts
import { z } from 'zod'

export const loginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
})

export type LoginInput = z.infer<typeof loginSchema>

// routes/auth.ts
router.post('/login', async (req, res) => {
  const input = loginSchema.parse(req.body)
  // ...
})
```

### 7.4 响应格式

统一使用 `response.ts` 工具封装：

```typescript
// 成功响应
success(res, data, '操作成功')

// 失败响应
fail(res, '参数错误', 400)

// 分页响应
paginated(res, list, page, pageSize, total)
```

响应结构：

```json
{
  "code": 0,
  "message": "成功",
  "data": {},
  "timestamp": 1704067200000
}
```

### 7.5 错误码体系

| 范围 | 分类 | 说明 |
|------|------|------|
| 0 | 成功 | 请求成功 |
| 1000-1999 | 通用错误 | 参数错误、服务器内部错误等 |
| 2000-2999 | 认证授权 | 未登录、Token 过期、无权限等 |
| 3000-3999 | 业务逻辑 | 库存不足、订单状态异常等 |
| 4000-4999 | 资源操作 | 资源不存在、重复创建等 |
| 6000-6999 | 安全相关 | 频率限制、签名错误等 |

### 7.6 数据库操作

- 使用参数化查询，禁止 SQL 拼接
- 统一通过 model 层操作数据库
- 数据库字段使用 snake_case，代码中自动转换为 camelCase

```typescript
// ✅ 正确
const stmt = db.prepare('SELECT * FROM users WHERE id = ?')
const user = stmt.get(userId)

// ❌ 错误（SQL 注入风险）
const user = db.prepare(`SELECT * FROM users WHERE id = ${userId}`).get()
```

---

## 8. SDK 开发规范

### 8.1 适配器模式

所有平台差异通过适配器封装，业务层不感知平台：

```typescript
// interfaces/IStorageModule.ts
export interface IStorageModule {
  get(key: string): string | null
  set(key: string, value: string, options?: StorageOptions): void
  remove(key: string): void
  clear(): void
}

// adapters/web/storage.ts
export class WebStorageModule implements IStorageModule {
  get(key: string) {
    return localStorage.getItem(key)
  }
  // ...
}

// adapters/mp-weixin/storage.ts
export class MPWeixinStorageModule implements IStorageModule {
  get(key: string) {
    return wx.getStorageSync(key)
  }
  // ...
}
```

### 8.2 新增适配器

1. 在 `src/adapters/` 下创建平台目录
2. 实现 `IPlatformAdapter` 接口的所有模块
3. 在 `platformFactory.ts` 中注册

---

## 9. 测试规范

### 9.1 测试类型

| 类型 | 框架 | 说明 |
|------|------|------|
| 单元测试 | Jest / Vitest | 函数、组件、工具类测试 |
| 集成测试 | Jest / Vitest | API 接口、模块间交互 |
| E2E 测试 | Playwright | 端到端流程测试 |

### 9.2 测试文件位置

- 单元测试：与源文件同目录，`*.test.ts` 或 `*.spec.ts`
- 集成测试：`__tests__/` 目录
- E2E 测试：`e2e/` 目录

### 9.3 测试命名

```typescript
// 用 describe 组织测试
describe('UserService', () => {
  // 用 it/test 描述具体测试
  it('should return user by id', async () => {
    // ...
  })

  it('should throw error when user not found', async () => {
    // ...
  })
})
```

### 9.4 运行测试

```bash
# 全部测试
npm test

# 监听模式
npm run test:watch

# 覆盖率
npm run test:coverage

# 运行指定文件
npm test -- path/to/file.test.ts
```

---

## 10. 文档规范

### 10.1 Markdown 规范

- 标题使用 `#` 层级，H1 唯一
- 代码块指定语言，确保语法高亮
- 列表使用 `-` 或 `1.`
- 表格对齐美观
- 内部链接使用相对路径
- 图片使用 alt 属性

### 10.2 代码示例

代码示例必须可运行，包含必要的上下文：

````markdown
```typescript
import { GexmSDK } from '@gexm/sdk'

// 初始化 SDK
GexmSDK.init({
  baseUrl: 'https://api.example.com',
  debug: true,
})

// 调用接口
const res = await GexmSDK.network.get('/api/products')
console.log(res.data)
```
````

### 10.3 文档更新原则

- 代码变更同步更新相关文档
- API 变更必须更新 API 文档
- 新增功能必须更新 README 和架构文档
- 文档中不能包含敏感信息（密钥、密码等）

---

## 11. 安全开发规范

### 11.1 输入验证

- 所有用户输入必须验证（类型、长度、格式、范围）
- 字符串输入使用白名单验证，而非黑名单过滤
- 数字类型提前做类型转换

### 11.2 输出净化

- 所有输出到 HTML 的内容必须转义
- JSON 输出设置正确的 Content-Type
- 敏感信息必须脱敏

### 11.3 认证与授权

- 密码使用 bcrypt 加密（10 轮以上）
- JWT Token 设置合理的有效期
- 敏感操作需要二次验证
- 遵循最小权限原则

### 11.4 数据库安全

- 所有查询使用参数化（预处理）
- 禁止动态拼接 SQL
- 数据库账号最小权限
- 敏感数据加密存储

### 11.5 依赖安全

- 定期更新依赖，修复安全漏洞
- 使用 `npm audit` 检查依赖漏洞
- 不使用来源不明的第三方包

---

## 12. 性能优化指南

### 12.1 前端优化

- 路由懒加载，代码分割
- 图片懒加载 + WebP 格式
- 大列表使用虚拟滚动
- 合理使用缓存（localStorage、内存缓存）
- 减少不必要的响应式数据
- 合理使用 `v-memo`、`v-once`

### 12.2 后端优化

- 数据库加索引（查询频繁的字段）
- 避免 N+1 查询，使用批量查询
- 热点数据使用 Redis 缓存
- 启用 Gzip 压缩
- 分页查询限制最大 pageSize

---

## 13. 调试技巧

### 13.1 后端调试

```bash
# 查看日志
tail -f packages/server/logs/app.log

# 启用调试模式
# 在 .env 中设置
LOG_LEVEL=debug

# Node.js 调试
node --inspect packages/server/dist/server.js
```

### 13.2 前端调试

- H5：Chrome DevTools
- 微信小程序：微信开发者工具
- Vue Devtools：浏览器扩展
- 网络请求：Network 面板
- 状态管理：Vue Devtools Pinia 面板

### 13.3 数据库调试

```bash
# SQLite 命令行
sqlite3 packages/server/data/gexm.db

# 查看表结构
.schema users

# 执行查询
SELECT * FROM users LIMIT 10;
```

---

## 14. 常见问题

### Q: npm install 很慢或失败

A: 配置国内镜像源：
```bash
npm config set registry https://registry.npmmirror.com
```

### Q: ESLint 报错但代码是对的

A: 先尝试自动修复：
```bash
npm run lint:fix
```
如仍有问题，检查 ESLint 配置或查看报错详情。

### Q: TypeScript 类型报错

A: 
1. 检查类型定义是否正确
2. 运行 `npm run typecheck` 查看完整错误
3. 必要时使用 `// @ts-ignore` 或类型断言（需注明原因）

### Q: Git 提交被 husky 拦截

A: 
1. 检查 lint 是否有错误
2. 检查提交信息是否符合 Conventional Commits 规范
3. 不要使用 `--no-verify` 绕过检查

---

## 相关文档

- [架构设计](architecture.md)
- [API 文档](api-documentation.md)
- [数据库设计](database-design.md)
- [安全审计](security-audit.md)
- [部署指南](deployment-guide.md)
- [测试报告](test-report.md)
- [贡献指南](../CONTRIBUTING.md)
