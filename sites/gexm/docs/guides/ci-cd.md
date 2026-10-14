# CI/CD 方案

## 1. 概述

本文档描述 Gexm 电商项目的持续集成/持续部署（CI/CD）方案，基于 GitHub Actions 实现自动化代码检查、测试、构建和部署流程。

### 1.1 CI/CD 流程总览

```
代码提交
    │
    ▼
代码规范检查 (Lint + Format)
    │
    ▼
自动化测试 (Unit Tests)
    │
    ▼
构建验证 (Build Check)
    │
    ├─ main 分支 ────────────► 部署到测试环境
    │                             │
    │                             ▼
    │                        人工审批
    │                             │
    │                             ▼
    └─ 打 Tag (vX.Y.Z) ───────► 部署到生产环境
```

### 1.2 分支策略

| 分支 | 用途 | 触发 CI | 自动部署 |
|------|------|---------|----------|
| `main` | 主分支，稳定代码 | ✅ | 测试环境 |
| `develop` | 开发分支 | ✅ | - |
| `feature/*` | 功能分支 | ✅ | - |
| `fix/*` | 修复分支 | ✅ | - |
| `hotfix/*` | 热修复分支 | ✅ | - |
| Tag `v*` | 发布版本 | ✅ | 生产环境 |

---

## 2. GitHub Actions 工作流

### 2.1 目录结构

在项目根目录创建以下文件：

```
.github/
└── workflows/
    ├── ci.yml              # 持续集成（代码检查、测试、构建）
    ├── deploy-staging.yml  # 部署到测试环境
    └── deploy-production.yml # 部署到生产环境
```

### 2.2 持续集成工作流 (ci.yml)

```yaml
name: CI

on:
  push:
    branches: [main, develop, 'feature/*', 'fix/*', 'hotfix/*']
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    name: 代码规范检查
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout 代码
        uses: actions/checkout@v4
      
      - name: 设置 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: 安装依赖
        run: npm ci
      
      - name: ESLint 检查
        run: npm run lint
      
      - name: Prettier 格式检查
        run: npm run format:check

  test:
    name: 自动化测试
    runs-on: ubuntu-latest
    needs: lint
    
    steps:
      - name: Checkout 代码
        uses: actions/checkout@v4
      
      - name: 设置 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: 安装依赖
        run: npm ci
      
      - name: 运行测试
        run: npm run test
        env:
          NODE_ENV: test
      
      - name: 上传测试覆盖率
        if: success()
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: packages/server/coverage/
          retention-days: 7

  build-h5:
    name: 构建 H5 前端
    runs-on: ubuntu-latest
    needs: test
    
    steps:
      - name: Checkout 代码
        uses: actions/checkout@v4
      
      - name: 设置 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: 安装依赖
        run: npm ci
      
      - name: 构建 H5
        run: npm run build:app-h5
        env:
          VITE_API_BASE_URL: /api
          VITE_APP_TITLE: Gexm
          VITE_APP_VERSION: ${{ github.sha }}
      
      - name: 上传构建产物
        uses: actions/upload-artifact@v4
        with:
          name: h5-dist
          path: packages/app/dist/build/h5/
          retention-days: 7

  build-server:
    name: 验证后端构建
    runs-on: ubuntu-latest
    needs: test
    
    steps:
      - name: Checkout 代码
        uses: actions/checkout@v4
      
      - name: 设置 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: 安装依赖
        run: npm ci
      
      - name: 验证后端可启动
        run: |
          cd packages/server
          timeout 5 node src/server.js || test $? -eq 124
        env:
          NODE_ENV: test
          PORT: 3000
          JWT_SECRET: test_secret_key_for_ci_only
          JWT_REFRESH_SECRET: test_refresh_key_for_ci_only
```

### 2.3 部署到测试环境 (deploy-staging.yml)

```yaml
name: Deploy Staging

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build-and-deploy:
    name: 构建并部署到测试环境
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.yourdomain.com
    
    steps:
      - name: Checkout 代码
        uses: actions/checkout@v4
      
      - name: 设置 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: 安装依赖
        run: npm ci
      
      - name: 运行测试
        run: npm run test
        env:
          NODE_ENV: test
      
      - name: 构建 H5 前端
        run: npm run build:app-h5
        env:
          VITE_API_BASE_URL: /api
          VITE_APP_TITLE: Gexm (Staging)
          VITE_APP_VERSION: ${{ github.sha }}
      
      - name: 部署到服务器
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.STAGING_HOST }}
          username: ${{ secrets.STAGING_USERNAME }}
          key: ${{ secrets.STAGING_SSH_KEY }}
          port: ${{ secrets.STAGING_PORT || 22 }}
          script: |
            set -e
            
            # 进入项目目录
            cd /opt/gexm-staging
            
            # 拉取最新代码
            git fetch origin
            git reset --hard origin/main
            
            # 安装依赖
            npm ci
            
            # 构建前端
            npm run build:app-h5
            
            # 复制到 Nginx 目录
            rsync -av --delete packages/app/dist/build/h5/ /var/www/gexm-staging/
            
            # 重启后端服务
            pm2 reload gexm-server-staging
            
            # 验证服务状态
            sleep 3
            curl -f http://localhost:3001/api/health
            
            echo "部署完成: $(date '+%Y-%m-%d %H:%M:%S')"
      
      - name: 部署通知
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 测试环境部署 ${{ job.status }}
          fields: repo,message,commit,author,action,eventName,ref,workflow
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

### 2.4 部署到生产环境 (deploy-production.yml)

```yaml
name: Deploy Production

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

