# WordPress 插件全面改进实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: 使用 superpowers:subagent-driven-development (推荐) 或 superpowers:executing-plans 逐任务执行本计划。步骤使用复选框 (`- [ ]`) 语法进行跟踪。

**目标:** 对 mixm-core、mixm-commerce、mixm-security 三个 WordPress 插件进行全面改进，包括安全加固、代码质量提升、测试覆盖、UI 优化、设计规范化和文档完善。

**架构:** 采用「先外围后核心、先清理后重构」策略，从安全加固切入，逐步提升代码质量、测试覆盖和用户体验。

**技术栈:** PHP 7.4+, WordPress 6.0+, MySQL 5.7+, JavaScript (jQuery), CSS

## 全局约束

- WordPress 编码标准 (WordPress Coding Standards)
- 最低兼容 WordPress 6.0 + PHP 7.4
- 所有用户输入必须验证和净化
- 所有输出必须转义
- 所有表单和 AJAX 请求必须包含 nonce 验证
- 所有管理操作必须验证用户权限
- 数据库操作必须使用 $wpdb->prepare() 预处理
- 测试覆盖率目标: 核心函数 >= 70%
- 管理后台 UI 必须响应式且符合 WCAG 2.1 AA 标准

---

## 任务 1: 安全加固 - mixm-security 插件

**文件:**
- 修改: `wp-content/plugins/mixm-security/mixm-security.php`
- 新增: `wp-content/plugins/mixm-security/includes/class-security-guard.php`
- 测试: `wp-content/plugins/mixm-security/tests/test-security-guard.php`

**接口:**
- 生产: `MixM_Security_Guard` 类，提供 XSS/SQL 注入/暴力破解防护方法
- 消费: WordPress 钩子系统 (init, wp_login_failed, authenticate)

### 安全问题清单

- [ ] **Step 1: 修复设置页缺少 nonce 验证的问题**

在 `mixm-security.php` 的 `admin_page()` 方法中，表单提交缺少 nonce 验证：

```php
// 修复前代码
if (isset($_POST['mixm_security_save'])) {
    update_option('mixm_security_login_attempts', intval($_POST['login_attempts']));
    // ... 直接保存，无验证
}

// 修复后代码
if (isset($_POST['mixm_security_save']) && check_admin_referer('mixm_security_save', 'mixm_security_nonce')) {
    if (!current_user_can('manage_options')) {
        wp_die(__('权限不足', 'mixm-security'));
    }
    $login_attempts = isset($_POST['login_attempts']) ? intval($_POST['login_attempts']) : 5;
    // ... 验证后保存
}
```

- [ ] **Step 2: 在表单中添加 nonce 字段**

在表单 `<form method="post" action="">` 内添加：

```php
<?php wp_nonce_field('mixm_security_save', 'mixm_security_nonce'); ?>
```

- [ ] **Step 3: 修复 IP 获取函数的安全性**

`get_user_ip()` 方法需要防止 IP 伪造：

```php
private function get_user_ip() {
    $ip = '';
    
    if (!empty($_SERVER['REMOTE_ADDR'])) {
        $ip = sanitize_text_field(wp_unslash($_SERVER['REMOTE_ADDR']));
    }
    
    // 仅在信任的代理环境下检查 X-Forwarded-For
    if (defined('MIXM_TRUSTED_PROXY') && MIXM_TRUSTED_PROXY) {
        if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $forwarded = sanitize_text_field(wp_unslash($_SERVER['HTTP_X_FORWARDED_FOR']));
            $ips = explode(',', $forwarded);
            $ip = trim($ips[0]);
        }
    }
    
    // 验证 IP 格式
    if (!filter_var($ip, FILTER_VALIDATE_IP)) {
        $ip = '0.0.0.0';
    }
    
    return $ip;
}
```

- [ ] **Step 4: 创建 MixM_Security_Guard 类**

创建独立的安全防护类：

