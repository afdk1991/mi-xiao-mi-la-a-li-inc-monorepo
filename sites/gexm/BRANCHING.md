# 分支管理策略

## 1. 分支结构

### 1.1 主要分支

| 分支名称 | 用途 | 生命周期 |
|---------|------|---------|
| `main` | 生产环境稳定代码 | 长期 |
| `develop` | 开发集成分支 | 长期 |

### 1.2 支持分支

| 分支类型 | 命名规则 | 用途 | 生命周期 |
|---------|---------|------|---------|
| 功能分支 | `feature/{功能名称}` | 开发新功能 | 短期 |
| Bug修复分支 | `fix/{bug描述}` | 修复生产环境bug | 短期 |
| 热修复分支 | `hotfix/{修复描述}` | 紧急修复生产环境严重问题 | 短期 |
| 发布分支 | `release/{版本号}` | 准备新版本发布 | 短期 |
| 测试分支 | `test/{测试内容}` | 特定测试目的 | 短期 |

## 2. 分支命名规范

### 2.1 功能分支

- 命名格式：`feature/功能名称`
- 示例：`feature/vip-system`、`feature/responsive-design`
- 说明：功能名称应简洁明了，使用小写字母，单词间用连字符分隔

### 2.2 Bug修复分支

- 命名格式：`fix/bug描述`
- 示例：`fix/login-error`、`fix/responsive-issue`
- 说明：bug描述应准确反映问题，使用小写字母，单词间用连字符分隔

### 2.3 热修复分支

- 命名格式：`hotfix/修复描述`
- 示例：`hotfix/payment-failure`、`hotfix/security-vulnerability`
- 说明：修复描述应简洁明了，突出紧急性

### 2.4 发布分支

- 命名格式：`release/版本号`
- 示例：`release/1.0.0`、`release/1.1.0-beta`
- 说明：版本号应遵循语义化版本规范（Major.Minor.Patch）

### 2.5 测试分支

- 命名格式：`test/测试内容`
- 示例：`test/performance-test`、`test/compatibility-test`
- 说明：测试内容应清晰描述测试目的

## 3. 分支创建与合并流程

### 3.1 功能开发流程

1. **创建功能分支**：从 `develop` 分支创建新的功能分支
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/功能名称
   ```

2. **开发功能**：在功能分支上进行开发，定期提交代码
   ```bash
   git add .
   git commit -m "feat: 添加功能描述"
   ```

3. **推送分支**：将功能分支推送到远程仓库
   ```bash
   git push origin feature/功能名称
   ```

4. **创建Pull Request**：在GitHub/GitLab上创建从功能分支到 `develop` 的Pull Request

5. **代码审查**：团队成员进行代码审查

6. **合并分支**：代码审查通过后，将功能分支合并到 `develop` 分支

7. **删除分支**：合并完成后，删除远程和本地的功能分支
   ```bash
   git checkout develop
   git branch -d feature/功能名称
   git push origin --delete feature/功能名称
   ```

### 3.2 Bug修复流程

1. **创建修复分支**：从 `develop` 分支创建新的修复分支
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b fix/bug描述
   ```

2. **修复bug**：在修复分支上进行bug修复
   ```bash
   git add .
   git commit -m "fix: 修复bug描述"
   ```

3. **推送分支**：将修复分支推送到远程仓库
   ```bash
   git push origin fix/bug描述
   ```

4. **创建Pull Request**：在GitHub/GitLab上创建从修复分支到 `develop` 的Pull Request

5. **代码审查**：团队成员进行代码审查

6. **合并分支**：代码审查通过后，将修复分支合并到 `develop` 分支

7. **删除分支**：合并完成后，删除远程和本地的修复分支

### 3.3 热修复流程

1. **创建热修复分支**：从 `main` 分支创建新的热修复分支
   ```bash
   git checkout main
   git pull origin main
   git checkout -b hotfix/修复描述
   ```

2. **修复问题**：在热修复分支上进行紧急修复
   ```bash
   git add .
   git commit -m "hotfix: 修复紧急问题描述"
   ```

3. **推送分支**：将热修复分支推送到远程仓库
   ```bash
   git push origin hotfix/修复描述
   ```

4. **创建Pull Request**：在GitHub/GitLab上创建从热修复分支到 `main` 和 `develop` 的Pull Request

5. **紧急审查**：快速进行代码审查

6. **合并分支**：审查通过后，先合并到 `main` 分支，然后合并到 `develop` 分支

7. **删除分支**：合并完成后，删除远程和本地的热修复分支

### 3.4 发布流程

1. **创建发布分支**：从 `develop` 分支创建新的发布分支
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b release/版本号
   ```

2. **准备发布**：在发布分支上进行版本号更新、发布说明编写等准备工作
   ```bash
   git add .
   git commit -m "release: 准备版本号发布"
   ```

3. **推送分支**：将发布分支推送到远程仓库
   ```bash
   git push origin release/版本号
   ```

4. **测试发布分支**：在测试环境部署发布分支，进行最终测试

5. **创建Pull Request**：测试通过后，创建从发布分支到 `main` 和 `develop` 的Pull Request

6. **合并分支**：先合并到 `main` 分支，然后合并到 `develop` 分支

7. **标签发布**：在 `main` 分支上创建版本标签
   ```bash
   git checkout main
   git tag -a v1.0.0 -m "版本1.0.0发布"
   git push origin v1.0.0
   ```

8. **删除分支**：合并完成后，删除远程和本地的发布分支

## 4. 代码提交规范

### 4.1 提交信息格式

```
<类型>: <描述>

