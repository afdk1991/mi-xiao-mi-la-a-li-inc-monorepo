# B 端后台管理系统全栈开发计划

## Context(背景与目标)

`f:\项目02` 当前包含:

* `B端后台管理系统可视化设计规范.md` — 完整设计规范(基于 Ant Design 5.x)

* `b-admin/` — 已有纯前端演示项目(原生 HTML/CSS/JS,**无构建工具、无 React、无 TypeScript**)

  * 设计令牌、组件库、50 图标、图表系统、4 类页面模板(列表/工作台/卡片/表单)、暗黑模式均已实现

  * 6 个路由:工作台/列表页/卡片页/表单页/图标库/设计令牌

  * 数据全部硬编码 mock,**无后端、无数据库、无 API、无测试、无项目文档**

* 3 份 E 盘扫描分析报告(与本任务无关)

用户要求开发"项目02"中所有内容,涵盖:架构、核心功能、UI、数据库、API、单元/集成测试、项目文档,要求符合行业标准、可维护可扩展、安全。

经用户确认的方向:

1. **保留现有原生 JS 前端**,新增 Node.js + Express 后端(最低风险、最快交付)
2. **SQLite (better-sqlite3)** 数据库(零运维)
3. **全栈测试**:后端 Jest+Supertest,前端 Vitest+jsdom
4. **业务领域**:通用 RBAC 后台(用户/角色/权限/菜单/字典 + 工作台/列表/表单 CRUD)

**前置约束(关键)**:

* 当前机器**未安装 Node.js/npm**,阶段 0 必须先安装 Node.js LTS v20+

* 项目当前**非 git 仓库**,需 `git init`

* Windows 环境,密码哈希用 `bcryptjs`(纯 JS)而非 `bcrypt`(避免 node-gyp 编译)

***

## 一、目标架构

```
浏览器  ──HTTP──  前端(b-admin/, 8080)  ──fetch + JWT──  后端(server/, 3000)  ──同步 SQL──  SQLite(data/app.db)
                  原生 JS + PowerShell 静态服务器           Node.js + Express                    better-sqlite3 (WAL)
                  保留不动 + 增量改造                          分层(routes/controllers/             单例 + pragma
                                                              services/middleware/db)
                                                                                                  Jest + Supertest 测试
                  Vitest + jsdom 测试
```

* 开发期:前后端端口分离 + CORS(8080 ↔ 3000)

* 生产期(可选):后端兜底静态文件,或 Nginx 反向代理

* API 统一前缀 `/api/v1`,JWT 鉴权(access 2h + refresh 7d,refresh 入库可吊销)

***

## 二、最终目录结构

```
f:\项目02\
├─ b-admin\                         【保留,微改】
│  ├─ index.html                    改:追加 api.js + login.js 两个 <script>
│  ├─ server.ps1                    不动(静态服务器 8080)
│  ├─ styles\{tokens,base,components}.css  不动
│  ├─ scripts\
│  │  ├─ icons.js / components.js / charts.js   不动
│  │  ├─ app.js                     改:login 路由 + 登录守卫 + 登出
│  │  ├─ api.js                     【新增】fetch 封装(token 注入、401 refresh、ApiError)
│  │  └─ pages\
│  │     ├─ login.js                【新增】登录页
│  │     ├─ list.js                 改:mock → Api.projects
│  │     ├─ workbench.js            改:mock → Api.workbench.*
│  │     ├─ card.js                 改:mock → Api.services
│  │     └─ form.js                 改:setTimeout → Api.projects.create/update
│
├─ server\                          【新增】Node.js 后端
│  ├─ src\
│  │  ├─ app.js                     Express 应用工厂 createApp()(测试隔离)
│  │  ├─ server.js                  启动入口(监听 3000)
│  │  ├─ config\{index.js,cors.js}  环境变量 + CORS 白名单
│  │  ├─ db\{index.js,query.js}     better-sqlite3 单例 + WAL/FK pragma + 查询封装
│  │  ├─ migrations\
│  │  │  ├─ 0001_init.sql           全部表结构 DDL
│  │  │  └─ runner.js               幂等执行器(_migrations 表)
│  │  ├─ seeders\
│  │  │  ├─ seed.js                 总入口
│  │  │  ├─ admin.seed.js           admin/admin123 + 3 角色 + 40 权限
│  │  │  ├─ menu.seed.js            菜单树(对齐前端 6 路由)
│  │  │  └─ dictionary.seed.js      字典(状态/优先级/类别)
│  │  ├─ middleware\
│  │  │  ├─ auth.js                 JWT 解析 + req.user 注入
│  │  │  ├─ requirePermission.js    RBAC 高阶中间件
│  │  │  ├─ validate.js             zod 校验
│  │  │  ├─ error.js / notFound.js / logger.js
│  │  ├─ utils\{jwt.js,password.js,response.js}
│  │  ├─ validators\*.validator.js  zod schema(每资源一个)
│  │  ├─ routes\*.routes.js          路由聚合 + 端点
│  │  ├─ controllers\*.controller.js 请求解析 + 调 service + 响应组装
│  │  └─ services\*.service.js       业务逻辑 + 事务编排
│  │     ├─ rbac.service.js          ★ 核心:user→roles→permissions 解析
│  │     ├─ auth/user/role/permission/menu/dictionary
│  │     └─ workbench/project/service/log
│  └─ tests\
│     ├─ setup.js                    createTestApp() + loginAs() + clearTable()
│     ├─ unit\*.service.test.js      services 层(:memory: 库)
│     └─ integration\*.test.js        supertest 全链路
│
├─ tests\frontend\                  【新增】Vitest + jsdom
│  ├─ setup.js                       全局 fetch mock + 脚本加载工具
│  ├─ api.test.js                   Api 封装测试
│  └─ form.validate.test.js         FormPage.validate 测试
│
├─ data\app.db                      【运行时生成】SQLite 文件(.gitignore)
├─ docs\                            【新增】
│  ├─ README.md / API.md / DATABASE.md / DEVELOPMENT.md / DEPLOYMENT.md
├─ scripts\dev.ps1                  【新增】一键启动(并行前后端)
├─ .env.example / .env / .gitignore / .editorconfig
├─ jest.config.js / vitest.config.js
└─ package.json                     根目录统一依赖与脚本
```