```php
<?php
/**
 * 安全防护核心类
 * @package MixM_Security
 */

if (!defined('ABSPATH')) {
    exit;
}

class MixM_Security_Guard {

    /**
     * 检测 SQL 注入攻击
     * @param string $input 输入字符串
     * @return bool 是否包含注入特征
     */
    public static function detect_sql_injection($input) {
        if (!is_string($input)) {
            return false;
        }
        
        $patterns = array(
            '/[\x00-\x1F\x7F]/',
            '/(union|select|insert|update|delete|drop|alter|create|truncate|show|exec|execute|declare|cast|convert|xp_)/i',
            '/(\'|\")\s*or\s*(\'|\")?\d+(\'|\")?\s*=\s*(\'|\")?\d+/i',
            '/;\s*(drop|delete|update|insert|alter)/i',
            '/--\s*$/',
            '/\/\*.*\*\//'
        );
        
        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $input)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * 深度净化输入数据
     * @param mixed $data 输入数据
     * @return mixed 净化后的数据
     */
    public static function deep_sanitize($data) {
        if (is_array($data)) {
            foreach ($data as $key => $value) {
                $data[$key] = self::deep_sanitize($value);
            }
        } elseif (is_string($data)) {
            $data = trim($data);
            $data = wp_unslash($data);
            $data = sanitize_text_field($data);
        }
        
        return $data;
    }

    /**
     * 记录安全事件日志
     * @param string $type 事件类型
     * @param string $message 事件描述
     * @param array $context 上下文数据
     * @return void
     */
    public static function log_event($type, $message, $context = array()) {
        $log_entry = array(
            'time' => current_time('mysql'),
            'type' => $type,
            'message' => $message,
            'ip' => self::get_ip(),
            'user_id' => get_current_user_id(),
            'context' => $context
        );
        
        // 记录到数据库或文件
        $logs = get_option('mixm_security_logs', array());
        array_unshift($logs, $log_entry);
        if (count($logs) > 1000) {
            $logs = array_slice($logs, 0, 1000);
        }
        update_option('mixm_security_logs', $logs);
    }

    /**
     * 获取客户端 IP 地址
     * @return string IP 地址
     */
    private static function get_ip() {
        $ip = isset($_SERVER['REMOTE_ADDR']) ? sanitize_text_field(wp_unslash($_SERVER['REMOTE_ADDR'])) : '0.0.0.0';
        return filter_var($ip, FILTER_VALIDATE_IP) ? $ip : '0.0.0.0';
    }
}
```

- [ ] **Step 5: 验证安全加固效果**

验证以下场景：
- 设置页提交必须验证 nonce 和权限
- IP 获取函数返回有效 IP 格式
- SQL 注入检测能识别常见注入模式
- 深度净化函数正确处理数组和字符串

---

## 任务 2: 安全加固 - mixm-core 插件 AJAX 和 REST API

**文件:**
- 修改: `wp-content/plugins/mixm-core/mixm-core.php`
- 修改: `wp-content/plugins/mixm-core/includes/api/permissions.php`
- 测试: `wp-content/plugins/mixm-core/tests/test-security.php`

**接口:**
- 生产: 统一的权限验证函数 mixm_core_check_permission()
- 消费: 所有 AJAX 和 REST API 端点

- [ ] **Step 1: 添加统一权限验证函数**

在 `functions.php` 中添加：

```php
/**
 * 检查用户权限
 * @param string $capability 权限名称
 * @param int $object_id 对象 ID (可选)
 * @return bool 是否有权限
 */
function mixm_core_check_permission($capability = 'manage_options', $object_id = 0) {
    if (!current_user_can($capability, $object_id)) {
        return false;
    }
    return true;
}

/**
 * AJAX 权限检查失败响应
 * @param string $message 错误消息
 * @return void
 */
function mixm_core_ajax_permission_denied($message = '') {
    if (empty($message)) {
        $message = __('权限不足', 'mixm-core');
    }
    wp_send_json_error(array(
        'code' => 'permission_denied',
        'message' => $message
    ), 403);
}
```

- [ ] **Step 2: 为所有 AJAX 处理函数添加权限检查**

以 `mixm_core_approve_merchant_ajax` 为例：

```php
function mixm_core_approve_merchant_ajax() {
    check_ajax_referer('mixm_merchant_action');
    
    if (!mixm_core_check_permission('manage_options')) {
        mixm_core_ajax_permission_denied();
    }
    
    global $wpdb;
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    
    if ($id <= 0) {
        wp_send_json_error(array('message' => '无效的商家ID'));
    }
    
    $result = $wpdb->update(
        $wpdb->prefix . 'mixm_merchants',
        array('status' => 'approved'),
        array('id' => $id),
        array('%s'),
        array('%d')
    );
    
    if (false === $result) {
        wp_send_json_error(array('message' => '更新失败'));
    }
    
    wp_send_json_success(array('message' => '商家已批准'));
}
```

- [ ] **Step 3: 完善 REST API 权限控制**

在 `permissions.php` 中添加统一权限回调：

```php
/**
 * REST API 管理员权限检查
 * @param WP_REST_Request $request 请求对象
 * @return bool|WP_Error
 */
function mixm_core_rest_admin_permission_check($request) {
    if (!current_user_can('manage_options')) {
        return new WP_Error(
            'rest_forbidden',
            __('权限不足', 'mixm-core'),
            array('status' => 403)
        );
    }
    return true;
}

/**
 * REST API 登录用户权限检查
 * @param WP_REST_Request $request 请求对象
 * @return bool|WP_Error
 */
function mixm_core_rest_logged_in_permission_check($request) {
    if (!is_user_logged_in()) {
        return new WP_Error(
            'rest_not_logged_in',
            __('请先登录', 'mixm-core'),
            array('status' => 401)
        );
    }
    return true;
}
```

