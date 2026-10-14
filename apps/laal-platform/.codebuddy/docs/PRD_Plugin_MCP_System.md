# 产品需求文档 (PRD)

## 统一插件管理系统 — 基于 MCP 规则与 Agent SkillHub

---

## 1. 项目信息

| 项目 | 内容 |
|---|---|
| **项目名称** | `plugin_mcp_system` |
| **语言** | 中文 |
| **编程语言/技术栈** | TypeScript (Node.js), SQLite (better-sqlite3), Jest, tsc + tsx |
| **协议** | JSON-RPC 2.0 over stdio/SSE |
| **原始需求复述** | 构建一个统一的插件管理系统，基于 MCP (Model Context Protocol) 规则实现跨插件的标准化通信与数据交换，集成 Agent SkillHub 套件提供持久化记忆能力。系统包含五大核心模块：MCP 规则接口层、记忆技能模块、Agent SkillHub 套件、插件隔离与安全沙箱、可扩展的插件配置体系。要求高可用、容错、完整的日志监控，提供管理 CLI 和 REST API。 |

---

## 2. 产品目标

| # | 目标 | 衡量标准 |
|---|---|---|
| G1 | **标准化通信**：所有插件通过统一的 MCP 规则接口注册、通信和调用，消除插件间的协议碎片化 | 插件接入只需实现标准接口，零定制适配代码；注册到可用 ≤ 200ms |
| G2 | **安全隔离**：插件运行在沙箱环境中，按最小权限原则授权，单插件崩溃不影响主系统运行时 | 插件崩溃后主系统 0 中断；沙箱逃逸测试 0 通过；权限未声明 API 不可调用 |
| G3 | **可扩展编排**：通过 SkillHub 实现技能注册、发现、调度和组合编排，支持动态加载与热更新 | 技能搜索结果 ≤ 50ms 返回；热更新不中断已激活插件服务；组合编排支持 ≥ 3 种模式 |

---

## 3. 用户故事

### 角色定义

- **插件开发者**：开发符合 MCP 规则的插件
- **系统集成者**：配置、管理和编排多个插件协同工作
- **平台运维者**：监控插件运行状态、排查故障

### 用户故事列表

| # | 角色 | 用户故事 |
|---|---|---|
| US1 | 插件开发者 | 作为一个插件开发者，我希望通过实现标准 MCP 接口就能注册我的插件，这样我不需要了解底层通信细节。 |
| US2 | 插件开发者 | 作为一个插件开发者，我希望在插件描述中声明名称、版本、依赖和所需权限，这样系统能自动管理加载顺序和权限授予。 |
| US3 | 插件开发者 | 作为一个插件开发者，我希望使用记忆模块存储和检索上下文信息，这样我的插件能跨会话保持状态。 |
| US4 | 插件开发者 | 作为一个插件开发者，我希望将插件的技能注册到 SkillHub，这样其他插件和用户可以发现并调用我的技能。 |
| US5 | 系统集成者 | 作为一个系统集成者，我希望通过关键词搜索发现可用技能，这样我能快速找到满足需求的插件能力。 |
| US6 | 系统集成者 | 作为一个系统集成者，我希望将多个技能组合编排执行（串联、并联、条件分支），这样我能构建复杂的工作流。 |
| US7 | 系统集成者 | 作为一个系统集成者，我希望通过 JSON Schema 校验插件配置，这样错误的配置能在加载前被发现。 |
| US8 | 系统集成者 | 作为一个系统集成者，我希望修改配置文件后系统自动热更新，这样我不需要手动重启服务。 |
| US9 | 平台运维者 | 作为一个平台运维者，我希望通过 CLI 和 REST API 管理插件的安装、启用、停用和卸载，这样我能灵活运维。 |
| US10 | 平台运维者 | 作为一个平台运维者，我希望查看完整的日志和监控指标，这样我能快速定位插件故障和性能瓶颈。 |
| US11 | 平台运维者 | 作为一个平台运维者，我希望插件崩溃时主系统不受影响且自动重试，这样系统的可用性得到保障。 |
| US12 | 插件开发者 | 作为一个插件开发者，我希望声明所需权限后系统按最小权限原则授权，这样我的插件不能越权访问其他插件的内存或文件。 |

---

## 4. 需求池

### P0 — 必须有（Must Have）