jobs:
  build:
    name: 构建生产版本
    runs-on: ubuntu-latest
    
    outputs:
      version: ${{ steps.get-version.outputs.version }}
    
    steps:
      - name: Checkout 代码
        uses: actions/checkout@v4
      
      - name: 获取版本号
        id: get-version
        run: |
          VERSION=${GITHUB_REF#refs/tags/v}
          echo "version=$VERSION" >> $GITHUB_OUTPUT
          echo "版本号: $VERSION"
      
      - name: 设置 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: 安装依赖
        run: npm ci
      
      - name: 运行测试
        run: npm run test
        env:
          NODE_ENV: test
      
      - name: 构建 H5 前端
        run: npm run build:app-h5
        env:
          VITE_API_BASE_URL: /api
          VITE_APP_TITLE: Gexm
          VITE_APP_VERSION: ${{ steps.get-version.outputs.version }}
      
      - name: 上传前端构建产物
        uses: actions/upload-artifact@v4
        with:
          name: h5-production
          path: packages/app/dist/build/h5/
          retention-days: 30
      
      - name: 打包后端代码
        run: |
          mkdir -p release
          tar czf release/server.tar.gz \
            packages/server/src \
            packages/server/package.json \
            packages/server/package-lock.json \
            packages/shared
      
      - name: 上传后端构建产物
        uses: actions/upload-artifact@v4
        with:
          name: server-production
          path: release/server.tar.gz
          retention-days: 30

  deploy:
    name: 部署到生产环境
    runs-on: ubuntu-latest
    needs: build
    environment:
      name: production
      url: https://www.yourdomain.com
    
    steps:
      - name: 下载前端构建产物
        uses: actions/download-artifact@v4
        with:
          name: h5-production
          path: h5-dist
      
      - name: 下载后端构建产物
        uses: actions/download-artifact@v4
        with:
          name: server-production
          path: server-dist
      
      - name: 部署到生产服务器
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.PRODUCTION_HOST }}
          username: ${{ secrets.PRODUCTION_USERNAME }}
          key: ${{ secrets.PRODUCTION_SSH_KEY }}
          port: ${{ secrets.PRODUCTION_PORT || 22 }}
          script: |
            set -e
            
            VERSION="${{ needs.build.outputs.version }}"
            BACKUP_DIR="/opt/gexm-backups/$(date +%Y%m%d_%H%M%S)"
            APP_DIR="/opt/gexm"
            
            echo "开始部署版本: $VERSION"
            echo "备份目录: $BACKUP_DIR"
            
            # 1. 创建备份目录
            mkdir -p $BACKUP_DIR
            
            # 2. 备份当前版本
            cp -r $APP_DIR/packages/app/dist/build/h5 $BACKUP_DIR/h5
            cp -r $APP_DIR/packages/server/src $BACKUP_DIR/server-src
            
            # 3. 备份数据库
            cp $APP_DIR/packages/server/data/gexm.db $BACKUP_DIR/gexm.db
            
            # 4. 更新前端
            rsync -av --delete /tmp/h5-dist/ $APP_DIR/packages/app/dist/build/h5/
            
            # 5. 更新后端
            cd $APP_DIR
            git fetch origin
            git reset --hard v$VERSION
            
            # 6. 安装依赖
            npm ci
            
            # 7. 重启服务
            pm2 reload gexm-server
            
            # 8. 健康检查
            sleep 5
            curl -f http://localhost:3000/api/health
            
            echo "生产环境部署完成: $VERSION"
            echo "部署时间: $(date '+%Y-%m-%d %H:%M:%S')"
      
      - name: 部署通知
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: |
            🚀 生产环境部署 ${{ job.status }}
            版本: ${{ needs.build.outputs.version }}
          fields: repo,message,commit,author,action,eventName,ref,workflow
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

---

## 3. 代码提交规范检查

### 3.1 Commit Message 规范

项目采用 Conventional Commits 规范，使用 Husky + commitlint 进行检查。

### 3.2 配置 Husky 和 commitlint

安装依赖：

```bash
npm install -D husky @commitlint/cli @commitlint/config-conventional
```