[可选的详细描述]

[可选的footer]
```

### 4.2 提交类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat: 添加VIP会员系统` |
| `fix` | Bug修复 | `fix: 修复登录页错误` |
| `docs` | 文档更新 | `docs: 更新API文档` |
| `style` | 代码样式调整 | `style: 格式化代码` |
| `refactor` | 代码重构 | `refactor: 优化数据库查询` |
| `perf` | 性能优化 | `perf: 减少页面加载时间` |
| `test` | 测试相关 | `test: 添加单元测试` |
| `build` | 构建配置 | `build: 更新Webpack配置` |
| `ci` | CI/CD配置 | `ci: 优化GitHub Actions配置` |
| `chore` | 其他杂项 | `chore: 清理临时文件` |
| `revert` | 回退提交 | `revert: 撤销上一次提交` |

### 4.3 提交信息示例

**简单示例**：
```
feat: 添加VIP会员系统
```

**详细示例**：
```
fix: 修复登录页表单验证问题

- 修复用户名验证正则表达式
- 添加密码强度提示
- 优化错误信息显示

Closes #123
```

## 5. 代码审查规范

### 5.1 审查内容

- 代码质量：代码是否清晰、可维护、高效
- 功能完整性：是否实现了预期功能
- 安全性：是否存在安全漏洞
- 测试覆盖：是否有适当的测试覆盖
- 文档：是否有必要的文档说明
- 命名规范：是否遵循命名规范

### 5.2 审查流程

1. **创建Pull Request**：开发者创建Pull Request并分配审查者
2. **初始审查**：审查者在24小时内进行初始审查
3. **反馈修改**：开发者根据反馈进行修改
4. **再次审查**：审查者验证修改是否符合要求
5. **批准合并**：审查通过后，批准合并

### 5.3 审查标准

- 至少需要1名审查者批准
- 关键功能或高风险修改需要2名审查者批准
- 所有评论必须得到解决
- 必须通过所有自动化测试

## 6. 版本管理规范

### 6.1 语义化版本规范

遵循 [语义化版本规范](https://semver.org/lang/zh-CN/)：

- **主版本号(Major)**：当你做了不兼容的API修改
- **次版本号(Minor)**：当你做了向下兼容的功能性新增
- **修订号(Patch)**：当你做了向下兼容的问题修正

### 6.2 版本发布流程

1. **版本规划**：根据功能和修复内容规划版本号
2. **准备发布**：在发布分支上更新版本号和发布说明
3. **测试验证**：在测试环境进行全面测试
4. **正式发布**：合并到main分支并创建版本标签
5. **发布通知**：通知相关人员和团队
6. **部署生产**：部署到生产环境

## 7. 分支管理最佳实践

1. **保持分支清洁**：定期清理不再需要的分支
2. **频繁合并**：定期将develop分支合并到功能分支，避免冲突
3. **小而频繁的提交**：每次提交应专注于单个功能或修复
4. **写好提交信息**：清晰、准确的提交信息便于理解和回溯
5. **及时处理Pull Request**：避免Pull Request长时间未处理
6. **遵循流程**：严格按照分支管理流程操作
7. **定期备份**：确保代码仓库有适当的备份机制
8. **使用Git钩子**：利用Git钩子自动检查代码质量和提交规范

## 8. 工具与自动化

### 8.1 推荐工具

- **Git客户端**：Git Bash、Sourcetree、GitHub Desktop
- **代码审查**：GitHub Pull Requests、GitLab Merge Requests
- **CI/CD**：GitHub Actions、Jenkins、GitLab CI
- **代码质量**：ESLint、Stylelint、PHPCS、PHPUnit

### 8.2 自动化流程

- **预提交检查**：使用Git钩子检查代码质量和提交规范
- **持续集成**：提交代码后自动运行测试和构建
- **自动部署**：通过CI/CD自动部署到测试或生产环境

## 9. 常见问题处理

### 9.1 分支冲突

- **预防**：定期合并最新代码，避免长期不更新的分支
- **解决**：
  1. 先更新本地分支：`git pull origin develop`
  2. 手动解决冲突
  3. 提交解决后的代码
  4. 重新推送分支

### 9.2 错误合并

- **回退方法**：
  ```bash
  # 查看提交历史
  git log
  
  # 回退到指定提交
  git revert <commit-hash>
  
  # 推送回退
  git push origin <branch-name>
  ```

### 9.3 分支丢失

- **预防**：定期推送分支到远程仓库
- **恢复**：使用`git reflog`查找丢失的分支，然后恢复
  ```bash
  git reflog
  git checkout -b <branch-name> <commit-hash>
  ```

## 10. 文档维护

- 定期更新本分支管理策略
- 记录重大分支变更和版本发布
- 保存发布说明和变更日志

## 11. 培训与执行

- 新团队成员必须学习并遵守本策略
- 定期进行分支管理培训和回顾
- 建立分支管理执行监督机制

---

**更新日期**：2025-12-13
**版本**：1.0.0
**作者**：MixM Laal 开发团队