***

## 三、后端核心设计

### 3.1 API 端点清单(全部 `/api/v1` 前缀)

| 资源              | 端点                                                                                  | 鉴权          | 权限码                                   |
| --------------- | ----------------------------------------------------------------------------------- | ----------- | ------------------------------------- |
| `/auth`         | POST /login、POST /refresh、POST /logout、GET /profile、PUT /password                   | login 否/其他是 | —                                     |
| `/users`        | GET 列表(分页/搜索/筛选)、GET /:id、POST、PUT /:id、DELETE /:id、PUT /:id/roles、PUT /:id/status  | 是           | user:read/create/update/delete/assign |
| `/roles`        | GET、GET /:id、POST、PUT /:id、DELETE /:id(预置禁删)、PUT /:id/permissions                   | 是           | role:\*                               |
| `/permissions`  | GET 列表(按 module 分组)、GET /tree                                                       | 是           | permission:read                       |
| `/menus`        | GET /tree(按权限过滤)、GET、POST、PUT /:id、DELETE /:id                                      | 是           | menu:\*                               |
| `/dictionaries` | GET /:type、GET、POST、PUT /:id、DELETE /:id                                            | 是(查询仅需登录)   | dict:\*                               |
| `/workbench`    | GET /overview、GET /sales-trend、GET /channel-distribution、GET /todos、GET /activities | 是           | —                                     |
| `/projects`     | GET(分页)、GET /:id、POST、PUT /:id、DELETE /:id、POST /batch-delete                       | 是           | project:\*                            |
| `/services`     | GET、GET /:id、POST、PUT /:id、DELETE /:id                                              | 是           | service:\*                            |
| `/logs`         | GET(分页)                                                                             | 是           | log:read                              |
| `/health`       | GET                                                                                 | 否           | —                                     |

**分页约定**:query `page`(默认 1)+ `pageSize`(默认 10)+ `sort`(如 `-created_at`)+ `search` + 各资源筛选字段;响应 `{ list, total, page, pageSize }`。

### 3.2 中间件链(装配顺序)

```
helmet → cors → logger(morgan) → express.json → /api/v1 路由 → notFound → error
```

`/api/v1` 内每个路由:`validate(schema)? → auth → requirePermission('xxx:yyy')? → controller`

### 3.3 鉴权方案

* 密码:`bcryptjs` saltRounds=10

* JWT:`jsonwebtoken` HS256,access 2h / refresh 7d,载荷 `{ sub, username, roles, type, iat, exp }`

* refresh token 入 `refresh_tokens` 表(jti + userId + expiresAt + revoked),支持登出真正吊销

* 不做滑动续期(每次 refresh 仅换 access,降低复杂度)