| ID | 需求 | 验收标准 |
|---|---|---|
| P0-1 | **MCP 规则接口定义** | 定义 `IMCPPlugin` 接口，包含 `register()`, `initialize()`, `activate()`, `invoke()`, `deactivate()`, `dispose()` 方法；所有插件必须实现该接口才能注册 |
| P0-2 | **插件注册流程** | 插件通过 manifest（名称、版本、依赖列表、权限声明、入口）完成注册；注册时自动解析依赖关系并确定加载顺序；重复注册同名同版本插件返回明确错误 |
| P0-3 | **JSON-RPC 2.0 通信** | 实现基于 JSON-RPC 2.0 的消息传输层，支持 stdio 和 SSE 两种传输方式；消息包含 `jsonrpc`, `id`, `method`, `params` 标准字段；支持请求、响应、通知三种消息类型 |
| P0-4 | **插件生命周期管理** | 实现完整的生命周期状态机：`registered → initialized → active → idle → disposed`；每个状态转换触发对应回调；非法状态转换抛出明确异常 |
| P0-5 | **安全沙箱隔离** | 插件代码运行在 Worker Thread 中实现进程级隔离；沙箱内仅暴露授权 API 白名单；插件间无法直接访问彼此内存空间 |
| P0-6 | **权限声明与授权** | 插件通过 manifest 声明所需权限（文件读写、网络访问、子进程、环境变量等）；系统按最小权限原则授权；未声明权限的 API 调用被拦截并记录日志 |
| P0-7 | **记忆模块 — Key-Value 存储** | 提供 `set(key, value)`, `get(key)`, `delete(key)`, `keys(pattern)` API；支持插件私有作用域和共享作用域；默认内存后端，可切换 SQLite 持久化 |
| P0-8 | **技能注册与发现** | 插件可注册技能（名称、描述、输入/输出 JSON Schema、handler 函数）；提供 `searchSkills(keyword)` 和 `listSkills()` 发现 API；搜索结果按相关度排序 |
| P0-9 | **容错与崩溃恢复** | 单插件崩溃被 Worker Thread 边界捕获，主系统继续运行；崩溃插件状态标记为 `error` 并记录日志；可配置自动重试策略（次数、间隔） |
| P0-10 | **管理 CLI** | 提供 CLI 工具：`plugin install <path>`, `plugin list`, `plugin enable <name>`, `plugin disable <name>`, `plugin info <name>`；CLI 输出格式化表格 |
| P0-11 | **REST API — 插件管理** | 提供 RESTful API：`GET /api/plugins`, `POST /api/plugins/:name/enable`, `POST /api/plugins/:name/disable`, `GET /api/plugins/:name`；返回标准 JSON 响应 |
| P0-12 | **日志记录** | 所有插件操作（注册、调用、崩溃、配置变更）写入结构化日志；日志级别：DEBUG / INFO / WARN / ERROR；支持日志输出到文件和 stdout |

### P1 — 应该有（Should Have）

| ID | 需求 | 验收标准 |
|---|---|---|
| P1-1 | **记忆模块 — SQLite 持久化** | 提供 SQLite 存储后端实现；数据持久化到本地文件；支持自动建表和索引；切换存储后端不需要修改业务代码 |
| P1-2 | **全局记忆作用域** | 支持全局记忆作用域，跨插件共享只读上下文；全局记忆写入需管理员权限 |
| P1-3 | **技能调度路由** | 提供 `invokeSkill(skillName, input)` 自动路由到对应 handler；输入参数按 JSON Schema 校验；路由失败返回明确错误 |
| P1-4 | **技能组合编排 — 串联** | 支持将多个技能串联执行，前一技能输出作为后一技能输入；支持管道式数据流 |
| P1-5 | **配置 Schema 校验** | 插件配置使用 JSON Schema 描述；加载配置时自动校验类型、必填项、枚举值；校验失败阻止加载并返回错误详情 |
| P1-6 | **环境变量覆盖** | 配置项支持 `ENV_VAR` 覆盖机制；优先级：环境变量 > 配置文件 > 默认值；支持类型自动转换 |
| P1-7 | **热更新** | 监听插件文件目录变更（fs.watch）；检测到变更后自动重载插件，不中断已有连接中的请求；重载失败回滚到上一个可用版本 |
| P1-8 | **REST API — 技能管理** | 提供 RESTful API：`GET /api/skills`, `POST /api/skills/:name/invoke`；返回技能执行结果 |
| P1-9 | **监控指标** | 暴露 `/api/metrics` 端点返回 Prometheus 格式指标：插件数量、调用次数、错误率、响应时间 P50/P99 |
| P1-10 | **插件依赖解析** | 注册时解析插件间依赖关系；按拓扑排序确定加载顺序；循环依赖检测并报错 |

