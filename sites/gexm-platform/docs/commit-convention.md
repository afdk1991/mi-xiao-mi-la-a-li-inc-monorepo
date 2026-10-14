# 代码提交规范

本文档定义了 GEXM 项目的代码提交规范，采用 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/v1.0.0/) 规范。

## 概述

Conventional Commits 是一种用于给提交信息增加人机可读含义的规范。它通过在提交信息中指定类型、范围和描述，使得版本历史更加清晰易读，同时也支持自动化工具（如自动生成 CHANGELOG、自动版本号管理等）。

## Commit Message 格式

每条提交信息由 **头部（header）**、**正文（body）** 和 **页脚（footer）** 组成：

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 1. 头部（Header）

头部是必填的，格式为：

```
<type>(<scope>): <subject>
```

#### type（类型）

必填项，用于说明提交的类型。支持以下类型：

| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat: 添加用户登录功能` |
| `fix` | 修复 bug | `fix: 修复登录页面验证码不显示的问题` |
| `docs` | 文档变更 | `docs: 更新 API 文档` |
| `style` | 代码格式（不影响代码运行） | `style: 调整代码缩进和空格` |
| `refactor` | 重构（既不是新增功能，也不是修复 bug） | `refactor: 重构用户认证模块` |
| `perf` | 性能优化 | `perf: 优化商品列表加载速度` |
| `test` | 增加测试或修正测试 | `test: 添加用户注册的单元测试` |
| `build` | 构建系统或外部依赖的变更 | `build: 更新 webpack 配置` |
| `ci` | CI 配置文件和脚本的变更 | `ci: 更新 GitHub Actions 工作流` |
| `chore` | 其他杂项（不修改 src 或 test） | `chore: 更新 .gitignore` |
| `revert` | 撤销之前的提交 | `revert: 撤销 feat: 添加用户登录功能` |

#### scope（范围）

可选项，用于说明提交影响的范围。例如：

- `auth` - 认证模块
- `product` - 商品模块
- `order` - 订单模块
- `server` - 后端服务
- `app` - 前端应用
- `desktop` - 桌面端应用
- `shared` - 共享模块

示例：

```
feat(auth): 添加用户注册功能
fix(server): 修复订单创建接口的并发问题
```

#### subject（主题）

必填项，是对提交目的的简短描述，不超过 50 个字符。

- 使用祈使句（如 "添加" 而非 "添加了"）
- 首字母小写
- 结尾不加句号

### 2. 正文（Body）

可选项，用于详细描述提交的内容。可以分成多行，每行不超过 72 个字符。

正文应该解释提交的**原因**和**修改内容**，以及可能的**影响**。

示例：

```
feat(auth): 添加用户注册功能

- 添加用户注册页面和表单
- 实现注册接口调用
- 添加表单验证逻辑
- 支持邮箱和手机号两种注册方式
```

### 3. 页脚（Footer）

可选项，用于放置一些元信息，比如关联的 Issue 编号、破坏性变更说明等。

#### 关联 Issue

```
Closes #123
Refs #456, #789
```

#### 破坏性变更（BREAKING CHANGE）

如果提交包含破坏性变更，需要在页脚中以 `BREAKING CHANGE:` 开头，后面跟变更说明。

```
BREAKING CHANGE: 用户认证接口已重构，旧版接口不再支持。

迁移指南：
- 使用 /api/v2/auth/login 替代 /api/auth/login
- 请求参数格式已变更，请参考最新文档
```

## 常见示例

### 新功能

```
feat(cart): 添加购物车商品数量修改功能

- 支持直接输入数量修改
- 支持加减按钮调整数量
- 数量变更时自动计算总价
- 添加数量上限验证

Closes #42
```

### 修复 Bug

```
fix(order): 修复订单详情页地址显示错误的问题

问题原因：地址信息在序列化时丢失了省市区的详细名称
解决方案：在订单查询时关联地址表获取完整地址信息

Closes #128
```

### 文档更新

```
docs: 更新部署文档

- 添加 Docker 部署说明
- 更新环境变量配置说明
- 添加 Nginx 反向代理配置示例
```

### 代码格式

```
style: 统一代码缩进为 2 空格

- 所有 .js 文件统一使用 2 空格缩进
- 所有 .vue 文件统一使用 2 空格缩进
- 调整部分不符合规范的代码格式
```

### 重构

```
refactor(shared): 重构工具函数模块

- 将工具函数按功能分类到不同文件
- 添加 TypeScript 类型定义
- 优化部分函数的实现逻辑
- 保持向后兼容
```

### 性能优化

```
perf(product): 优化商品列表查询性能

- 添加数据库索引
- 优化 SQL 查询语句
- 实现分页查询
- 列表加载速度提升约 60%
```

## 工具链配置

项目已配置以下工具来确保提交规范的执行：

### 1. Husky

Git 钩子工具，用于在特定 Git 事件触发时执行脚本。

- **pre-commit**: 提交前运行 lint-staged
- **commit-msg**: 校验提交信息格式

### 2. lint-staged

对暂存区的文件运行 linters，确保提交的代码符合规范。

- `*.js` 文件：运行 `eslint --fix`
- `*.vue` 文件：运行 `eslint --fix`
- `*.json` / `*.md` 文件：运行 `prettier --write`

### 3. Commitlint

校验提交信息是否符合 Conventional Commits 规范。

配置文件：`commitlint.config.js`

## 安装与启用

### 首次安装依赖

```bash
npm install
```

### 启用 Husky 钩子

`npm install` 后会自动执行 `prepare` 脚本启用 Husky。如果需要手动启用：

```bash
npm run prepare
```

## 跳过校验（不推荐）

在特殊情况下，可以使用 `--no-verify` 参数跳过校验，但请确保你的提交符合规范：

```bash
git commit --no-verify -m "..."
```

**注意**：请谨慎使用此选项，只有在紧急情况下才考虑使用。

## 相关文档

- [Conventional Commits 规范（中文）](https://www.conventionalcommits.org/zh-hans/v1.0.0/)
- [Husky 官方文档](https://typicode.github.io/husky/)
- [lint-staged 官方文档](https://github.com/okonet/lint-staged)
- [Commitlint 官方文档](https://commitlint.js.org/)