* 前端 `api.js` 收到 401 自动调一次 `/auth/refresh`,失败再跳登录

### 3.4 数据库设计要点(`migrations/0001_init.sql`)

主表 10 张:

* `users`(用户名/密码哈希/真实姓名/邮箱/手机/头像/状态/最后登录)

* `roles`(code/name/is\_builtin 禁删标志)

* `permissions`(code/name/module/type)

* `user_roles`、`role_permissions`(关联表,CASCADE)

* `menus`(自引用树,parent\_id/route\_key/icon/permission\_code,对齐前端 6 路由)

* `dictionaries`(type+code 联合唯一,badge\_type 对齐前端 Badge)

* `projects`(列表页演示实体,迁移现有 12 条 mock)

* `services`(卡片页演示实体,迁移现有 9 条 mock)

* `operation_logs`(操作日志)

* `refresh_tokens`(JWT 吊销表)

* `_migrations`(版本记录)

索引:外键列 + 高频筛选列(status/owner/created\_at)+ 唯一约束(SQLite 自动建索引)。

pragma:`journal_mode=WAL`、`foreign_keys=ON`、`synchronous=NORMAL`。

### 3.5 Seed 数据

* 管理员:`admin` / `admin123`(bcrypt 哈希入库)

* 角色:`admin`(全权限,is\_builtin)、`manager`(运营经理,工作台+项目/服务读写+用户只读)、`user`(普通,工作台+项目只读)

* 权限码:约 40 条覆盖所有路由的 `:read/:create/:update/:delete/:assign`

* 菜单树:工作区(工作台/列表页/卡片页/表单页)+ 规范(图标库/设计令牌)

* 字典:project\_status / priority / project\_category / service\_category / user\_status

* 演示业务数据:迁移现有项目 12 条 + 服务 9 条入库

***

## 四、前端改造(最小侵入)

### 4.1 新增 `b-admin/scripts/api.js`

封装 fetch,挂全局 `window.Api`:

* 统一 baseURL `http://localhost:3000/api/v1`

* 自动注入 `Authorization: Bearer <token>`

* 401 自动调一次 `/auth/refresh`,失败跳登录

* 错误统一抛 `ApiError`(message/code/details),页面 try/catch + Toast

* 按资源分组:`Api.auth.login()`、`Api.users.list()`、`Api.projects.list/create/update/del`、`Api.workbench.overview/salesTrend/...` 等

### 4.2 新增 `b-admin/scripts/pages/login.js`

全局 `LoginPage` 对象,复用现有 `Components.Card/Button/Input/FormItem`:

* 用户名 + 密码表单

* 提交 → `Api.auth.login()` → 存 access/refresh token + current\_user → `navigate('workbench')`

* 失败显错误,loading 态用 `Components.Button` 的 loading 属性

### 4.3 改造 `app.js`(最小改动)

* `App.routes` 增加 `login: { ..., public: true }`

* `App.init()` 开头加守卫:无 token 且非 login 路由 → `navigate('login')`

* `renderLayout()` 分支:`currentRoute === 'login'` 时不渲染侧边栏/顶栏

* 顶栏加登出按钮 → `App.actions['app-logout']` → 清 token + 跳 login

### 4.4 改造 4 个页面

| 页面             | 改造点                                                                                                        |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| `list.js`      | 删硬编码 data → `state.data=[]/total/loading` + `async load(query)` 调 `Api.projects.list` → 分页/搜索/排序/删除全部走 API |
| `workbench.js` | `onMount` 并行 `Promise.all([overview/salesTrend/channelDist/todos/activities])` → 写 state → render + 绘图     |
| `card.js`      | `onMount` 调 `Api.services.list({category})` → 切 tab 重新 load                                                |
| `form.js`      | `onSubmit` 内 `setTimeout` 替换为 `await Api.projects.create/update(values)`,前端 validate 保留作预校验                |

### 4.5 `index.html` 改动

仅追加 2 行 `<script>`,顺序严格:
`icons → components → charts → api → pages(login/list/workbench/card/form) → app`

**不改动**:tokens.css、base.css、components.css、icons.js、components.js、charts.js。

***

## 五、测试体系

### 5.1 后端 Jest + Supertest

* `jest.config.js`:`testEnvironment: 'node'`,collectCoverage from `server/src/**/*.js`

* `server/tests/setup.js`:`createTestApp()`(:memory: 库 + migrate + seed)、`loginAs(username)` 返 token、`clearTable(names)`