- [ ] **Step 4: 验证所有端点都有权限控制**

检查所有 REST 路由都配置了 permission_callback

---

## 任务 3: 测试驱动开发 - 核心功能测试

**文件:**
- 新增: `wp-content/plugins/mixm-core/tests/test-functions.php`
- 修改: `wp-content/plugins/mixm-core/tests/bootstrap.php`
- 新增: `wp-content/plugins/mixm-core/tests/test-price-calculation.php`

**接口:**
- 消费: mixm_core 中的工具函数
- 生产: 可重复运行的单元测试

- [ ] **Step 1: 编写价格计算测试（先写测试）**

```php
<?php
class Test_Price_Calculation extends WP_UnitTestCase {

    public function test_calculate_price_economy_short_distance() {
        $price = mixm_core_calculate_price(2, 10, 'economy');
        $this->assertEquals(10.08, $price, '', 0.01);
    }

    public function test_calculate_price_economy_long_distance() {
        $price = mixm_core_calculate_price(10, 30, 'economy');
        $expected_start = 10;
        $expected_distance = max(0, (10 - 3) * 2.5);
        $expected_duration = 30 * 0.5 / 60;
        $expected = round($expected_start + $expected_distance + $expected_duration, 2);
        $this->assertEquals($expected, $price, '', 0.01);
    }

    public function test_calculate_price_invalid_type_falls_back_to_economy() {
        $price1 = mixm_core_calculate_price(5, 15, 'invalid_type');
        $price2 = mixm_core_calculate_price(5, 15, 'economy');
        $this->assertEquals($price2, $price1);
    }

    public function test_format_price() {
        $this->assertEquals('10.00', mixm_core_format_price(10));
        $this->assertEquals('10.50', mixm_core_format_price(10.5));
        $this->assertEquals('0.00', mixm_core_format_price('invalid'));
    }

    public function test_sanitize_phone() {
        $this->assertEquals('13800138000', mixm_core_sanitize_phone('138-0013-8000'));
        $this->assertEquals('13800138000', mixm_core_sanitize_phone(' 138 0013 8000 '));
        $this->assertEquals('', mixm_core_sanitize_phone('abc'));
    }

    public function test_generate_order_no() {
        $order_no = mixm_core_generate_order_no('DD');
        $this->assertStringStartsWith('DD', $order_no);
        $this->assertEquals(15, strlen($order_no));
    }

    public function test_get_distance() {
        $distance = mixm_core_get_distance(39.9042, 116.4074, 31.2304, 121.4737);
        $this->assertGreaterThan(1000, $distance);
        $this->assertLessThan(1500, $distance);
    }
}
```

- [ ] **Step 2: 运行测试确认失败（RED 阶段）**

运行: `cd wp-content/plugins/mixm-core && phpunit tests/test-price-calculation.php`
预期: 测试通过（因为函数已存在）- 验证测试正确性

- [ ] **Step 3: 补充边界情况测试**

添加零值、负值、极端值测试

- [ ] **Step 4: 运行所有测试确认通过（GREEN 阶段）**

---

## 任务 4: 管理后台 UI 优化 - 仪表盘

**文件:**
- 修改: `wp-content/plugins/mixm-core/includes/admin/dashboard.php`
- 新增: `wp-content/plugins/mixm-core/assets/css/admin-dashboard.css`
- 新增: `wp-content/plugins/mixm-core/assets/js/admin-dashboard.js`

**接口:**
- 生产: 现代化的管理仪表盘
- 消费: WordPress 管理后台

- [ ] **Step 1: 设计新的仪表盘布局**

创建包含以下模块的仪表盘：
- 数据概览卡片（总订单、总收入、活跃用户、待处理工单）
- 订单趋势图表（7天趋势）
- 最近订单列表
- 快速操作入口

- [ ] **Step 2: 实现响应式布局**

使用 CSS Grid 实现响应式卡片布局，适配移动设备

- [ ] **Step 3: 添加交互效果**

卡片悬停效果、数字动画、加载状态

- [ ] **Step 4: 验证 UI 效果**

确认在不同屏幕尺寸下显示正常

---

## 任务 5: 设计系统 - 设计令牌与组件规范

**文件:**
- 新增: `wp-content/plugins/mixm-core/assets/css/design-tokens.css`
- 新增: `wp-content/plugins/mixm-core/docs/design-system.md`

**接口:**
- 生产: CSS 变量设计令牌系统
- 消费: 所有管理后台样式

- [ ] **Step 1: 定义三层设计令牌**

