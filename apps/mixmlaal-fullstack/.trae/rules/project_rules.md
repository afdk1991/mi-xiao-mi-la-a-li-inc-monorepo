---
alwaysApply: false
---
# MIXMLAAL 项目规则

## 项目基本信息

**项目名称**: 米小米拉阿狸（MIXMLAAL）大型生态平台  
完整版本号：MIXMLAAL-0.0.0.4-20260419164720
**核心定位**: 全球卓越的一站式多元化出行+本地生活生态平台

---always

## 1. 技术栈规范

### 1.1 前端技术栈
- HTML5 + CSS3 + JavaScript (ES6+)
- Tailwind CSS 3.4+ 作为CSS框架
- Font Awesome 图标库
- 原生JavaScript，不使用大型前端框架

### 1.2 后端技术栈
- Node.js 18+ + Express
- Java 17 + Spring Boot 3.2 (微服务)

### 1.3 数据库
- MySQL 8.0 (主数据库)
- Redis (缓存)
- MongoDB (日志存储)

### 1.4 基础设施
- Docker + Kubernetes
- Nginx (反向代理)
- Kafka (消息队列)

---

## 2. 代码规范

### 2.1 基本规范
- 使用简体中文注释
- 2空格缩进
- 单引号字符串
- 箭头函数优先
- 禁止多余空行
- 单行代码不超过120字符

### 2.2 命名规范
- 文件名: kebab-case (如: user-service.js)
- 组件名: PascalCase (如: UserCard)
- 变量名: camelCase (如: userName)
- 常量名: UPPER_SNAKE_CASE (如: MAX_COUNT)
- 类名: PascalCase (如: UserService)

### 2.3 文件组织
```
src/
  ├── portal/          # 门户生态
  ├── social/          # 社交生态
  ├── ecommerce/       # 电商生态
  ├── ride/            # 出行生态
  ├── user/            # 用户与认证
  ├── payment/         # 支付系统
  ├── open/            # 开放平台
  ├── admin/           # 管理后台
  ├── mobile/          # 移动端适配
  ├── support/         # 服务与支持
  ├── ops/             # 运维与监控
  ├── dev/             # 开发与测试
  ├── resources/       # 资源与素材
  ├── marketing/       # 营销与运营
  └── compliance/      # 合规与备案
```

---

## 3. 域名对应规范

每个功能模块必须对应正确的子域名：

| 模块 | 域名 | 说明 |
|------|------|------|
| 主站 | www.laal.top | 品牌一级官网 |
| 门户 | portal.laal.top | 业务门户聚合 |
| 新闻 | news.laal.top | 资讯内容发布 |
| 博客 | blog.laal.top | 原创专栏运营 |
| 视频 | video.laal.top | 视频内容展示 |
| 动态 | dy.laal.top | 动态内容运营 |
| 商城 | mall.laal.top | 多商户电商平台 |
| 店铺 | shop.laal.top | 单品电商交易 |
| 网约车 | ride.laal.top | 网约车服务 |
| 出租车 | taxi.laal.top | 出租车服务 |
| 用户中心 | user.laal.top | 用户账户管理 |
| 会员中心 | center.laal.top | 综合会员管理 |
| 认证 | auth.laal.top | 权限认证管理 |
| 支付 | pay.laal.top | 支付结算管理 |
| API | api.laal.top | 接口网关管理 |
| 管理后台 | admin.laal.top | 全站超级管理 |
| 移动端 | mobile.laal.top | 移动端适配 |
| 客服 | support.laal.top | 客户服务支持 |
| 帮助 | help.laal.top | 帮助文档服务 |
| 运维 | fwq.laal.top | 安全防护管理 |
| 统计 | stats.laal.top | 数据统计分析 |
| 开发环境 | dev.laal.top | 开发调试管理 |
| 测试环境 | test.laal.top | 研发测试环境 |

---

## 4. 开发规范

### 4.1 代码注释
- 文件头部必须包含文件说明注释
- 函数必须包含JSDoc注释
- 复杂逻辑必须添加行内注释

```javascript
/**
 * 函数说明
 * @param {string} param1 - 参数1说明
 * @param {number} param2 - 参数2说明
 * @returns {boolean} 返回值说明
 */
function exampleFunction(param1, param2) {
  // 实现逻辑
}
```

### 4.2 错误处理
- 所有异步操作必须使用try-catch
- 错误信息必须记录到日志
- 用户-facing错误必须友好提示

### 4.3 性能要求
- 页面加载时间 ≤ 1秒
- 接口响应时间 ≤ 300ms
- 图片必须压缩优化
- 使用CDN加速静态资源

---

## 5. 安全规范

### 5.1 数据安全
- 敏感数据必须加密存储
- 密码必须使用bcrypt加密
- 接口必须做权限校验
- 防止SQL注入、XSS攻击

### 5.2 合规要求
- 人车双证校验
- 抽成上限27%管控
- 数据隐私保护
- 支付合规（反洗钱）

---

## 6. Git规范

### 6.1 分支管理
- main: 生产分支
- develop: 开发分支
- feature/*: 功能分支
- bugfix/*: 修复分支
- hotfix/*: 紧急修复分支

### 6.2 提交规范
格式: `类型: 描述`

类型:
- feat: 新功能
- fix: 修复
- docs: 文档
- style: 格式
- refactor: 重构
- test: 测试
- chore: 构建/工具

示例:
```
feat: 新增网约车叫车功能
fix: 修复支付超时问题
docs: 更新API文档
```

### 6.3 合并要求
- 必须通过Code Review
- 必须通过自动化测试
- 必须解决所有冲突

---

## 7. 多语言规范

### 7.1 支持语言
- zh-CN: 简体中文（默认）
- zh-TW: 繁体中文
- en: 英语
- ko: 韩语
- ja: 日语
- es: 西班牙语

### 7.2 实现方式
- 使用data-i18n属性标记需要翻译的元素
- 所有文本必须通过i18n模块获取
- 语言文件统一放在shared/i18n/目录

---

## 8. 测试规范

### 8.1 测试类型
- 单元测试: Jest
- 集成测试: Jest + Supertest
- E2E测试: Playwright

### 8.2 覆盖率要求
- 核心代码覆盖率 ≥ 80%
- 关键路径必须100%覆盖

---

## 9. 文档规范

### 9.1 必须文档
- README.md: 项目说明
- API.md: 接口文档
- DEPLOYMENT.md: 部署文档
- CHANGELOG.md: 变更日志

### 9.2 文档格式
- 使用Markdown格式
- 使用中文编写
- 包含代码示例
- 保持更新同步

---

## 10. 部署规范

### 10.1 环境划分
- dev: 开发环境
- test: 测试环境
- staging: 预生产环境
- prod: 生产环境

### 10.2 部署流程
1. 代码合并到main分支
2. 触发CI/CD流水线
3. 自动化测试
4. 构建Docker镜像
5. 部署到Kubernetes
6. 健康检查
7. 流量切换

---end
