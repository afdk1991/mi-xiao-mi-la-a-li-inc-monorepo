# 贡献指南

感谢您对 Gexm Platform 项目的关注！本文档指导您如何参与项目开发。

## 开发环境准备

1. Node.js >= 18.0.0
2. npm >= 9.0.0
3. 克隆仓库并安装依赖：
   ```bash
   git clone <repository-url>
   cd gexm
   npm install
   ```

## 开发流程

### 1. 创建分支
```bash
git checkout -b feature/your-feature-name
```

### 2. 开发与调试
- 前端：`npm run dev:app-h5`
- 后端：`npm run dev:server`
- SDK：`npm run dev --workspace=@gexm/sdk`

### 3. 代码规范
- 遵循 ESLint 配置（`eslint.config.js`）
- TypeScript 代码需通过类型检查
- 提交前运行 `npm run lint`

### 4. 提交规范
遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：
- `feat:` 新功能
- `fix:` Bug 修复
- `docs:` 文档变更
- `style:` 代码格式（不影响功能）
- `refactor:` 重构
- `test:` 测试
- `chore:` 构建/工具变更

### 5. 提交 Pull Request
- PR 标题遵循提交规范
- 描述清晰的变更内容
- 确保 CI 通过

## 项目结构

```
gexm/
├── packages/
│   ├── app/          # uni-app 多端应用
│   ├── server/       # Express 后端服务
│   ├── sdk/          # 跨平台适配 SDK
│   ├── shared/       # 共享类型和工具
│   └── desktop/      # Electron 桌面端
├── docs/             # 项目文档
├── deploy/           # 部署配置
└── docker/           # Docker 配置
```

## 测试

```bash
# 运行所有测试
npm run test --workspaces --if-present

# 类型检查
npm run typecheck --workspaces --if-present
```

## 问题反馈

- 提交 Issue 描述问题或建议
- 安全漏洞请私下联系维护者，勿公开提交