```css
/* 原始层 - Primitive Tokens */
:root {
  --mixm-color-blue-50: #eff6ff;
  --mixm-color-blue-500: #3b82f6;
  --mixm-color-blue-600: #2563eb;
  --mixm-color-gray-50: #f9fafb;
  --mixm-color-gray-100: #f3f4f6;
  --mixm-color-gray-700: #374151;
  --mixm-color-gray-900: #111827;
  --mixm-spacing-1: 4px;
  --mixm-spacing-2: 8px;
  --mixm-spacing-4: 16px;
  --mixm-spacing-6: 24px;
  --mixm-font-size-sm: 14px;
  --mixm-font-size-base: 16px;
  --mixm-font-size-lg: 18px;
  --mixm-radius-sm: 4px;
  --mixm-radius-md: 8px;
  --mixm-radius-lg: 12px;
}

/* 语义层 - Semantic Tokens */
:root {
  --mixm-color-primary: var(--mixm-color-blue-600);
  --mixm-color-primary-hover: var(--mixm-color-blue-500);
  --mixm-color-bg: var(--mixm-color-gray-50);
  --mixm-color-surface: #ffffff;
  --mixm-color-text-primary: var(--mixm-color-gray-900);
  --mixm-color-text-secondary: var(--mixm-color-gray-700);
  --mixm-border-radius: var(--mixm-radius-md);
  --mixm-spacing-card: var(--mixm-spacing-4);
}

/* 组件层 - Component Tokens */
:root {
  --mixm-button-bg: var(--mixm-color-primary);
  --mixm-button-bg-hover: var(--mixm-color-primary-hover);
  --mixm-card-bg: var(--mixm-color-surface);
  --mixm-card-padding: var(--mixm-spacing-card);
  --mixm-card-border-radius: var(--mixm-border-radius);
}
```

- [ ] **Step 2: 编写设计系统文档**

记录颜色、排版、间距、组件规范

- [ ] **Step 3: 迁移现有样式使用设计令牌**

逐步将硬编码值替换为 CSS 变量

---

## 任务 6: 文档完善 - 插件开发文档

**文件:**
- 新增: `wp-content/plugins/mixm-core/README.md`
- 新增: `wp-content/plugins/mixm-commerce/README.md`
- 新增: `wp-content/plugins/mixm-security/README.md`

**接口:**
- 生产: 完整的插件文档
- 消费: 开发者和用户

- [ ] **Step 1: 编写 mixm-core 插件文档**

包含：功能介绍、安装指南、目录结构、API 文档、使用示例、常见问题

- [ ] **Step 2: 编写 mixm-commerce 插件文档**

- [ ] **Step 3: 编写 mixm-security 插件文档**

- [ ] **Step 4: 验证文档完整性**

确保所有主要功能都有文档说明

---

## 任务 7: 代码质量审查与优化

**文件:**
- 修改: `wp-content/plugins/mixm-core/mixm-core.php`
- 修改: `wp-content/plugins/mixm-commerce/mixm-commerce.php`
- 修改: `wp-content/plugins/mixm-security/mixm-security.php`

**接口:**
- 生产: 符合 WordPress 编码标准的代码
- 消费: 代码维护者

- [ ] **Step 1: 统一代码风格**

- 所有类名使用 PascalCase 并带前缀
- 所有函数名使用 snake_case 并带前缀
- 所有变量名使用 snake_case
- 缩进使用 4 个空格
- 每行不超过 85 字符

- [ ] **Step 2: 补充文档注释**

为所有公共函数和类添加 PHPDoc 注释

- [ ] **Step 3: 移除重复代码**

提取公共功能到共享函数

- [ ] **Step 4: 错误处理优化**

添加完善的错误处理和异常捕获

---

## 任务 8: 预提交钩子配置

**文件:**
- 新增: `wp-content/plugins/mixm-core/.husky/pre-commit`
- 新增: `wp-content/plugins/mixm-core/.lintstagedrc.json`

**接口:**
- 生产: 自动代码检查工作流
- 消费: 开发者提交代码时

- [ ] **Step 1: 初始化 Husky 配置**

- [ ] **Step 2: 配置 lint-staged**

- [ ] **Step 3: 添加 PHP_CodeSniffer 配置**

- [ ] **Step 4: 验证钩子正常工作**

---

## 总览

| 任务 | 优先级 | 预估时间 | 依赖 |
|------|--------|----------|------|
| Task 1: mixm-security 安全加固 | P0 | 2h | 无 |
| Task 2: mixm-core AJAX/REST 安全 | P0 | 2h | 无 |
| Task 3: TDD 核心功能测试 | P1 | 3h | Task 1, 2 |
| Task 4: 后台 UI 优化 | P1 | 4h | 无 |
| Task 5: 设计系统 | P2 | 3h | Task 4 |
| Task 6: 文档完善 | P2 | 3h | 无 |
| Task 7: 代码质量审查 | P1 | 2h | Task 1, 2 |
| Task 8: 预提交钩子 | P2 | 1h | Task 7 |