* `tests/unit/*.service.test.js`:直接调 service,覆盖成功/参数非法/权限不足/重复/事务回滚

* `tests/integration/*.test.js`:supertest 全链路,先 login 拿 token 再打端点

* `tests/integration/rbac.test.js`:admin/manager/user 三 token 打所有写端点,断言 200/403 矩阵

### 5.2 前端 Vitest + jsdom

* `vitest.config.js`:`environment: 'jsdom'`,`setupFiles: ['tests/frontend/setup.js']`

* `setup.js`:全局 `fetch` mock + `loadScript(path)` 工具(用 `vm.runInContext` 按序加载 icons→components→api→目标页到全局)

* `api.test.js`:baseURL 拼接、Authorization 头注入、401 触发 refresh、错误抛 ApiError

* `form.validate.test.js`:加载 FormPage,对 validate() 喂合法/非法输入断言

### 5.3 覆盖率目标

| 模块                 | 目标    |
| ------------------ | ----- |
| server/services    | ≥ 85% |
| server/controllers | ≥ 80% |
| server/middleware  | ≥ 85% |
| server/utils       | ≥ 90% |
| 前端 api.js          | ≥ 85% |

***

## 六、关键文件清单(实施时重点设计)

| 文件                                            | 角色                                               |
| --------------------------------------------- | ------------------------------------------------ |
| `f:\项目02\package.json`                        | 根目录统一依赖与脚本入口                                     |
| `f:\项目02\server\src\app.js`                   | Express 应用工厂,中间件装配顺序决定骨架                         |
| `f:\项目02\server\src\migrations\0001_init.sql` | 全部表结构 DDL,数据层根基                                  |
| `f:\项目02\server\src\db\index.js`              | better-sqlite3 单例 + WAL/FK pragma,测试可注入 :memory: |
| `f:\项目02\server\src\services\rbac.service.js` | user→roles→permissions 解析核心,鉴权依赖                 |
| `f:\项目02\server\src\middleware\auth.js`       | JWT 校验链 + req.user 注入                            |
| `f:\项目02\b-admin\scripts\api.js`              | 前端全部 API 调用入口,token/refresh/错误统一                 |
| `f:\项目02\b-admin\scripts\app.js`              | 改造点:login 路由 + 登录守卫 + 登出 + 登录页布局分支               |
| `f:\项目02\b-admin\scripts\pages\login.js`      | 新增登录页                                            |

***

## 七、实施步骤(分阶段,每阶段产出可验证)

### 阶段 0:环境与骨架(0.5 天)

* 安装 Node.js LTS v20+

* `git init` + `.gitignore`(node\_modules/data/\*.log/.env)

* 根 `package.json`、`.env.example`、`.editorconfig`

* `npm install`

* **验证**:`node -v` ≥ 20,`npm install` 无错

### 阶段 1:后端骨架(1 天)

* `server/src/app.js`(Express 工厂 + 中间件装配,无业务)+ `server.js`(监听 3000)

* `config/`、`middleware/`(error/notFound/logger/cors)、`utils/response.js`

* `/health` 端点

* **验证**:`npm run dev:server` → `curl http://localhost:3000/health` 返 200

### 阶段 2:数据库与 seed(1 天)

* `db/index.js` 单例 + pragma

* `migrations/0001_init.sql` + `runner.js`

* `seeders/*`(admin + 角色 + 权限 + 菜单 + 字典 + 演示业务数据)

* `npm run db:migrate && npm run db:seed`

* **验证**:SQLite 工具打开 `data/app.db` 见各表与数据

### 阶段 3:后端核心 + RBAC + 测试(2-3 天)

* `utils/jwt.js`、`utils/password.js`

* `services/rbac.service.js`(核心)

* `services/auth.service.js` + `auth.controller.js` + `auth.routes.js`

* `middleware/auth.js` + `requirePermission.js`

* 登录/profile/refresh/logout + 测试

* 逐资源铺开 user/role/permission/menu/dictionary/project/service/workbench/log,每资源 service→controller→routes→tests 同步写

* **验证**:`npm run test:server` 全绿,coverage 达标

### 阶段 4:前端改造(1.5-2 天)

* 新增 `api.js` + `index.html` 引入

* 新增 `login.js` + `index.html` 引入

* 改 `app.js`(login 路由 + 守卫 + 登出)

* 改 `list/workbench/card/form.js` 接 api

* 前端 `vitest.config.js` + `tests/frontend/`