创建 `commitlint.config.js`：

```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert'
      ]
    ],
    'subject-full-stop': [0, 'never'],
    'subject-case': [0, 'never'],
    'header-max-length': [2, 'always', 100]
  }
};
```

在 `package.json` 中添加脚本：

```json
{
  "scripts": {
    "prepare": "husky install"
  }
}
```

初始化 Husky 并添加钩子：

```bash
# 初始化 Husky
npm run prepare

# 添加 commit-msg 钩子
npx husky add .husky/commit-msg 'npx --no -- commitlint --edit "$1"'

# 添加 pre-commit 钩子
npx husky add .husky/pre-commit 'npm run lint && npm run format:check'
```

### 3.3 Commit 类型说明

| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat: 添加购物车功能` |
| `fix` | Bug 修复 | `fix: 修复登录超时问题` |
| `docs` | 文档更新 | `docs: 更新部署文档` |
| `style` | 代码格式调整 | `style: 统一代码风格` |
| `refactor` | 代码重构 | `refactor: 重构用户模块` |
| `perf` | 性能优化 | `perf: 优化商品列表加载速度` |
| `test` | 测试相关 | `test: 添加订单模块测试` |
| `build` | 构建相关 | `build: 更新依赖版本` |
| `ci` | CI/CD 相关 | `ci: 添加 GitHub Actions 配置` |
| `chore` | 杂项 | `chore: 更新 .gitignore` |
| `revert` | 回滚 | `revert: 回滚上一次提交` |

---

## 4. 自动化测试执行

### 4.1 测试框架

- **后端单元测试**: Jest + Supertest
- **测试覆盖率**: Istanbul (Jest 内置)

### 4.2 测试配置

后端 `packages/server/jest.config.js`：

```javascript
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/*.test.js'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'clover'],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  },
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
  testTimeout: 10000
};
```

### 4.3 本地运行测试

```bash
# 运行所有测试
npm run test

# 运行测试并监听文件变化
npm run test -- --watch

# 运行特定测试文件
npm run test -- auth.test.js

# 生成覆盖率报告
npm run test -- --coverage
```

### 4.4 CI 中的测试

GitHub Actions 会在每次 push 和 PR 时自动运行测试：
- 测试失败会阻止 PR 合并
- 测试覆盖率报告会作为 artifact 上传
- 可设置覆盖率阈值，低于阈值时 CI 失败

---

## 5. 自动部署流程

### 5.1 测试环境部署

**触发条件**: 代码合并到 `main` 分支

**部署流程**:
1. 代码检查（Lint + Format）
2. 运行自动化测试
3. 构建 H5 前端
4. SSH 到测试服务器执行部署脚本
5. 健康检查验证
6. 发送部署通知

**回滚方案**: 
- 保留最近 5 个版本的备份
- 可通过 `workflow_dispatch` 手动触发回滚

### 5.2 生产环境部署

**触发条件**: 推送 Tag `v*` (如 `v1.2.0`)

**部署流程**:
1. 代码检查（Lint + Format）
2. 运行自动化测试
3. 构建生产版本（H5 + 后端）
4. 上传构建产物（保留 30 天）
5. 人工审批（GitHub Environments 配置）
6. 服务器部署
   - 备份当前版本（代码 + 数据库）
   - 更新前端静态资源
   - 更新后端代码
   - 重启服务
   - 健康检查
7. 发送部署通知

**人工审批配置**:
- 在 GitHub 仓库 Settings → Environments 中配置
- 添加 `production` 环境
- 启用 "Required reviewers"
- 指定可审批人员

### 5.3 版本发布流程

```bash
# 1. 确保 main 分支代码稳定
git checkout main
git pull

# 2. 更新版本号
npm version patch  # 或 minor / major

# 3. 推送版本标签
git push origin main --follow-tags
```

---

## 6. 构建产物管理

### 6.1 构建产物清单

| 产物 | 路径 | 说明 |
|------|------|------|
| H5 前端 | `packages/app/dist/build/h5/` | 静态资源文件 |
| 微信小程序 | `packages/app/dist/build/mp-weixin/` | 微信小程序代码包 |
| 后端代码 | `packages/server/src/` | Node.js 源码 |
| 数据库迁移脚本 | `packages/server/src/migrations/` | 数据库变更脚本 |

### 6.2 构建产物命名规范

- **H5 构建包**: `gexm-h5-{version}-{timestamp}.tar.gz`
- **后端构建包**: `gexm-server-{version}-{timestamp}.tar.gz`
- **完整发布包**: `gexm-{version}-{timestamp}.tar.gz`

### 6.3 GitHub Actions Artifacts 管理

```yaml
- name: 上传构建产物
  uses: actions/upload-artifact@v4
  with:
    name: h5-production
    path: packages/app/dist/build/h5/
    retention-days: 30  # 保留 30 天
```

### 6.4 发布到 GitHub Releases

添加 Release 工作流 `.github/workflows/release.yml`：

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    name: 创建 GitHub Release
    runs-on: ubuntu-latest
    permissions:
      contents: write
    
    steps:
      - name: Checkout 代码
        uses: actions/checkout@v4
      
      - name: 设置 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: 安装依赖
        run: npm ci
      
      - name: 构建 H5
        run: npm run build:app-h5
        env:
          VITE_APP_VERSION: ${{ github.ref_name }}
      
      - name: 打包构建产物
        run: |
          mkdir -p release
          tar czf release/gexm-h5.tar.gz -C packages/app/dist/build/h5 .
          tar czf release/gexm-server.tar.gz packages/server/src packages/server/package.json
      
      - name: 创建 Release
        uses: softprops/action-gh-release@v1
        with:
          generate_release_notes: true
          files: |
            release/gexm-h5.tar.gz
            release/gexm-server.tar.gz
          body: |
            ## Gexm ${{ github.ref_name }}
            
            ### 变更内容
            
            - 功能更新
            - Bug 修复
            - 性能优化
            
            ### 部署说明
            
            详细部署步骤请参考 [部署文档](./docs/deployment.md)
```

---

## 7. 所需的 GitHub Secrets 配置

在 GitHub 仓库 Settings → Secrets and variables → Actions 中添加以下 Secrets：

| Secret 名称 | 说明 | 示例 |
|-------------|------|------|
| `STAGING_HOST` | 测试服务器地址 | `staging.yourdomain.com` |
| `STAGING_USERNAME` | 测试服务器用户名 | `deploy` |
| `STAGING_SSH_KEY` | 测试服务器 SSH 私钥 | `-----BEGIN RSA PRIVATE KEY-----...` |
| `STAGING_PORT` | 测试服务器 SSH 端口 | `22` |
| `PRODUCTION_HOST` | 生产服务器地址 | `www.yourdomain.com` |
| `PRODUCTION_USERNAME` | 生产服务器用户名 | `deploy` |
| `PRODUCTION_SSH_KEY` | 生产服务器 SSH 私钥 | `-----BEGIN RSA PRIVATE KEY-----...` |
| `PRODUCTION_PORT` | 生产服务器 SSH 端口 | `22` |
| `SLACK_WEBHOOK` | Slack 通知 Webhook URL | `https://hooks.slack.com/services/...` |

### 7.1 SSH 密钥生成

```bash
# 生成部署密钥 (Linux/macOS)
ssh-keygen -t ed25519 -C "deploy@gexm" -f ~/.ssh/gexm-deploy

# 将公钥添加到服务器的 authorized_keys
ssh-copy-id -i ~/.ssh/gexm-deploy.pub deploy@yourserver.com

# 私钥内容复制到 GitHub Secrets
cat ~/.ssh/gexm-deploy
```

---

## 8. Docker 镜像构建与部署（可选）

### 8.1 Docker 镜像构建工作流

创建 `.github/workflows/docker.yml`：

```yaml
name: Docker Build

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

jobs:
  build-and-push:
    name: 构建并推送 Docker 镜像
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout 代码
        uses: actions/checkout@v4
      
      - name: 获取版本号
        id: get-version
        run: echo "version=${GITHUB_REF#refs/tags/v}" >> $GITHUB_OUTPUT
      
      - name: 设置 Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: 登录 Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: 构建并推送后端镜像
        uses: docker/build-push-action@v5
        with:
          context: ./packages/server
          file: ./packages/server/Dockerfile
          push: true
          tags: |
            yourorg/gexm-server:latest
            yourorg/gexm-server:${{ steps.get-version.outputs.version }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

---

## 9. 最佳实践

### 9.1 CI/CD 安全最佳实践

1. **最小权限原则**: 部署用户只授予必要的权限
2. **密钥管理**: 所有敏感信息使用 GitHub Secrets 管理，绝不硬编码
3. **SSH 密钥**: 使用 ed25519 密钥，定期轮换
4. **生产环境审批**: 生产部署必须经过人工审批
5. **审计日志**: 保留所有部署记录和操作日志

### 9.2 部署最佳实践

1. **蓝绿部署 / 金丝雀发布**: 高可用场景下使用
2. **自动回滚**: 健康检查失败时自动回滚
3. **数据库备份**: 每次部署前自动备份数据库
4. **版本回滚**: 支持快速回滚到任意历史版本
5. **灰度发布**: 先放量小部分用户，验证后全量发布

### 9.3 监控与告警

1. **部署状态通知**: 部署成功/失败即时通知
2. **错误率监控**: 部署后关注错误率变化
3. **性能指标**: 监控响应时间、QPS 等关键指标
4. **资源使用**: 关注 CPU、内存使用率变化
