---
name: daijia-platform-full-development
overview: 基于审计报告（39项缺口）和PRD/设计文档，完成代驾平台的全部开发工作：项目基础设施搭建、安全加固、核心功能补全、测试覆盖扩展、UI完善、文档与部署配置。
todos:
  - id: p0-security-fixes
    content: 修复P0安全与基础设施：index.php信息泄露端点移除、CORS白名单收紧、创建.gitignore
    status: completed
  - id: p0-rate-limit
    content: 实现REST API速率限制中间件：基于Transients的滑动窗口算法，在REST基类集成
    status: completed
  - id: p0-composer-phpunit
    content: 创建composer.json + phpunit.xml + tests/bootstrap.php测试引导文件
    status: completed
  - id: p1-auth-sms-audit
    content: 完善P1核心功能：短信验证码真实接入、审计日志系统实现、版本号统一与加密随机数修复
    status: completed
  - id: p1-test-coverage
    content: 扩展测试覆盖：创建Order/Payment/Driver/Wallet模块单元测试和REST API集成测试
    status: completed
    dependencies:
      - p0-composer-phpunit
  - id: p1-config-docs
    content: 补齐工程化配置：创建.env.example环境变量管理、phpcs.xml代码规范、OpenAPI 3.0文档
    status: completed
  - id: p2-frontend-polish
    content: P2前端完善：driver-orders.html导航一致性修复、管理后台XSS防护审查、静态资源填充、文件上传安全规则
    status: completed
---

## 用户需求
基于审计报告（39项缺口：P0 6项、P1 12项、P2 12项、P3 9项），按优先级完成项目修复与功能补齐。已完成框架（daijia-core 34个PHP文件、5个REST控制器、35+ API端点、9张数据库表、PWA 8页面、管理后台）需保留，重点修复安全漏洞、基础设施缺失、功能模块占位符、测试覆盖率和工程质量问题。

## 产品概述
安行代驾平台——一个基于WordPress的完整代驾服务系统，包含核心PHP插件、PWA移动端、管理后台、官网、WooCommerce扩展和测试套件。

## 核心功能
- **P0安全修复**：移除index.php信息泄露端点、收紧CORS策略、添加.gitignore
- **P0基础设施**：创建composer.json + phpunit.xml、实现REST API全局速率限制中间件
- **P1功能完善**：短信验证码真实接入、审计日志系统实现、环境变量管理(.env)、加密随机数修复
- **P1质量提升**：扩展测试覆盖（Order/Payment/Driver/Wallet模块）、统一版本号、phpcs代码规范配置、OpenAPI 3.0文档
- **P2/P3工程化**：数据库迁移工具、文件上传安全规则、管理后台XSS防护审查、前端导航一致性修复、静态资源填充


## 技术栈
- **后端**：PHP 8.1+ / WordPress Plugin / wp_remote_request / PSR-3 Logging
- **前端**：Native HTML + Vanilla JS / CSS Custom Properties (--dj-* 设计令牌体系)
- **测试**：PHPUnit 10+ / WP_REST_TestCase
- **依赖管理**：Composer
- **代码规范**：PHP_CodeSniffer (phpcs.xml)
- **API文档**：OpenAPI 3.0 (Swagger)

## 实现方案

### 总体策略
采用**增量修复**策略，优先修复P0安全/基础设施阻断项，再补齐P1功能/质量缺口，最后完善P2/P3工程化。所有修改基于现有代码架构（Service Locator模式、$_booted守卫、声明式验证器、--dj-*设计令牌体系），不引入新的架构模式。

### P0安全修复（3项关键修改）

**1. index.php 信息泄露修复**
- 策略：将 `?action=info` 和 `?action=status` 端点改为仅在开发环境下可用
- 判断逻辑：检查 `WP_DEBUG` 常量或 `DAIJIA_ENV` 环境变量，生产环境返回403
- 同时移除导航页中指向这些端点的链接

**2. CORS策略收紧**
- 策略：将 `_start_srv.ps1` 中全局 `Access-Control-Allow-Origin: *` 改为白名单机制
- 定义允许的Origin列表（localhost:8100 / 127.0.0.1:8100），动态匹配请求Origin头
- REST API端点的CORS通过WordPress内置 `rest_send_cors_headers` 钩子处理

**3. 速率限制中间件**
- 策略：在REST基类中通过 `rest_request_before_callbacks` 过滤器实现
- 使用WordPress Transients API存储计数器（兼容无Redis环境）
- 配置：公开端点60次/分钟、认证端点120次/分钟、管理端点300次/分钟
- 采用滑动窗口算法，返回 `429 Too Many Requests` + `Retry-After` 头

### P1功能补齐（4项关键新增）

**4. 短信验证码真实接入**
- 策略：在 `Daijia_Auth::send_sms_code()` 中接入阿里云/腾讯云SMS SDK
- 使用 `wp_remote_post` 调用SMS API，配置通过wp_options管理
- 实现：60秒发送间隔限制、5分钟验证码有效期、Redis/Transient存储验证码
- 保留开发环境降级方案（`WP_DEBUG` 模式下可配置返回固定验证码）

**5. 审计日志系统**
- 策略：利用已有 `{prefix}dj_audit_logs` 表，创建 `Daijia_Audit_Logger` 类
- 通过Service Locator注册，各服务调用 `audit()->log(action, target_id, user_id, details)`
- 关键审计点：支付回调、退款操作、订单状态变更、用户角色变更、API异常访问
- 管理后台增加审计日志查看页面（分页、筛选、导出）

**6. 环境变量管理**
- 策略：项目根目录添加 `.env.example`，通过 `parse_ini_file()` 加载
- 敏感配置（支付密钥、SMS密钥、数据库凭证）从 `.env` 读取，不硬编码
- `wp-config.php` 优先使用 `getenv()` 获取环境变量，退化到define

**7. 测试套件扩展**
- 策略：在 `tests/unit/` 下按模块创建测试文件
- 覆盖：test-order-pure.php、test-payment-pure.php、test-drivers-pure.php、test-wallet-pure.php
- REST API集成测试：test-rest-api.php 使用WP_REST_TestCase
- 目标：核心模块覆盖率 > 80%

### 实现注意事项

**性能**：
- 速率限制使用Transients而非数据库查询，避免每次请求都写库
- 审计日志采用批量写入 + wp_schedule_event 定时flush，减少同步I/O
- 短信验证码使用Transients存储，设置合理TTL自动过期

**向下兼容**：
- 所有新增类通过Service Locator懒加载注册，不影响现有代码路径
- 支付模块当前已完整实现（审计时标记的占位符已修复），不需要再次修改
- 版本号统一为 `1.1.0`（入口header已写1.1.0，define改为1.1.0）

**日志**：
- 审计日志使用现有 `Daijia_Logger` (PSR-3)，不创建新日志通道
- 敏感信息（手机号、支付金额）在日志中脱敏处理
- 错误日志使用 `error` 级别，审计日志使用 `info` 级别

**影响范围控制**：
- index.php 修改仅限于移除信息泄露端点
- REST基类添加速率限制通过新方法注入，不改现有控制器代码
- 测试文件仅在tests/目录下新增，不影响核心代码