* **验证**:浏览器 8080 → 登录 admin/admin123 → 工作台数据来自后端 → 列表页分页/搜索/排序走 API → 表单提交落库 → 重启后数据仍在

### 阶段 5:文档 + 一键启动 + 收尾(0.5-1 天)

* 撰写 `docs/` 五份文档

* `scripts/dev.ps1`(或 `concurrently`)一键启动

* `npm run test:coverage` 达标

* 全链路冒烟(登录→各页→CRUD→登出→权限拒绝)

* **验证**:新人按 README 5 分钟跑起来

**总工时**:约 5-7 天

***

## 八、风险与对策

| 风险                                | 对策                                                                           |
| --------------------------------- | ---------------------------------------------------------------------------- |
| Windows 上 `better-sqlite3` 原生编译失败 | v11 提供 prebuilt binary 通常免编译;失败时需 VS Build Tools,可降级 `sqlite3` 包(纯 JS 慢但免编译) |
| 密码哈希 `bcrypt` 编译失败                | 用 `bcryptjs`(纯 JS)替代,API 兼容                                                  |
| 前端非 ES module,Vitest 加载难          | `setup.js` 用 `vm.runInContext` 按序加载脚本到全局;`api.js` 设计为可独立测试                   |
| SQLite 写并发瓶颈                      | WAL 模式 + 单写足够后台演示;生产高并发再迁 Postgres(分层设计使 DB 切换仅改 `db/index.js`)              |
| 现有 `index.html` 脚本顺序错乱            | 严格按 `icons → components → charts → api → pages → app` 顺序                     |
| 内联 `onclick` 调全局函数在登录态失败时报错       | `api.js` 失败统一抛 `ApiError`,页面 try/catch + Toast;避免未捕获 Promise 拒绝              |

***

## 九、关键决策(已采纳,实施时遵循)

| 决策点           | 选择                                | 理由                                                          |
| ------------- | --------------------------------- | ----------------------------------------------------------- |
| 后端语言          | 纯 JS + JSDoc                      | 与前端一致、无构建步骤、最快交付;关键模块写完整 JSDoc 获类型提示                        |
| 前后端端口         | 开发期分离(8080+3000+CORS)             | `server.ps1` 是无依赖 HttpListener,改造成 Express 静态服务会破坏前端独立可运行特性 |
| API 前缀        | `/api/v1`                         | 成本几乎为零,换未来破坏性变更退路                                           |
| Refresh token | 做但简化(入库吊销,不做滑动续期)                 | 后台会话长,体验重要;简化降低安全面                                          |
| 列表页演示实体       | 保留"项目"(方案 B,最小侵入)                 | 与"不破坏现有演示"原则一致;后端 `/projects` 表与现有 mock 数据迁移对齐              |
| 测试运行器         | 后端 Jest+Supertest,前端 Vitest+jsdom | Jest 是 Node 生态标准;Vitest 配置简单、与 Jest API 兼容、jsdom 体验好        |
| 包管理           | npm                               | Node 自带,无额外安装                                               |

***

## 十、验证(端到端测试方案)

实施完成后,按以下顺序验证全栈联通:

1. **环境检查**:`node -v` ≥ 20,`npm -v` 可用
2. **后端启动**:`npm run dev:server` → `curl http://localhost:3000/health` 返 `{"success":true}`
3. **数据库**:`npm run db:migrate && npm run db:seed` → SQLite 工具见 admin 用户与演示数据
4. **后端测试**:`npm run test:server` → 全绿,coverage ≥ 80%
5. **前端启动**:`npm run dev:web` → 浏览器打开 `http://localhost:8080`
6. **登录流程**:admin/admin123 → 跳转工作台 → 见后端返回的 KPI/图表/待办/活动数据
7. **列表页**:分页切换、搜索、状态筛选、排序、单条删除、批量删除全部命中 `/projects` API
8. **卡片页**:切 tab 调 `Api.services.list({category})` 数据刷新
9. **表单页**:提交 → 落库 → 列表页刷新见新记录 → 重启后端数据仍在
10. **权限验证**:用 `user` 账号登录(无 user:create 权限)→ 创建用户按钮应禁用或后端返 403
11. **登出**:点登出 → 清 token → 跳登录页 → 直接访问 #workbench 应被守卫拦截
12. **暗黑模式**:切换主题 → 所有页面正常显示(现有功能不破坏)
13. **前端测试**:`npm run test:frontend` → 全绿
14. **一键启动**:`npm run dev` → 前后端同时启动
15. **文档**:新人按 `docs/README.md` 5 分钟跑起来