### P2 — 可以有（Nice to Have）

| ID | 需求 | 验收标准 |
|---|---|---|
| P2-1 | **向量相似度检索** | 记忆模块支持向量存储和相似度检索；基于嵌入模型（如本地 sentence-transformers）；`searchSimilar(query, topK)` API |
| P2-2 | **技能组合编排 — 并联与条件分支** | 支持多技能并行执行和条件分支路由；提供可视化编排 DSL（JSON 格式） |
| P2-3 | **配置版本管理与回滚** | 配置变更记录版本历史；支持 `config rollback <version>` 回滚到指定版本 |
| P2-4 | **SSE 实时推送** | 通过 SSE 向客户端推送插件状态变更、技能调用结果等实时事件 |
| P2-5 | **插件市场索引** | 支持从远程插件市场索引拉取可用插件列表和元数据 |
| P2-6 | **Web 管理面板** | 提供简易 Web UI 展示插件列表、状态、日志和技能目录 |

---

## 5. API 设计概要

### 5.1 架构分层

```
┌─────────────────────────────────────────────────────┐
│                   CLI / REST API                      │
├─────────────────────────────────────────────────────┤
│              Plugin Manager (核心调度)                 │
│  ┌───────────┐ ┌──────────┐ ┌───────────────────┐  │
│  │ Lifecycle  │ │ Registry │ │ Dependency Resolver│  │
│  └───────────┘ └──────────┘ └───────────────────┘  │
├─────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌─────────────────────┐ │
│  │MCP Layer │ │ SkillHub │ │  Config Manager     │ │
│  │(JSON-RPC)│ │ (技能中心)│ │  (Schema + Hot Reload)│ │
│  └──────────┘ └──────────┘ └─────────────────────┘ │
├─────────────────────────────────────────────────────┤
│  ┌──────────────────┐ ┌──────────────────────────┐ │
│  │  Memory Module   │ │  Sandbox & Security      │ │
│  │ (KV + SQLite)     │ │  (Worker Thread + Perms) │ │
│  └──────────────────┘ └──────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### 5.2 MCP 规则接口

```typescript
interface IMCPPlugin {
  // 元数据
  readonly manifest: PluginManifest;

  // 生命周期
  onRegister(context: PluginContext): Promise<void>;
  onInitialize(): Promise<void>;
  onActivate(): Promise<void>;
  onDeactivate(): Promise<void>;
  onDispose(): Promise<void>;

  // 消息处理
  onInvoke(method: string, params: unknown): Promise<unknown>;
}

interface PluginManifest {
  name: string;
  version: string;
  dependencies: string[];
  permissions: Permission[];
  skills: SkillDescriptor[];
  configSchema: JSONSchema;
}

interface Permission {
  type: 'filesystem' | 'network' | 'process' | 'env' | 'memory';
  scope?: string;  // 限定范围，如路径前缀、域名列表
}
```

### 5.3 REST API 端点

| 方法 | 路径 | 描述 |
|---|---|---|
| GET | `/api/plugins` | 列出所有已注册插件及状态 |
| GET | `/api/plugins/:name` | 获取指定插件详情 |
| POST | `/api/plugins/install` | 安装插件（传入路径或包名） |
| POST | `/api/plugins/:name/enable` | 激活插件 |
| POST | `/api/plugins/:name/disable` | 停用插件 |
| DELETE | `/api/plugins/:name` | 卸载插件 |
| GET | `/api/skills` | 列出所有已注册技能 |
| GET | `/api/skills/search?q=keyword` | 搜索技能 |
| POST | `/api/skills/:name/invoke` | 调用技能 |
| POST | `/api/orchestrate` | 提交技能组合编排任务 |
| GET | `/api/memory/:scope/:key` | 读取记忆 |
| POST | `/api/memory/:scope` | 写入记忆 |
| GET | `/api/metrics` | 获取监控指标 |
| GET | `/api/logs?level=&tail=` | 查询日志 |

### 5.4 CLI 命令

```bash
plugin-mcp install <path>          # 安装插件
plugin-mcp list                    # 列出所有插件
plugin-mcp enable <name>           # 启用插件
plugin-mcp disable <name>          # 停用插件
plugin-mcp info <name>             # 查看插件详情
plugin-mcp skills search <keyword> # 搜索技能
plugin-mcp skills invoke <name> --input '{...}'  # 调用技能
plugin-mcp config validate <file>  # 校验配置
plugin-mcp config rollback <ver>   # 回滚配置
plugin-mcp logs --tail 100          # 查看日志
```

### 5.5 消息格式示例

```json
// 请求
{
  "jsonrpc": "2.0",
  "id": "req-001",
  "method": "skill.invoke",
  "params": {
    "skill": "data-transform",
    "input": { "source": "csv", "data": "..." }
  }
}

