# Gexm 全平台应用系统

一套具备统一用户体验和功能一致性的全平台应用系统，采用 uni-app + Vue3 + Express.js 技术栈，实现"一套代码，多端运行"。支持移动端 APP、多平台小程序、H5 网页和 PC 桌面端，代码复用率高达 95%。

## 系统组成

| 平台 | 技术方案 | 支持范围 |
|------|----------|----------|
| 移动端 APP | uni-app + 原生插件 | iOS 12.0+, Android 8.0+ |
| 小程序 | uni-app 多端编译 | 微信、支付宝、百度、抖音 |
| PC 桌面端 | Electron + uni-app H5 | Windows 10+, macOS 10.14+, Ubuntu 18.04+ |
| H5 网页 | uni-app H5 + PWA | Chrome、Firefox、Safari、Edge 最新两版 |

## 项目结构

```
gexm/
├── packages/
│   ├── server/          # 后端服务 (Express + SQLite + JWT)
│   │   ├── src/
│   │   │   ├── controllers/  # 控制器
│   │   │   ├── services/     # 业务逻辑
│   │   │   ├── models/       # 数据模型
│   │   │   ├── routes/       # 路由定义
│   │   │   ├── middleware/   # 中间件
│   │   │   ├── utils/        # 工具函数
│   │   │   └── config/       # 配置文件
│   │   ├── data/             # 数据库文件
│   │   ├── uploads/          # 上传文件
│   │   └── logs/             # 日志文件
│   ├── app/             # uni-app 前端应用 (多端适配)
│   │   ├── src/
│   │   │   ├── pages/        # 页面目录
│   │   │   ├── components/   # 组件目录
│   │   │   ├── stores/       # Pinia 状态管理
│   │   │   ├── api/          # API 请求封装
│   │   │   ├── utils/        # 工具函数
│   │   │   └── static/       # 静态资源
│   ├── desktop/         # Electron 桌面端
│   │   ├── src/
│   │   │   ├── main/         # 主进程代码
│   │   │   └── preload/      # 预加载脚本
│   │   └── dist/             # uni-app H5 构建产物
│   └── shared/          # 共享代码库 (类型、工具、常量)
├── docs/                # 技术文档
│   ├── architecture.md  # 架构设计文档
│   ├── api.md           # API 接口文档
│   ├── development.md   # 开发规范文档
│   └── deployment.md    # 部署指南文档
├── deploy/              # 部署配置
│   ├── nginx/           # Nginx 配置
│   ├── scripts/         # 部署脚本
│   └── monitoring/      # 监控配置
├── docker/              # Docker 配置
│   ├── nginx/           # Docker Nginx 配置
│   └── redis/           # Redis 配置
└── package.json         # 根配置 (monorepo workspaces)
```

## 技术栈

### 前端
- **框架**: Vue 3 + Composition API
- **跨端**: uni-app (Vue3 版)
- **状态管理**: Pinia
- **UI 组件**: uView Plus / 自定义组件库
- **构建工具**: Vite
- **样式**: SCSS

### 后端
- **框架**: Express.js
- **数据库**: SQLite (开发) / 支持 MySQL (生产)
- **认证**: JWT + Refresh Token
- **ORM**: better-sqlite3
- **实时通信**: WebSocket

### 桌面端
- **框架**: Electron
- **渲染层**: uni-app H5 构建产物
- **进程通信**: IPC Main / Renderer

## 核心功能

### 用户模块
- 用户注册、登录、密码找回
- JWT 双 Token 认证机制
- 用户资料管理、头像上传

### 商城模块
- 商品展示、分类浏览、搜索
- 购物车管理、商品收藏
- 订单创建、支付、物流追踪
- 收货地址管理、商品评价

### IM 即时通讯
- 一对一聊天
- AI 助手对话
- 消息状态同步
- 实时消息推送

### 通知模块
- 系统通知、消息通知
- 通知状态管理
- 推送通知集成

### 数据同步
- 离线数据存储
- 网络恢复后自动同步
- 冲突解决机制

## 快速开始

### 环境要求
- Node.js >= 18.0.0
- npm >= 9.0.0
- HBuilderX >= 3.6.0 (小程序开发)

### 安装依赖

```bash
# 安装根依赖
npm install

# 安装子包依赖
cd packages/server && npm install
cd ../app && npm install
cd ../desktop && npm install
```

### 开发模式

```bash
# 方式一：并行启动所有服务
npm run dev

# 方式二：分别启动
npm run dev:server      # 后端服务 (http://localhost:3000)
npm run dev:app-h5      # H5 开发 (http://localhost:5173)
npm run dev:app-mp-weixin  # 微信小程序开发
npm run dev:desktop     # 桌面端开发
```

### 生产构建

```bash
npm run build:server        # 构建后端
npm run build:app-h5        # 构建 H5
npm run build:app-mp-weixin # 构建微信小程序
npm run build:desktop       # 构建桌面端
```

## 性能指标

| 指标 | 目标值 |
|------|--------|
| APP 启动时间 | < 3 秒 |
| 页面切换 | < 0.5 秒 |
| H5 首屏加载 | < 2 秒 |
| 小程序主包体积 | < 2MB |
| 接口响应时间 | < 200ms |
| 并发支持 | ≥ 1000 QPS |

## 开发规范

- **代码风格**: ESLint + Prettier
- **Git 规范**: Git Flow + Conventional Commits
- **API 设计**: RESTful 风格，统一响应格式
- **安全规范**: JWT 认证、输入校验、频率限制

## 文档

详细文档请查看 [docs/](./docs) 目录：
- [架构设计](./docs/architecture.md) - 系统架构、模块划分、技术选型
- [API 文档](./docs/api.md) - 接口定义、请求参数、响应格式
- [开发规范](./docs/development.md) - 代码规范、开发流程、调试方法
- [部署指南](./docs/deployment.md) - 环境配置、部署步骤、运维管理

## License

MIT