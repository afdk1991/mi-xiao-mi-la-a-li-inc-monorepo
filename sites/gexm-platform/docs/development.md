# 开发规范

## 1. 代码风格

### 1.1 命名规范

#### 文件命名
- 组件文件: `PascalCase` (如 `UserProfile.vue`)
- 页面文件: `kebab-case` (如 `user-profile.vue`)
- 工具函数: `camelCase` (如 `formatDate.js`)
- 常量定义: `UPPER_SNAKE_CASE`

#### 变量命名
- 变量/函数: `camelCase`
- 类/组件: `PascalCase`
- 常量: `UPPER_SNAKE_CASE`
- 布尔值: 使用 is/has/should 前缀

### 1.2 代码格式

- 缩进: 2 个空格
- 换行: LF (Unix 风格)
- 行尾: 无尾随空格
- 引号: 优先使用单引号
- 语句末尾: 不使用分号 (JavaScript/TypeScript)

### 1.3 注释规范

- 复杂逻辑必须添加注释
- 公共组件/函数必须添加 JSDoc 注释
- TODO/FIXME 标记需包含说明和负责人

## 2. Git 规范

### 2.1 分支管理

采用 Git Flow 分支模型：

| 分支 | 说明 |
|------|------|
| main | 主分支，生产代码 |
| develop | 开发分支 |
| feature/* | 功能分支 |
| hotfix/* | 热修复分支 |
| release/* | 发布分支 |

### 2.2 提交信息

采用 Conventional Commits 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**类型 (type)**:

| 类型 | 说明 |
|------|------|
| feat | 新功能 |
| fix | 修复bug |
| docs | 文档更新 |
| style | 代码格式调整 |
| refactor | 代码重构 |
| perf | 性能优化 |
| test | 测试相关 |
| chore | 构建/工具调整 |

**示例**:
```
feat(user): 添加用户头像上传功能

- 支持本地选择和拍照上传
- 图片自动压缩和裁剪
- 上传进度显示

Closes #123
```

## 3. 前端开发规范

### 3.1 Vue 组件规范

- 组件名使用 PascalCase
- 单文件组件结构: `<template>` → `<script>` → `<style>`
- Props 必须定义类型和默认值
- 事件名使用 kebab-case
- 优先使用 Composition API

### 3.2 样式规范

- 使用 SCSS 预处理器
- 遵循 BEM 命名规范 (可选)
- 颜色/尺寸使用变量定义
- 移动端优先，使用 rpx 单位
- 避免使用 ID 选择器

### 3.3 uni-app 跨端规范

- 使用条件编译处理平台差异
- 避免使用平台特有 API（必要时封装）
- 图片资源统一管理
- 小程序端注意包体大小

### 3.4 状态管理规范

- 使用 Pinia 进行状态管理
- Store 按功能模块划分
- State 只读，通过 Actions 修改
- 持久化存储需明确指定

## 4. 后端开发规范

### 4.1 代码结构

```
controllers/  # 控制层：处理请求响应
services/     # 服务层：业务逻辑
models/       # 模型层：数据操作
middleware/   # 中间件
routes/       # 路由定义
utils/        # 工具函数
config/       # 配置
```

### 4.2 API 设计规范

- 遵循 RESTful 设计原则
- 资源名使用复数形式
- HTTP 方法语义正确
- 统一响应格式
- 完善的错误码体系

### 4.3 数据库规范

- 表名使用小写字母和下划线
- 主键统一命名为 id
- 必须有 created_at / updated_at 字段
- 索引设计需考虑查询场景
- 使用参数化查询防止 SQL 注入

### 4.4 安全规范

- 输入参数必须校验
- 敏感数据加密存储
- 接口添加频率限制
- 错误信息不泄露内部细节
- 定期更新依赖版本

## 5. 测试规范

### 5.1 测试类型

- 单元测试: 工具函数、独立组件
- 集成测试: API 接口、业务流程
- E2E 测试: 关键用户路径
- 性能测试: 核心接口性能

### 5.2 测试覆盖率要求

- 核心业务逻辑: ≥ 80%
- 工具函数: ≥ 90%
- 整体覆盖率: ≥ 70%

## 6. 性能规范

### 6.1 前端性能

| 指标 | 目标值 |
|------|--------|
| APP 启动时间 | < 3 秒 |
| 页面切换 | < 0.5 秒 |
| H5 首屏加载 | < 2 秒 |
| 小程序主包 | < 2MB |

### 6.2 后端性能

| 指标 | 目标值 |
|------|--------|
| 接口响应时间 | < 200ms |
| 并发支持 | ≥ 1000 QPS |
| 数据库查询 | < 50ms |

## 7. 文档规范

- 代码变更需同步更新文档
- API 变更需更新接口文档
- 重要决策需记录设计思路
- 文档保持与代码同步

## 8. 开发环境搭建

### 8.1 环境要求

| 依赖 | 版本要求 |
|------|----------|
| Node.js | >= 16.0.0 |
| npm | >= 7.0.0 |
| HBuilderX | >= 3.6.0 (小程序开发) |

### 8.2 安装步骤

```bash
# 1. 克隆项目
git clone <repository-url>
cd gexm

# 2. 安装根依赖
npm install

# 3. 安装子包依赖
cd packages/server
npm install

cd ../app
npm install

cd ../desktop
npm install
```

### 8.3 配置文件

**后端配置** (`packages/server/.env`):
```
PORT=3000
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
DB_PATH=data/example_db.db
UPLOAD_PATH=uploads
LOG_PATH=logs
```

**前端配置** (`packages/app/.env`):
```
VUE_APP_API_BASE_URL=http://localhost:3000/api
VUE_APP_WS_URL=ws://localhost:3000
```

## 9. 功能开发流程

### 9.1 添加新页面

1. 在 `packages/app/src/pages` 创建页面目录和文件
2. 在 `pages.json` 中注册页面路由
3. 创建对应组件和样式
4. 添加 API 调用逻辑
5. 更新状态管理 (如需)

### 9.2 添加新接口

1. 在 `packages/server/src/routes` 创建路由文件
2. 在 `packages/server/src/controllers` 创建控制器
3. 在 `packages/server/src/models` 创建数据模型
4. 在 `packages/server/src/services` 创建业务逻辑
5. 更新 API 文档

### 9.3 添加新组件

1. 在 `packages/app/src/components` 创建组件目录
2. 编写组件代码，包含 template、script、style
3. 在 pages.json 中配置 easycom 自动导入
4. 在页面中直接使用

### 9.4 开发流程

```
需求分析 → 设计方案 → 分支开发 → 代码审查 → 测试验证 → 合并发布
```

## 10. 调试方法

### 10.1 前端调试

**H5 端**:
- 使用 Chrome DevTools (F12)
- 开启 Vue DevTools 插件
- 查看 Network 面板监控 API 请求

**小程序端**:
- 使用 HBuilderX 内置调试工具
- 真机调试模式
- 查看 Console 和 Network

**APP 端**:
- 使用 Chrome DevTools 远程调试
- 通过 `uni.showToast` 输出调试信息

### 10.2 后端调试

- 使用 VS Code 调试器附加进程
- 在关键位置添加 `console.log`
- 查看日志文件 `packages/server/logs/`

### 10.3 网络调试

- 使用 Postman 测试 API 接口
- 配置 Vite proxy 转发请求
- 使用 Wireshark 抓包分析

### 10.4 常见问题排查

| 问题现象 | 可能原因 | 解决方法 |
|----------|----------|----------|
| 接口 404 | 路由未注册或路径错误 | 检查 routes 目录和 app.js |
| 认证失败 | Token 过期或无效 | 重新登录获取新 Token |
| 页面白屏 | 组件加载失败 | 检查 Console 错误信息 |
| 数据库操作失败 | 表不存在或字段错误 | 检查模型定义和数据库表 |
| 跨域问题 | CORS 配置错误 | 检查 middleware/cors.js |

## 11. 代码审查

### 11.1 审查清单

- [ ] 功能是否符合需求
- [ ] 代码逻辑是否正确
- [ ] 是否有性能问题
- [ ] 是否存在安全隐患
- [ ] 命名是否规范
- [ ] 是否有足够注释
- [ ] 是否包含测试用例
- [ ] 文档是否更新

### 11.2 审查原则

- 关注设计和架构
- 检查边界情况
- 确保代码可维护性
- 建设性反馈，尊重作者