// 响应
{
  "jsonrpc": "2.0",
  "id": "req-001",
  "result": { "output": "transformed-data", "meta": { "duration": 12 } }
}

// 错误
{
  "jsonrpc": "2.0",
  "id": "req-001",
  "error": { "code": -32602, "message": "Invalid params: missing 'source'" }
}
```

---

## 6. 待确认问题

| # | 问题 | 建议答案 |
|---|---|---|
| Q1 | MCP 传输层 stdio 和 SSE 是否需要同时支持，还是优先实现一种？ | **建议**：P0 阶段优先实现 stdio（本地插件通信最简路径），SSE 作为 P1 补充（用于远程插件和实时推送场景）。两者共用同一 JSON-RPC 序列化层，传输层可插拔。 |
| Q2 | 安全沙箱使用 Worker Thread 还是 VM2/isolated-vm？ | **建议**：P0 使用 Node.js Worker Thread（原生支持、进程级隔离、通信通过 MessageChannel）。VM2 已废弃不推荐。isolated-vm 性能更好但 C++ 依赖重，作为 P2 优化项评估。 |
| Q3 | 向量相似度检索依赖嵌入模型，是否引入外部模型依赖？ | **建议**：列为 P2 可选项。若实现，优先使用纯 JS 的轻量嵌入方案（如 universal-sentence-encoder 的 TF.js 版本），避免引入 Python 或 C++ 依赖。不实现也不影响核心功能。 |
| Q4 | 技能组合编排的 DSL 格式是 JSON 还是 YAML？ | **建议**：内部用 JSON（与 JSON-RPC 一致，便于 API 传输）。CLI 交互可接受 YAML 并自动转换。编排 DSL 示例：`{ "type": "pipeline", "steps": [{ "skill": "A" }, { "skill": "B", "input": "$.steps[0].output" }] }` |
| Q5 | 插件配置热更新的监听粒度是文件级还是目录级？ | **建议**：目录级（`fs.watch` 监听插件配置目录），配合 debounce（500ms）避免频繁触发。单文件变更触发单插件重载，不影响其他插件。 |
| Q6 | 记忆模块的共享作用域如何防止插件间的数据污染？ | **建议**：共享作用域以命名空间隔离（如 `shared:<topic>`），写入需要声明 `memory:write:shared` 权限。全局作用域（`global:`）仅管理 CLI/API 可写，插件只读。 |
| Q7 | REST API 是否需要认证机制？ | **建议**：P0 阶段为本地工具，REST API 绑定 `127.0.0.1` 不暴露公网，不做认证。P1 阶段增加 API Key 认证（简单 token），P2 考虑 JWT。 |
| Q8 | 插件市场索引是否在初期就需要？ | **建议**：不需要。P2 可选项。初期插件通过本地路径安装（CLI `install <path>`），市场索引作为生态成熟后的增量功能。 |

---

## 7. 非功能需求

| 类别 | 要求 |
|---|---|
| **性能** | 插件注册 ≤ 200ms；技能搜索 ≤ 50ms；Key-Value 读写 ≤ 5ms（内存后端） |
| **可用性** | 单插件崩溃不影响主系统；插件重载不中断进行中的请求 |
| **可观测性** | 结构化日志（JSON 格式）；Prometheus 指标暴露；CLI 可查询实时状态 |
| **安全** | 最小权限原则；沙箱隔离；API 白名单；未声明权限的调用被拦截 |
| **兼容性** | Node.js ≥ 18；TypeScript ≥ 5.0；零外部网络依赖（SQLite 内嵌） |
| **可测试性** | Jest 单元测试覆盖率 ≥ 80%；沙箱隔离可独立测试；Mock 传输层 |

---

*文档版本: v1.0 | 创建者: Alice (Product Manager) | 日期: 2025-07-11*
