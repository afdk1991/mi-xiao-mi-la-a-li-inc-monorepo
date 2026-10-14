# 拉阿狸WordPress全栈项目开发计划

## 1. 环境搭建

### 1.1 前置要求
- Node.js 18+
- npm 9+
- PHP 8.1+
- Composer 2+
- MySQL 5.7+

### 1.2 安装步骤
```bash
# 1. 克隆项目
cd /www/wwwroot/laal.top

# 2. 安装所有依赖
npm run install:all

# 3. 安装WordPress依赖
composer install

# 4. 配置环境变量
cp app/backend/.env.example app/backend/.env
cp wp-config-sample.php wp-config.php

# 5. 配置数据库连接
# 编辑wp-config.php和app/backend/.env文件，设置数据库连接信息
```

## 2. 开发流程

### 2.1 启动开发服务器
```bash
# 启动前端开发服务器
npm run start:frontend

# 启动后端开发服务器
npm run start:backend

# 同时启动前后端开发服务器
npm run start:all
```

### 2.2 代码开发

#### 前端开发
- 前端代码位于 `app/frontend/src`
- 使用React + TypeScript + Taro框架开发
- 支持多平台开发：Web、H5、微信小程序、支付宝小程序、抖音小程序、React Native
- 使用Vite进行开发构建

#### 后端开发
- 后端代码位于 `app/backend/src`
- 使用NestJS + TypeORM开发RESTful API
- 支持JWT认证
- 使用TypeScript开发

#### WordPress开发
- 主题开发：`wp-content/themes/`
- 插件开发：`wp-content/plugins/`
- 使用PHP 8.1开发

## 3. 多平台开发注意事项

### 3.1 前端多平台支持
| 平台 | 开发命令 | 构建命令 |
|------|----------|----------|
| Web | `npm run dev` | `npm run build` |
| H5 | `npm run dev:h5` | `npm run build:h5` |
| 微信小程序 | `npm run dev:weapp` | `npm run build:weapp` |
| 支付宝小程序 | `npm run dev:alipay` | `npm run build:alipay` |
| 抖音小程序 | `npm run dev:tt` | `npm run build:tt` |
| React Native | `npm run dev:rn` | `npm run build:rn` |

### 3.2 代码共享
- 使用`app/shared`目录存放前后端共享代码
- 共享类型定义、工具函数等

## 4. 测试和代码质量

### 4.1 运行测试
```bash
# 运行所有测试
npm run test

# 运行前端测试
npm run test:frontend

# 运行后端测试
npm run test:backend
```

### 4.2 代码质量检查
```bash
# 运行ESLint检查
npm run lint

# 自动修复ESLint问题
npm run lint:fix

# 格式化代码
cd app/frontend && npm run format
```

## 5. 构建和部署

### 5.1 构建项目
```bash
# 构建所有项目
npm run build

# 构建前端
npm run build:frontend

# 构建后端
npm run build:backend
```

### 5.2 部署流程
1. 构建前端和后端
2. 将构建产物部署到服务器
3. 配置Web服务器（Apache/Nginx）指向WordPress根目录
4. 配置API网关指向后端服务

## 6. CI/CD流程
- 使用GitHub Actions进行CI/CD
- 自动运行测试和构建
- 自动部署到生产环境

## 7. 开发规范

### 7.1 前端规范
- 使用React Hooks
- 使用TypeScript严格模式
- 遵循ESLint和Prettier规范
- 组件化开发
- 使用Redux Toolkit进行状态管理

### 7.2 后端规范
- 使用NestJS最佳实践
- 遵循RESTful API设计规范
- 使用TypeORM进行数据库操作
- 实现JWT认证
- 添加适当的日志记录

### 7.3 WordPress规范
- 遵循WordPress编码规范
- 使用Composer管理依赖
- 实现安全的代码
- 支持响应式设计

## 8. 项目管理

### 8.1 分支管理
- `main`：主分支，用于生产环境
- `develop`：开发分支，用于集成测试
- `feature/*`：特性分支，用于开发新功能
- `bugfix/*`：bug修复分支，用于修复bug

### 8.2 提交规范
- 使用语义化提交信息
- 每个提交对应一个功能或bug修复
- 提交前运行测试和代码质量检查

## 9. 文档管理
- 项目文档位于 `docs/` 目录
- 及时更新文档，包括API文档、开发指南等

## 10. 监控和维护
- 配置日志监控
- 定期备份数据库和文件
- 定期更新依赖包
- 定期进行安全审计

## 11. 开发工具推荐
- IDE：VS Code
- 插件：ESLint、Prettier、TypeScript、PHP Intelephense
- 调试工具：Chrome DevTools、微信开发者工具、Taro DevTools

## 12. 常见问题和解决方案
- 数据库连接问题：检查wp-config.php和.env文件中的数据库配置
- 依赖冲突：使用npm install --legacy-peer-deps解决
- 构建失败：检查Node.js版本和依赖包版本
- 跨域问题：在后端配置CORS

以上是拉阿狸WordPress全栈项目的开发计划，遵循此计划可以确保项目的高效开发和维护。