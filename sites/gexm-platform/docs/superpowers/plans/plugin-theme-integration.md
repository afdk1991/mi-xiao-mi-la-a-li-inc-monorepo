# MixM 插件与主题集成实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 MixM Core 插件的所有功能模块完整集成到 mixm-laal 主题中，实现统一的用户体验、支付系统和后台管理。

**Architecture:** 在主题中创建集成桥接层，通过 WordPress 钩子系统实现插件与主题的双向通信。保留插件作为功能提供者，主题负责统一展示和用户交互。

**Tech Stack:**
- WordPress 6.2+ / PHP 8.0+
- MixM Core Plugin (打车/外卖/跑腿/骑手/商家/营销/拼团/工单)
- MixM Laal Theme (社交/社区/论坛/商城/视频等)

## Global Constraints

- 所有函数必须使用 `mixm_laal_` 前缀（主题侧）或 `mixm_core_` 前缀（插件侧）
- 数据库表前缀必须区分：插件表用 `wp_mixm_` 前缀，主题商城表用 `wp_shop_` 前缀
- API 路由命名空间必须区分：插件用 `mixm/v1`，主题用 `mixm-laal/v1`
- 所有输出必须经过转义：`esc_html()`, `esc_attr()`, `esc_url()`
- 所有表单必须包含 nonce 验证
- 所有用户输入必须经过 sanitize 处理
- 遵循 WordPress 编码标准：4 空格缩进，snake_case 函数名
- 功能完整性：插件所有模块必须可在主题中正常使用

---

### Task 1: 创建主题与插件的桥接层

**Files:**
- Create: `wp-content/themes/mixm-laal/inc/plugin-bridge.php`
- Modify: `wp-content/themes/mixm-laal/functions.php` (引入桥接层)

**Interfaces:**
- Consumes: MixM Core 插件的 API 函数和数据库表
- Produces: 主题侧统一调用插件功能的桥接函数

**Goal:** 创建集成桥接层，提供主题调用插件功能的统一接口

**Steps:**

- [ ] **Step 1: 创建 plugin-bridge.php 主文件**

文件位置：`wp-content/themes/mixm-laal/inc/plugin-bridge.php`

```php
<?php
/**
 * 插件桥接层
 * 提供主题与 MixM Core 插件之间的统一调用接口
 *
 * @package MixM_Laal
 * @version 1.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * 检查 MixM Core 插件是否已激活
 *
 * @return bool
 */
function mixm_laal_is_core_plugin_active() {
    return class_exists('MixM_Core') || function_exists('mixm_core_init');
}

/**
 * 检查 MixM Commerce 插件是否已激活
 *
 * @return bool
 */
function mixm_laal_is_commerce_plugin_active() {
    return class_exists('MixM_Commerce') || function_exists('mixm_commerce_init');
}

// ==================== 打车模块桥接 ====================

/**
 * 创建打车订单
 *
 * @param array $args 订单参数
 * @return array|WP_Error
 */
function mixm_laal_create_ride_order($args) {
    if (!mixm_laal_is_core_plugin_active()) {
        return new WP_Error('plugin_inactive', 'MixM Core 插件未激活');
    }
    
    if (function_exists('mixm_core_create_ride_order')) {
        return mixm_core_create_ride_order($args);
    }
    
    // Fallback: 通过 REST API 内部调用
    $request = new WP_REST_Request('POST', '/mixm/v1/rides');
    $request->set_body_params($args);
    $response = rest_do_request($request);
    
    if (is_wp_error($response)) {
        return $response;
    }
    
    return $response->get_data();
}

/**
 * 获取用户打车订单列表
 *
 * @param int $user_id 用户 ID
 * @param array $args 查询参数
 * @return array|WP_Error
 */
function mixm_laal_get_user_ride_orders($user_id, $args = array()) {
    if (!mixm_laal_is_core_plugin_active()) {
        return new WP_Error('plugin_inactive', 'MixM Core 插件未激活');
    }
    
    global $wpdb;
    $table = $wpdb->prefix . 'mixm_ride_orders';
    
    $user_id = intval($user_id);
    $page = isset($args['page']) ? max(1, intval($args['page'])) : 1;
    $per_page = isset($args['per_page']) ? min(50, intval($args['per_page'])) : 10;
    $status = isset($args['status']) ? sanitize_text_field($args['status']) : '';
    
    $where = $wpdb->prepare('WHERE user_id = %d', $user_id);
    $params = array($user_id);
    
    if ($status) {
        $where .= ' AND status = %s';
        $params[] = $status;
    }
    
    $offset = ($page - 1) * $per_page;
    
    $total = (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM $table $where", $params));
    
    $orders = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM $table $where ORDER BY created_at DESC LIMIT %d OFFSET %d",
        array_merge($params, array($per_page, $offset))
    ));
    
    return array(
        'data' => $orders,
        'total' => $total,
        'page' => $page,
        'per_page' => $per_page
    );
}

// ==================== 外卖模块桥接 ====================

/**
 * 获取外卖商家列表
 *
 * @param array $args 查询参数
 * @return array|WP_Error
 */
function mixm_laal_get_food_merchants($args = array()) {
    if (!mixm_laal_is_core_plugin_active()) {
        return new WP_Error('plugin_inactive', 'MixM Core 插件未激活');
    }
    
    global $wpdb;
    $table = $wpdb->prefix . 'mixm_merchants';
    
    $page = isset($args['page']) ? max(1, intval($args['page'])) : 1;
    $per_page = isset($args['per_page']) ? min(50, intval($args['per_page'])) : 10;
    $category = isset($args['category']) ? sanitize_text_field($args['category']) : '';
    $keyword = isset($args['keyword']) ? sanitize_text_field($args['keyword']) : '';
    
    $where = "WHERE status = 'active'";
    $params = array();
    
    if ($category) {
        $where .= ' AND category = %s';
        $params[] = $category;
    }
    
    if ($keyword) {
        $like = '%' . $wpdb->esc_like($keyword) . '%';
        $where .= ' AND (name LIKE %s OR description LIKE %s)';
        $params[] = $like;
        $params[] = $like;
    }
    
    $offset = ($page - 1) * $per_page;
    
    $total = (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM $table $where", $params));
    
    $merchants = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM $table $where ORDER BY rating DESC, sales_count DESC LIMIT %d OFFSET %d",
        array_merge($params, array($per_page, $offset))
    ));
    
    return array(
        'data' => $merchants,
        'total' => $total,
        'page' => $page,
        'per_page' => $per_page
    );
}

/**
 * 获取商家菜品列表
 *
 * @param int $merchant_id 商家 ID
 * @param array $args 查询参数
 * @return array|WP_Error
 */
function mixm_laal_get_merchant_dishes($merchant_id, $args = array()) {
    if (!mixm_laal_is_core_plugin_active()) {
        return new WP_Error('plugin_inactive', 'MixM Core 插件未激活');
    }
    
    global $wpdb;
    $table = $wpdb->prefix . 'mixm_merchant_dishes';
    
    $merchant_id = intval($merchant_id);
    $category = isset($args['category']) ? sanitize_text_field($args['category']) : '';
    
    $where = $wpdb->prepare('WHERE merchant_id = %d AND status = %s', $merchant_id, 'published');
    $params = array($merchant_id, 'published');
    
    if ($category) {
        $where .= ' AND category = %s';
        $params[] = $category;
    }
    
    $dishes = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM $table $where ORDER BY sort_order ASC, id DESC",
        $params
    ));
    
    return $dishes;
}

// ==================== 跑腿模块桥接 ====================

/**
 * 创建跑腿订单
 *
 * @param array $args 订单参数
 * @return array|WP_Error
 */
function mixm_laal_create_errand_order($args) {
    if (!mixm_laal_is_core_plugin_active()) {
        return new WP_Error('plugin_inactive', 'MixM Core 插件未激活');
    }
    
    if (function_exists('mixm_core_create_errand_order')) {
        return mixm_core_create_errand_order($args);
    }
    
    $request = new WP_REST_Request('POST', '/mixm/v1/errands');
    $request->set_body_params($args);
    $response = rest_do_request($request);
    
    if (is_wp_error($response)) {
        return $response;
    }
    
    return $response->get_data();
}

// ==================== 骑手模块桥接 ====================

/**
 * 获取骑手信息
 *
 * @param int $driver_id 骑手 ID
 * @return object|null|WP_Error
 */
function mixm_laal_get_driver_info($driver_id) {
    if (!mixm_laal_is_core_plugin_active()) {
        return new WP_Error('plugin_inactive', 'MixM Core 插件未激活');
    }
    
    global $wpdb;
    $table = $wpdb->prefix . 'mixm_drivers';
    
    $driver_id = intval($driver_id);
    $driver = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM $table WHERE id = %d",
        $driver_id
    ));
    
    return $driver;
}

/**
 * 获取附近骑手列表
 *
 * @param float $lat 纬度
 * @param float $lng 经度
 * @param int $radius 半径（米）
 * @return array|WP_Error
 */
function mixm_laal_get_nearby_drivers($lat, $lng, $radius = 5000) {
    if (!mixm_laal_is_core_plugin_active()) {
        return new WP_Error('plugin_inactive', 'MixM Core 插件未激活');
    }
    
    global $wpdb;
    $table = $wpdb->prefix . 'mixm_drivers';
    
    $lat = floatval($lat);
    $lng = floatval($lng);
    $radius = floatval($radius);
    
    // 简单距离计算（Haversine 公式简化版）
    $drivers = $wpdb->get_results($wpdb->prepare(
        "SELECT *, 
                (6371000 * acos(cos(radians(%f)) * cos(radians(current_lat)) 
                 * cos(radians(current_lng) - radians(%f)) 
                 + sin(radians(%f)) * sin(radians(current_lat)))) 
                AS distance
         FROM $table
         WHERE status = 'online' AND is_approved = 1
         HAVING distance < %d
         ORDER BY distance ASC
         LIMIT 20",
        $lat, $lng, $lat, $radius
    ));
    
    return $drivers;
}

// ==================== 营销活动桥接 ====================

/**
 * 获取活动列表
 *
 * @param array $args 查询参数
 * @return array|WP_Error
 */
function mixm_laal_get_activities($args = array()) {
    if (!mixm_laal_is_core_plugin_active()) {
        return new WP_Error('plugin_inactive', 'MixM Core 插件未激活');
    }
    
    global $wpdb;
    $table = $wpdb->prefix . 'mixm_activities';
    
    $page = isset($args['page']) ? max(1, intval($args['page'])) : 1;
    $per_page = isset($args['per_page']) ? min(50, intval($args['per_page'])) : 10;
    $type = isset($args['type']) ? sanitize_text_field($args['type']) : '';
    
    $where = "WHERE status = 'active'";
    $params = array();
    
    if ($type) {
        $where .= ' AND type = %s';
        $params[] = $type;
    }
    
    $offset = ($page - 1) * $per_page;
    
    $total = (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM $table $where", $params));
    
    $activities = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM $table $where ORDER BY sort_order ASC, id DESC LIMIT %d OFFSET %d",
        array_merge($params, array($per_page, $offset))
    ));
    
    return array(
        'data' => $activities,
        'total' => $total,
        'page' => $page,
        'per_page' => $per_page
    );
}

// ==================== 拼团模块桥接 ====================

/**
 * 获取拼团活动列表
 *
 * @param array $args 查询参数
 * @return array|WP_Error
 */
function mixm_laal_get_group_buy_activities($args = array()) {
    if (!mixm_laal_is_core_plugin_active()) {
        return new WP_Error('plugin_inactive', 'MixM Core 插件未激活');
    }
    
    global $wpdb;
    $table = $wpdb->prefix . 'mixm_group_buy';
    
    $page = isset($args['page']) ? max(1, intval($args['page'])) : 1;
    $per_page = isset($args['per_page']) ? min(50, intval($args['per_page'])) : 10;
    
    $where = "WHERE status = 'active' AND end_time > NOW()";
    
    $offset = ($page - 1) * $per_page;
    
    $total = (int) $wpdb->get_var("SELECT COUNT(*) FROM $table $where");
    
    $activities = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM $table $where ORDER BY created_at DESC LIMIT %d OFFSET %d",
        array($per_page, $offset)
    ));
    
    return array(
        'data' => $activities,
        'total' => $total,
        'page' => $page,
        'per_page' => $per_page
    );
}

// ==================== 工单系统桥接 ====================

/**
 * 创建工单
 *
 * @param array $args 工单参数
 * @return array|WP_Error
 */
function mixm_laal_create_ticket($args) {
    if (!mixm_laal_is_core_plugin_active()) {
        return new WP_Error('plugin_inactive', 'MixM Core 插件未激活');
    }
    
    if (function_exists('mixm_core_create_ticket')) {
        return mixm_core_create_ticket($args);
    }
    
    $request = new WP_REST_Request('POST', '/mixm/v1/tickets');
    $request->set_body_params($args);
    $response = rest_do_request($request);
    
    if (is_wp_error($response)) {
        return $response;
    }
    
    return $response->get_data();
}

/**
 * 获取用户工单列表
 *
 * @param int $user_id 用户 ID
 * @param array $args 查询参数
 * @return array|WP_Error
 */
function mixm_laal_get_user_tickets($user_id, $args = array()) {
    if (!mixm_laal_is_core_plugin_active()) {
        return new WP_Error('plugin_inactive', 'MixM Core 插件未激活');
    }
    
    global $wpdb;
    $table = $wpdb->prefix . 'mixm_tickets';
    
    $user_id = intval($user_id);
    $page = isset($args['page']) ? max(1, intval($args['page'])) : 1;
    $per_page = isset($args['per_page']) ? min(50, intval($args['per_page'])) : 10;
    $status = isset($args['status']) ? sanitize_text_field($args['status']) : '';
    
    $where = $wpdb->prepare('WHERE user_id = %d', $user_id);
    $params = array($user_id);
    
    if ($status) {
        $where .= ' AND status = %s';
        $params[] = $status;
    }
    
    $offset = ($page - 1) * $per_page;
    
    $total = (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM $table $where", $params));
    
    $tickets = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM $table $where ORDER BY created_at DESC LIMIT %d OFFSET %d",
        array_merge($params, array($per_page, $offset))
    ));
    
    return array(
        'data' => $tickets,
        'total' => $total,
        'page' => $page,
        'per_page' => $per_page
    );
}

// ==================== 统一支付桥接 ====================

/**
 * 通过主题支付网关处理插件订单支付
 *
 * @param string $module 模块类型 (ride/food/errand)
 * @param int $order_id 订单 ID
 * @param string $gateway 支付网关
 * @return array|WP_Error
 */
function mixm_laal_process_plugin_payment($module, $order_id, $gateway = 'alipay') {
    if (!mixm_laal_is_core_plugin_active()) {
        return new WP_Error('plugin_inactive', 'MixM Core 插件未激活');
    }
    
    if (!function_exists('mixm_laal_get_payment_gateway')) {
        return new WP_Error('payment_unavailable', '支付系统不可用');
    }
    
    $order_id = intval($order_id);
    $module = sanitize_text_field($module);
    $gateway = sanitize_text_field($gateway);
    
    // 获取订单信息
    global $wpdb;
    $order = null;
    
    switch ($module) {
        case 'ride':
            $table = $wpdb->prefix . 'mixm_ride_orders';
            $order = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table WHERE id = %d", $order_id));
            break;
        case 'food':
            $table = $wpdb->prefix . 'mixm_food_orders';
            $order = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table WHERE id = %d", $order_id));
            break;
        case 'errand':
            $table = $wpdb->prefix . 'mixm_errand_orders';
            $order = $wpdb->get_row($wpdb->prepare("SELECT id, order_no, actual_price as total_amount, user_id FROM $table WHERE id = %d", $order_id));
            break;
    }
    
    if (!$order) {
        return new WP_Error('order_not_found', '订单不存在');
    }
    
    // 构建统一订单对象
    $payment_order = (object) array(
        'id' => $order->id,
        'order_number' => $order->order_no,
        'total_amount' => isset($order->actual_price) ? $order->actual_price : $order->total_price,
        'title' => ucfirst($module) . " 订单 {$order->order_no}",
        'module' => $module,
        'user_id' => $order->user_id
    );
    
    // 调用主题支付网关
    $payment_gateway = mixm_laal_get_payment_gateway($gateway);
    
    if (!$payment_gateway) {
        return new WP_Error('gateway_not_found', '支付网关不存在');
    }
    
    try {
        $result = $payment_gateway->create_payment($payment_order);
        return $result;
    } catch (Exception $e) {
        return new WP_Error('payment_failed', $e->getMessage());
    }
}

/**
 * 处理插件订单支付成功回调
 *
 * @param string $module 模块类型
 * @param string $order_no 订单号
 * @param string $gateway 支付网关
 * @return bool
 */
function mixm_laal_handle_plugin_payment_success($module, $order_no, $gateway) {
    if (!mixm_laal_is_core_plugin_active()) {
        return false;
    }
    
    global $wpdb;
    $order_no = sanitize_text_field($order_no);
    $module = sanitize_text_field($module);
    
    $table = '';
    switch ($module) {
        case 'ride':
            $table = $wpdb->prefix . 'mixm_ride_orders';
            break;
        case 'food':
            $table = $wpdb->prefix . 'mixm_food_orders';
            break;
        case 'errand':
            $table = $wpdb->prefix . 'mixm_errand_orders';
            break;
        default:
            return false;
    }
    
    // 更新订单状态为已支付
    $result = $wpdb->update(
        $table,
        array(
            'status' => 'paid',
            'paid_at' => current_time('mysql')
        ),
        array('order_no' => $order_no),
        array('%s', '%s'),
        array('%s')
    );
    
    if ($result !== false) {
        // 触发支付成功钩子，供其他模块处理
        do_action('mixm_laal_plugin_payment_success', $module, $order_no, $gateway);
        return true;
    }
    
    return false;
}

// ==================== 用户中心集成 ====================

/**
 * 获取用户的所有插件订单统计
 *
 * @param int $user_id 用户 ID
 * @return array
 */
function mixm_laal_get_plugin_order_stats($user_id) {
    if (!mixm_laal_is_core_plugin_active()) {
        return array();
    }
    
    global $wpdb;
    $user_id = intval($user_id);
    
    $stats = array();
    
    // 打车订单统计
    $ride_table = $wpdb->prefix . 'mixm_ride_orders';
    $ride_total = (int) $wpdb->get_var($wpdb->prepare(
        "SELECT COUNT(*) FROM $ride_table WHERE user_id = %d",
        $user_id
    ));
    $stats['rides'] = array(
        'total' => $ride_total,
        'label' => '打车订单'
    );
    
    // 外卖订单统计
    $food_table = $wpdb->prefix . 'mixm_food_orders';
    $food_total = (int) $wpdb->get_var($wpdb->prepare(
        "SELECT COUNT(*) FROM $food_table WHERE user_id = %d",
        $user_id
    ));
    $stats['food'] = array(
        'total' => $food_total,
        'label' => '外卖订单'
    );
    
    // 跑腿订单统计
    $errand_table = $wpdb->prefix . 'mixm_errand_orders';
    $errand_total = (int) $wpdb->get_var($wpdb->prepare(
        "SELECT COUNT(*) FROM $errand_table WHERE user_id = %d",
        $user_id
    ));
    $stats['errands'] = array(
        'total' => $errand_total,
        'label' => '跑腿订单'
    );
    
    return $stats;
}
```

- [ ] **Step 2: 在 functions.php 中引入桥接层**

在 `wp-content/themes/mixm-laal/functions.php` 中，在模块加载部分添加：

```php
// 插件桥接层
require_once get_template_directory() . '/inc/plugin-bridge.php';
```

插入位置：在 `require_once get_template_directory() . '/inc/module-integration.php';` 之后

---

### Task 2: 集成插件短代码到主题

**Files:**
- Create: `wp-content/themes/mixm-laal/inc/plugin-shortcodes.php`
- Modify: `wp-content/themes/mixm-laal/functions.php` (引入短代码)

**Interfaces:**
- Consumes: plugin-bridge.php 中的桥接函数
- Produces: 主题侧可直接使用的插件功能短代码

**Goal:** 创建一组短代码，让用户可以在主题页面中直接嵌入插件功能

**Steps:**

- [ ] **Step 1: 创建 plugin-shortcodes.php 文件**

```php
<?php
/**
 * 插件功能短代码
 * 提供在主题中嵌入插件功能的短代码
 *
 * @package MixM_Laal
 * @version 1.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

// ==================== 打车模块短代码 ====================

/**
 * 打车功能短代码
 * 用法: [mixm_ride]
 *
 * @param array $atts 短代码属性
 * @return string
 */
function mixm_laal_shortcode_ride($atts) {
    if (!mixm_laal_is_core_plugin_active()) {
        return '<div class="mixm-notice">打车功能暂不可用，请先激活 MixM Core 插件</div>';
    }
    
    $atts = shortcode_atts(array(
        'show_map' => 'true',
        'vehicle_types' => 'economy,comfort, premium',
    ), $atts, 'mixm_ride');
    
    ob_start();
    ?>
    <div class="mixm-ride-widget mixm-plugin-widget" id="mixm-ride-widget">
        <div class="ride-header">
            <h3><i class="fas fa-car"></i> 打车出行</h3>
        </div>
        <div class="ride-form">
            <div class="form-group">
                <label for="ride-pickup">出发地点</label>
                <input type="text" id="ride-pickup" name="pickup_address" placeholder="请输入出发地点" autocomplete="off">
                <div class="location-suggestions" id="pickup-suggestions"></div>
            </div>
            <div class="form-group">
                <label for="ride-dest">目的地</label>
                <input type="text" id="ride-dest" name="dest_address" placeholder="请输入目的地" autocomplete="off">
                <div class="location-suggestions" id="dest-suggestions"></div>
            </div>
            <div class="form-group">
                <label>车型选择</label>
                <div class="vehicle-types">
                    <?php
                    $types = explode(',', $atts['vehicle_types']);
                    $vehicle_labels = array(
                        'economy' => array('label' => '经济型', 'icon' => 'fa-car', 'multiplier' => 1.0),
                        'comfort' => array('label' => '舒适型', 'icon' => 'fa-car-side', 'multiplier' => 1.5),
                        'premium' => array('label' => '豪华型', 'icon' => 'fa-crown', 'multiplier' => 2.0),
                    );
                    foreach ($types as $type) {
                        $type = trim($type);
                        if (isset($vehicle_labels[$type])) {
                            $label = $vehicle_labels[$type];
                            echo '<div class="vehicle-type" data-type="' . esc_attr($type) . '" data-multiplier="' . esc_attr($label['multiplier']) . '">';
                            echo '<i class="fas ' . esc_attr($label['icon']) . '"></i>';
                            echo '<span>' . esc_html($label['label']) . '</span>';
                            echo '</div>';
                        }
                    }
                    ?>
                </div>
            </div>
            <div class="ride-estimate" id="ride-estimate" style="display: none;">
                <div class="estimate-row">
                    <span>预估距离</span>
                    <span id="estimate-distance">-</span>
                </div>
                <div class="estimate-row">
                    <span>预估时间</span>
                    <span id="estimate-duration">-</span>
                </div>
                <div class="estimate-row estimate-price">
                    <span>预估费用</span>
                    <span id="estimate-price">¥ -</span>
                </div>
            </div>
            <button type="button" class="ride-submit-btn" id="ride-submit-btn" disabled>
                <i class="fas fa-search"></i> 立即叫车
            </button>
        </div>
    </div>
    <?php
    
    // 前端脚本本地化
    wp_enqueue_script('mixm-ride-frontend');
    wp_localize_script('mixm-ride-frontend', 'mixm_ride_data', array(
        'ajax_url' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('mixm_ride_nonce'),
        'is_user_logged_in' => is_user_logged_in(),
        'login_url' => wp_login_url(get_permalink()),
    ));
    
    return ob_get_clean();
}
add_shortcode('mixm_ride', 'mixm_laal_shortcode_ride');

// ==================== 外卖模块短代码 ====================

/**
 * 外卖商家列表短代码
 * 用法: [mixm_food category="快餐" keyword=""]
 *
 * @param array $atts 短代码属性
 * @return string
 */
function mixm_laal_shortcode_food($atts) {
    if (!mixm_laal_is_core_plugin_active()) {
        return '<div class="mixm-notice">外卖功能暂不可用，请先激活 MixM Core 插件</div>';
    }
    
    $atts = shortcode_atts(array(
        'category' => '',
        'keyword' => '',
        'per_page' => 10,
        'show_filter' => 'true',
    ), $atts, 'mixm_food');
    
    ob_start();
    ?>
    <div class="mixm-food-widget mixm-plugin-widget" id="mixm-food-widget">
        <div class="food-header">
            <h3><i class="fas fa-utensils"></i> 外卖美食</h3>
            <?php if ($atts['show_filter'] === 'true') : ?>
            <div class="food-search">
                <input type="text" id="food-keyword" placeholder="搜索商家或菜品">
                <button type="button" id="food-search-btn"><i class="fas fa-search"></i></button>
            </div>
            <?php endif; ?>
        </div>
        <div class="food-categories" id="food-categories">
            <span class="category-item active" data-category="">全部</span>
            <span class="category-item" data-category="快餐">快餐</span>
            <span class="category-item" data-category="中餐">中餐</span>
            <span class="category-item" data-category="西餐">西餐</span>
            <span class="category-item" data-category="甜品">甜品</span>
            <span class="category-item" data-category="饮品">饮品</span>
        </div>
        <div class="food-merchant-list" id="food-merchant-list">
            <div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> 加载中...</div>
        </div>
        <div class="food-pagination" id="food-pagination"></div>
    </div>
    <?php
    
    wp_localize_script('mixm-food-frontend', 'mixm_food_data', array(
        'ajax_url' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('mixm_food_nonce'),
        'per_page' => intval($atts['per_page']),
        'category' => sanitize_text_field($atts['category']),
        'keyword' => sanitize_text_field($atts['keyword']),
    ));
    
    return ob_get_clean();
}
add_shortcode('mixm_food', 'mixm_laal_shortcode_food');

// ==================== 跑腿模块短代码 ====================

/**
 * 跑腿功能短代码
 * 用法: [mixm_errand]
 *
 * @param array $atts 短代码属性
 * @return string
 */
function mixm_laal_shortcode_errand($atts) {
    if (!mixm_laal_is_core_plugin_active()) {
        return '<div class="mixm-notice">跑腿功能暂不可用，请先激活 MixM Core 插件</div>';
    }
    
    $atts = shortcode_atts(array(
        'types' => 'delivery,pickup,buy',
    ), $atts, 'mixm_errand');
    
    ob_start();
    ?>
    <div class="mixm-errand-widget mixm-plugin-widget" id="mixm-errand-widget">
        <div class="errand-header">
            <h3><i class="fas fa-running"></i> 跑腿服务</h3>
        </div>
        <div class="errand-types">
            <?php
            $types = explode(',', $atts['types']);
            $type_labels = array(
                'delivery' => array('label' => '帮我送', 'icon' => 'fa-box'),
                'pickup' => array('label' => '帮我取', 'icon' => 'fa-hand-holding'),
                'buy' => array('label' => '帮我买', 'icon' => 'fa-shopping-bag'),
            );
            foreach ($types as $type) {
                $type = trim($type);
                if (isset($type_labels[$type])) {
                    $label = $type_labels[$type];
                    echo '<div class="errand-type" data-type="' . esc_attr($type) . '">';
                    echo '<i class="fas ' . esc_attr($label['icon']) . '"></i>';
                    echo '<span>' . esc_html($label['label']) . '</span>';
                    echo '</div>';
                }
            }
            ?>
        </div>
        <div class="errand-form" id="errand-form">
            <div class="form-group">
                <label>物品描述</label>
                <textarea id="errand-description" rows="3" placeholder="请描述需要跑腿的物品或事情"></textarea>
            </div>
            <div class="form-group">
                <label>取件地址</label>
                <input type="text" id="errand-pickup" placeholder="请输入取件地址">
            </div>
            <div class="form-group">
                <label>送达地址</label>
                <input type="text" id="errand-delivery" placeholder="请输入送达地址">
            </div>
            <div class="form-group">
                <label>联系人信息</label>
                <div class="contact-info">
                    <input type="text" id="errand-receiver-name" placeholder="收件人姓名">
                    <input type="tel" id="errand-receiver-phone" placeholder="联系电话">
                </div>
            </div>
            <div class="form-group">
                <label>备注信息</label>
                <textarea id="errand-remark" rows="2" placeholder="选填，其他要求或注意事项"></textarea>
            </div>
            <div class="errand-estimate" id="errand-estimate" style="display: none;">
                <div class="estimate-row">
                    <span>预估距离</span>
                    <span id="errand-distance">-</span>
                </div>
                <div class="estimate-row estimate-price">
                    <span>预估费用</span>
                    <span id="errand-price">¥ -</span>
                </div>
            </div>
            <button type="button" class="errand-submit-btn" id="errand-submit-btn">
                <i class="fas fa-paper-plane"></i> 提交订单
            </button>
        </div>
    </div>
    <?php
    
    wp_localize_script('mixm-errand-frontend', 'mixm_errand_data', array(
        'ajax_url' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('mixm_errand_nonce'),
        'is_user_logged_in' => is_user_logged_in(),
        'login_url' => wp_login_url(get_permalink()),
    ));
    
    return ob_get_clean();
}
add_shortcode('mixm_errand', 'mixm_laal_shortcode_errand');

// ==================== 营销活动短代码 ====================

/**
 * 活动列表短代码
 * 用法: [mixm_activity type="coupon" limit=5]
 *
 * @param array $atts 短代码属性
 * @return string
 */
function mixm_laal_shortcode_activity($atts) {
    if (!mixm_laal_is_core_plugin_active()) {
        return '';
    }
    
    $atts = shortcode_atts(array(
        'type' => '',
        'limit' => 5,
        'style' => 'card', // card, list, banner
    ), $atts, 'mixm_activity');
    
    $activities = mixm_laal_get_activities(array(
        'type' => $atts['type'],
        'per_page' => intval($atts['limit']),
    ));
    
    if (is_wp_error($activities) || empty($activities['data'])) {
        return '';
    }
    
    ob_start();
    ?>
    <div class="mixm-activity-widget mixm-plugin-widget style-<?php echo esc_attr($atts['style']); ?>">
        <?php if ($atts['style'] === 'banner') : ?>
            <div class="activity-banner-slider">
                <?php foreach ($activities['data'] as $activity) : ?>
                    <div class="activity-banner-item" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                        <div class="banner-content">
                            <h3><?php echo esc_html($activity->title); ?></h3>
                            <p><?php echo esc_html($activity->description); ?></p>
                            <button class="banner-btn">立即参与</button>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        <?php elseif ($atts['style'] === 'list') : ?>
            <ul class="activity-list">
                <?php foreach ($activities['data'] as $activity) : ?>
                    <li class="activity-item">
                        <div class="activity-icon"><i class="fas fa-tag"></i></div>
                        <div class="activity-info">
                            <h4><?php echo esc_html($activity->title); ?></h4>
                            <p><?php echo esc_html(wp_trim_words($activity->description, 15)); ?></p>
                        </div>
                        <div class="activity-arrow"><i class="fas fa-chevron-right"></i></div>
                    </li>
                <?php endforeach; ?>
            </ul>
        <?php else : ?>
            <div class="activity-card-grid">
                <?php foreach ($activities['data'] as $activity) : ?>
                    <div class="activity-card">
                        <div class="card-thumb" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                            <span class="card-tag"><?php echo esc_html(ucfirst($activity->type)); ?></span>
                        </div>
                        <div class="card-body">
                            <h4><?php echo esc_html($activity->title); ?></h4>
                            <p><?php echo esc_html(wp_trim_words($activity->description, 20)); ?></p>
                            <button class="card-btn">查看详情</button>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
    </div>
    <?php
    
    return ob_get_clean();
}
add_shortcode('mixm_activity', 'mixm_laal_shortcode_activity');

// ==================== 拼团模块短代码 ====================

/**
 * 拼团活动短代码
 * 用法: [mixm_group_buy limit=6]
 *
 * @param array $atts 短代码属性
 * @return string
 */
function mixm_laal_shortcode_group_buy($atts) {
    if (!mixm_laal_is_core_plugin_active()) {
        return '';
    }
    
    $atts = shortcode_atts(array(
        'limit' => 6,
        'columns' => 3,
    ), $atts, 'mixm_group_buy');
    
    $activities = mixm_laal_get_group_buy_activities(array(
        'per_page' => intval($atts['limit']),
    ));
    
    if (is_wp_error($activities) || empty($activities['data'])) {
        return '';
    }
    
    ob_start();
    ?>
    <div class="mixm-groupbuy-widget mixm-plugin-widget">
        <div class="groupbuy-header">
            <h3><i class="fas fa-users"></i> 拼团特惠</h3>
            <a href="#" class="view-all">查看全部 <i class="fas fa-chevron-right"></i></a>
        </div>
        <div class="groupbuy-grid grid-cols-<?php echo esc_attr($atts['columns']); ?>">
            <?php foreach ($activities['data'] as $activity) : ?>
                <div class="groupbuy-card">
                    <div class="groupbuy-thumb" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);">
                        <span class="groupbuy-tag">拼团</span>
                        <span class="groupbuy-count"><?php echo esc_html($activity->group_size); ?>人团</span>
                    </div>
                    <div class="groupbuy-body">
                        <h4 class="product-name"><?php echo esc_html($activity->product_name); ?></h4>
                        <div class="price-row">
                            <span class="groupbuy-price">¥<?php echo esc_html(number_format($activity->group_price, 2)); ?></span>
                            <span class="original-price">¥<?php echo esc_html(number_format($activity->original_price, 2)); ?></span>
                        </div>
                        <div class="progress-row">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: <?php echo esc_attr(min(100, ($activity->current_count / $activity->group_size) * 100)); ?>%"></div>
                            </div>
                            <span class="progress-text">已拼<?php echo esc_html($activity->current_count); ?>件</span>
                        </div>
                        <button class="groupbuy-btn">去开团</button>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    </div>
    <?php
    
    return ob_get_clean();
}
add_shortcode('mixm_group_buy', 'mixm_laal_shortcode_group_buy');

// ==================== 订单追踪短代码 ====================

/**
 * 订单追踪短代码
 * 用法: [mixm_order_tracking module="ride"]
 *
 * @param array $atts 短代码属性
 * @return string
 */
function mixm_laal_shortcode_order_tracking($atts) {
    if (!mixm_laal_is_core_plugin_active()) {
        return '<div class="mixm-notice">订单查询功能暂不可用</div>';
    }
    
    if (!is_user_logged_in()) {
        return '<div class="mixm-notice">请先<a href="' . esc_url(wp_login_url(get_permalink())) . '">登录</a>后查看订单</div>';
    }
    
    $atts = shortcode_atts(array(
        'module' => 'all', // all, ride, food, errand
        'limit' => 10,
    ), $atts, 'mixm_order_tracking');
    
    $user_id = get_current_user_id();
    
    ob_start();
    ?>
    <div class="mixm-order-tracking mixm-plugin-widget" id="mixm-order-tracking">
        <div class="order-tabs">
            <span class="order-tab <?php echo $atts['module'] === 'all' ? 'active' : ''; ?>" data-module="all">全部订单</span>
            <span class="order-tab <?php echo $atts['module'] === 'ride' ? 'active' : ''; ?>" data-module="ride">打车</span>
            <span class="order-tab <?php echo $atts['module'] === 'food' ? 'active' : ''; ?>" data-module="food">外卖</span>
            <span class="order-tab <?php echo $atts['module'] === 'errand' ? 'active' : ''; ?>" data-module="errand">跑腿</span>
        </div>
        <div class="order-status-filter">
            <span class="status-item active" data-status="">全部状态</span>
            <span class="status-item" data-status="pending">待支付</span>
            <span class="status-item" data-status="accepted">进行中</span>
            <span class="status-item" data-status="completed">已完成</span>
            <span class="status-item" data-status="cancelled">已取消</span>
        </div>
        <div class="order-list" id="order-list">
            <div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> 加载中...</div>
        </div>
        <div class="order-pagination" id="order-pagination"></div>
    </div>
    <?php
    
    wp_localize_script('mixm-order-frontend', 'mixm_order_data', array(
        'ajax_url' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('mixm_order_nonce'),
        'user_id' => $user_id,
        'module' => sanitize_text_field($atts['module']),
        'limit' => intval($atts['limit']),
    ));
    
    return ob_get_clean();
}
add_shortcode('mixm_order_tracking', 'mixm_laal_shortcode_order_tracking');

// ==================== 用户中心仪表盘短代码 ====================

/**
 * 用户中心插件模块仪表盘
 * 用法: [mixm_dashboard]
 *
 * @param array $atts 短代码属性
 * @return string
 */
function mixm_laal_shortcode_dashboard($atts) {
    if (!is_user_logged_in()) {
        return '<div class="mixm-notice">请先<a href="' . esc_url(wp_login_url(get_permalink())) . '">登录</a>后查看</div>';
    }
    
    if (!mixm_laal_is_core_plugin_active()) {
        return '';
    }
    
    $user_id = get_current_user_id();
    $stats = mixm_laal_get_plugin_order_stats($user_id);
    
    ob_start();
    ?>
    <div class="mixm-dashboard-widget mixm-plugin-widget">
        <div class="dashboard-header">
            <h3><i class="fas fa-th-large"></i> 生活服务</h3>
        </div>
        <div class="dashboard-stats">
            <?php foreach ($stats as $key => $stat) : ?>
                <div class="stat-item">
                    <div class="stat-icon">
                        <?php
                        $icons = array(
                            'rides' => 'fa-car',
                            'food' => 'fa-utensils',
                            'errands' => 'fa-running',
                        );
                        $icon = isset($icons[$key]) ? $icons[$key] : 'fa-box';
                        echo '<i class="fas ' . esc_attr($icon) . '"></i>';
                        ?>
                    </div>
                    <div class="stat-info">
                        <span class="stat-number"><?php echo esc_html($stat['total']); ?></span>
                        <span class="stat-label"><?php echo esc_html($stat['label']); ?></span>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
        <div class="dashboard-actions">
            <a href="#ride" class="action-btn ride-btn">
                <i class="fas fa-car"></i>
                <span>打车</span>
            </a>
            <a href="#food" class="action-btn food-btn">
                <i class="fas fa-utensils"></i>
                <span>外卖</span>
            </a>
            <a href="#errand" class="action-btn errand-btn">
                <i class="fas fa-running"></i>
                <span>跑腿</span>
            </a>
            <a href="#orders" class="action-btn orders-btn">
                <i class="fas fa-list-alt"></i>
                <span>订单</span>
            </a>
        </div>
    </div>
    <?php
    
    return ob_get_clean();
}
add_shortcode('mixm_dashboard', 'mixm_laal_shortcode_dashboard');
```

- [ ] **Step 2: 在 functions.php 中引入短代码**

在 `functions.php` 中，在引入 plugin-bridge.php 之后添加：

```php
// 插件功能短代码
require_once get_template_directory() . '/inc/plugin-shortcodes.php';
```

---

### Task 3: 统一用户角色和权限系统

**Files:**
- Create: `wp-content/themes/mixm-laal/inc/plugin-roles.php`
- Modify: `wp-content/themes/mixm-laal/functions.php` (引入角色权限)

**Interfaces:**
- Consumes: WordPress 用户角色系统
- Produces: 统一的用户角色和权限体系，包含骑手、商家等角色

**Goal:** 统一管理插件的用户角色（骑手、商家）和权限，使其与主题的会员系统整合

**Steps:**

- [ ] **Step 1: 创建 plugin-roles.php 文件**

```php
<?php
/**
 * 插件用户角色与权限
 * 统一管理骑手、商家等插件相关角色和权限
 *
 * @package MixM_Laal
 * @version 1.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * 注册插件相关的用户角色
 */
function mixm_laal_register_plugin_roles() {
    // 骑手角色
    add_role('mixm_driver', '骑手', array(
        'read' => true,
        'edit_profile' => true,
        'upload_files' => true,
        'mixm_view_ride_orders' => true,
        'mixm_accept_ride_orders' => true,
        'mixm_complete_ride_orders' => true,
        'mixm_view_own_earnings' => true,
        'mixm_manage_vehicle' => true,
    ));
    
    // 商家角色
    add_role('mixm_merchant', '商家', array(
        'read' => true,
        'edit_profile' => true,
        'upload_files' => true,
        'mixm_manage_merchant_profile' => true,
        'mixm_manage_dishes' => true,
        'mixm_view_food_orders' => true,
        'mixm_accept_food_orders' => true,
        'mixm_manage_order_status' => true,
        'mixm_view_own_sales' => true,
        'mixm_manage_discounts' => true,
    ));
    
    // 骑手待审核角色
    add_role('mixm_driver_pending', '骑手(待审核)', array(
        'read' => true,
        'edit_profile' => true,
    ));
    
    // 商家待审核角色
    add_role('mixm_merchant_pending', '商家(待审核)', array(
        'read' => true,
        'edit_profile' => true,
    ));
}
add_action('init', 'mixm_laal_register_plugin_roles');

/**
 * 添加插件权限到管理员角色
 */
function mixm_laal_add_admin_plugin_caps() {
    $admin = get_role('administrator');
    
    if ($admin) {
        // 打车模块权限
        $admin->add_cap('mixm_manage_rides');
        $admin->add_cap('mixm_view_all_ride_orders');
        
        // 外卖模块权限
        $admin->add_cap('mixm_manage_food');
        $admin->add_cap('mixm_view_all_food_orders');
        
        // 跑腿模块权限
        $admin->add_cap('mixm_manage_errands');
        $admin->add_cap('mixm_view_all_errand_orders');
        
        // 骑手管理权限
        $admin->add_cap('mixm_manage_drivers');
        $admin->add_cap('mixm_approve_drivers');
        
        // 商家管理权限
        $admin->add_cap('mixm_manage_merchants');
        $admin->add_cap('mixm_approve_merchants');
        
        // 营销活动权限
        $admin->add_cap('mixm_manage_activities');
        
        // 工单管理权限
        $admin->add_cap('mixm_manage_tickets');
        
        // 拼团管理权限
        $admin->add_cap('mixm_manage_group_buy');
    }
}
add_action('init', 'mixm_laal_add_admin_plugin_caps');

/**
 * 检查用户是否为骑手
 *
 * @param int $user_id 用户 ID
 * @return bool
 */
function mixm_laal_is_driver($user_id = 0) {
    if (!$user_id) {
        $user_id = get_current_user_id();
    }
    
    $user = get_user_by('id', $user_id);
    if (!$user) {
        return false;
    }
    
    return in_array('mixm_driver', (array) $user->roles) || in_array('mixm_driver_pending', (array) $user->roles);
}

/**
 * 检查用户是否为商家
 *
 * @param int $user_id 用户 ID
 * @return bool
 */
function mixm_laal_is_merchant($user_id = 0) {
    if (!$user_id) {
        $user_id = get_current_user_id();
    }
    
    $user = get_user_by('id', $user_id);
    if (!$user) {
        return false;
    }
    
    return in_array('mixm_merchant', (array) $user->roles) || in_array('mixm_merchant_pending', (array) $user->roles);
}

/**
 * 检查骑手是否已通过审核
 *
 * @param int $user_id 用户 ID
 * @return bool
 */
function mixm_laal_is_driver_approved($user_id = 0) {
    if (!$user_id) {
        $user_id = get_current_user_id();
    }
    
    $user = get_user_by('id', $user_id);
    if (!$user) {
        return false;
    }
    
    // 检查用户角色
    if (in_array('mixm_driver', (array) $user->roles)) {
        // 再检查插件中的审核状态
        if (mixm_laal_is_core_plugin_active()) {
            global $wpdb;
            $table = $wpdb->prefix . 'mixm_drivers';
            $driver = $wpdb->get_row($wpdb->prepare(
                "SELECT is_approved FROM $table WHERE user_id = %d",
                $user_id
            ));
            if ($driver && $driver->is_approved) {
                return true;
            }
        }
        return true;
    }
    
    return false;
}

/**
 * 检查商家是否已通过审核
 *
 * @param int $user_id 用户 ID
 * @return bool
 */
function mixm_laal_is_merchant_approved($user_id = 0) {
    if (!$user_id) {
        $user_id = get_current_user_id();
    }
    
    $user = get_user_by('id', $user_id);
    if (!$user) {
        return false;
    }
    
    if (in_array('mixm_merchant', (array) $user->roles)) {
        if (mixm_laal_is_core_plugin_active()) {
            global $wpdb;
            $table = $wpdb->prefix . 'mixm_merchants';
            $merchant = $wpdb->get_row($wpdb->prepare(
                "SELECT status FROM $table WHERE user_id = %d",
                $user_id
            ));
            if ($merchant && $merchant->status === 'active') {
                return true;
            }
        }
        return true;
    }
    
    return false;
}

/**
 * 用户角色升级为骑手
 *
 * @param int $user_id 用户 ID
 * @param bool $approved 是否已审核
 * @return bool
 */
function mixm_laal_set_user_as_driver($user_id, $approved = false) {
    $user_id = intval($user_id);
    $user = get_user_by('id', $user_id);
    
    if (!$user) {
        return false;
    }
    
    $role = $approved ? 'mixm_driver' : 'mixm_driver_pending';
    
    // 移除旧角色，添加新角色
    $user->remove_role('mixm_driver_pending');
    $user->add_role($role);
    
    do_action('mixm_laal_user_become_driver', $user_id, $approved);
    
    return true;
}

/**
 * 用户角色升级为商家
 *
 * @param int $user_id 用户 ID
 * @param bool $approved 是否已审核
 * @return bool
 */
function mixm_laal_set_user_as_merchant($user_id, $approved = false) {
    $user_id = intval($user_id);
    $user = get_user_by('id', $user_id);
    
    if (!$user) {
        return false;
    }
    
    $role = $approved ? 'mixm_merchant' : 'mixm_merchant_pending';
    
    $user->remove_role('mixm_merchant_pending');
    $user->add_role($role);
    
    do_action('mixm_laal_user_become_merchant', $user_id, $approved);
    
    return true;
}

/**
 * 在用户中心显示角色信息
 *
 * @return string
 */
function mixm_laal_user_role_badge() {
    if (!is_user_logged_in()) {
        return '';
    }
    
    $user_id = get_current_user_id();
    $badges = array();
    
    if (mixm_laal_is_driver($user_id)) {
        $approved = mixm_laal_is_driver_approved($user_id);
        $badges[] = sprintf(
            '<span class="user-badge driver-badge %s"><i class="fas fa-car"></i> %s</span>',
            $approved ? 'approved' : 'pending',
            $approved ? '骑手' : '骑手(待审核)'
        );
    }
    
    if (mixm_laal_is_merchant($user_id)) {
        $approved = mixm_laal_is_merchant_approved($user_id);
        $badges[] = sprintf(
            '<span class="user-badge merchant-badge %s"><i class="fas fa-store"></i> %s</span>',
            $approved ? 'approved' : 'pending',
            $approved ? '商家' : '商家(待审核)'
        );
    }
    
    if (empty($badges)) {
        return '';
    }
    
    return '<div class="user-role-badges">' . implode('', $badges) . '</div>';
}

/**
 * 获取用户可申请的角色列表
 *
 * @return array
 */
function mixm_laal_get_available_roles() {
    $roles = array();
    
    if (!mixm_laal_is_driver(get_current_user_id())) {
        $roles['driver'] = array(
            'name' => '骑手',
            'icon' => 'fa-car',
            'description' => '接单赚钱，时间自由',
            'apply_url' => '#apply-driver'
        );
    }
    
    if (!mixm_laal_is_merchant(get_current_user_id())) {
        $roles['merchant'] = array(
            'name' => '商家',
            'icon' => 'fa-store',
            'description' => '入驻开店，拓展客源',
            'apply_url' => '#apply-merchant'
        );
    }
    
    return apply_filters('mixm_laal_available_roles', $roles);
}
```

- [ ] **Step 2: 在 functions.php 中引入角色权限**

在 `functions.php` 中，在引入 plugin-shortcodes.php 之后添加：

```php
// 插件用户角色与权限
require_once get_template_directory() . '/inc/plugin-roles.php';
```

---

### Task 4: 插件模块注册到主题模块管理器

**Files:**
- Modify: `wp-content/themes/mixm-laal/inc/module-integration.php`

**Interfaces:**
- Consumes: 主题的模块管理器 MixM_Laal_Module_Manager
- Produces: 注册插件模块到主题的模块系统

**Goal:** 将插件的功能模块注册到主题的模块管理器中，实现统一的模块管理

**Steps:**

- [ ] **Step 1: 修改 module-integration.php 添加插件模块注册**

在 `module-integration.php` 文件中，在 `$module_manager->init();` 之前（或模块注册部分）添加：

```php
// ==================== 插件模块注册 ====================

/**
 * 注册 MixM Core 插件模块
 */
function mixm_laal_register_core_plugin_modules($module_manager) {
    if (!mixm_laal_is_core_plugin_active()) {
        return;
    }
    
    // 打车模块
    $module_manager->register_module('core_ride', array(
        'name' => '打车出行',
        'description' => '提供打车出行服务，支持多种车型选择',
        'version' => '1.0.0',
        'priority' => 10,
        'category' => 'life_service',
        'icon' => 'fa-car',
        'provider' => 'mixm-core',
        'is_active' => true,
        'settings' => array(
            'base_price' => 8.0,
            'price_per_km' => 2.5,
            'price_per_minute' => 0.5,
        ),
        'shortcodes' => array('mixm_ride'),
        'admin_page' => 'mixm-core-rides',
    ));
    
    // 外卖模块
    $module_manager->register_module('core_food', array(
        'name' => '外卖美食',
        'description' => '提供外卖点餐服务，附近美食送货上门',
        'version' => '1.0.0',
        'priority' => 11,
        'category' => 'life_service',
        'icon' => 'fa-utensils',
        'provider' => 'mixm-core',
        'is_active' => true,
        'shortcodes' => array('mixm_food'),
        'admin_page' => 'mixm-core-food',
    ));
    
    // 跑腿模块
    $module_manager->register_module('core_errand', array(
        'name' => '跑腿服务',
        'description' => '提供帮买、帮送、帮取等跑腿服务',
        'version' => '1.0.0',
        'priority' => 12,
        'category' => 'life_service',
        'icon' => 'fa-running',
        'provider' => 'mixm-core',
        'is_active' => true,
        'shortcodes' => array('mixm_errand'),
        'admin_page' => 'mixm-core-errands',
    ));
    
    // 骑手管理模块
    $module_manager->register_module('core_driver', array(
        'name' => '骑手管理',
        'description' => '骑手注册、审核、订单管理',
        'version' => '1.0.0',
        'priority' => 13,
        'category' => 'management',
        'icon' => 'fa-user-tie',
        'provider' => 'mixm-core',
        'is_active' => true,
        'admin_page' => 'mixm-core-drivers',
        'user_role' => 'mixm_driver',
    ));
    
    // 商家管理模块
    $module_manager->register_module('core_merchant', array(
        'name' => '商家管理',
        'description' => '商家入驻、审核、菜品管理',
        'version' => '1.0.0',
        'priority' => 14,
        'category' => 'management',
        'icon' => 'fa-store',
        'provider' => 'mixm-core',
        'is_active' => true,
        'admin_page' => 'mixm-core-merchants',
        'user_role' => 'mixm_merchant',
    ));
    
    // 营销活动模块
    $module_manager->register_module('core_activity', array(
        'name' => '营销活动',
        'description' => '优惠券、满减、折扣等营销活动',
        'version' => '1.0.0',
        'priority' => 20,
        'category' => 'marketing',
        'icon' => 'fa-tags',
        'provider' => 'mixm-core',
        'is_active' => true,
        'shortcodes' => array('mixm_activity'),
        'admin_page' => 'mixm-core-activities',
    ));
    
    // 拼团模块
    $module_manager->register_module('core_group_buy', array(
        'name' => '拼团活动',
        'description' => '拼团优惠，邀请好友一起买',
        'version' => '1.0.0',
        'priority' => 21,
        'category' => 'marketing',
        'icon' => 'fa-users',
        'provider' => 'mixm-core',
        'is_active' => true,
        'shortcodes' => array('mixm_group_buy'),
        'admin_page' => 'mixm-core-group-buy',
    ));
    
    // 工单系统模块
    $module_manager->register_module('core_ticket', array(
        'name' => '工单系统',
        'description' => '用户反馈、问题处理工单系统',
        'version' => '1.0.0',
        'priority' => 30,
        'category' => 'support',
        'icon' => 'fa-headset',
        'provider' => 'mixm-core',
        'is_active' => true,
        'shortcodes' => array('mixm_order_tracking'),
        'admin_page' => 'mixm-core-tickets',
    ));
    
    do_action('mixm_laal_after_register_core_modules', $module_manager);
}
add_action('mixm_laal_after_register_modules', 'mixm_laal_register_core_plugin_modules');
```

将此函数挂接到模块管理器初始化之后。找到 `$module_manager->init();` 这行代码，在它之前或之后添加钩子调用。

如果 module-integration.php 中有 `do_action('mixm_laal_after_register_modules', $module_manager);` 则无需修改，否则需要添加这个钩子。

---

### Task 5: 创建插件功能的主题页面模板

**Files:**
- Create: `wp-content/themes/mixm-laal/page-ride.php`
- Create: `wp-content/themes/mixm-laal/page-food.php`
- Create: `wp-content/themes/mixm-laal/page-errand.php`
- Create: `wp-content/themes/mixm-laal/page-service-center.php`

**Interfaces:**
- Consumes: plugin-shortcodes.php 中的短代码
- Produces: 独立的插件功能页面模板

**Goal:** 为插件功能创建独立的页面模板，提供完整的功能页面

**Steps:**

- [ ] **Step 1: 创建打车页面模板 page-ride.php**

```php
<?php
/**
 * Template Name: 打车出行
 * Description: 打车出行服务页面模板
 *
 * @package MixM_Laal
 */

get_header();
?>

<div id="primary" class="content-area">
    <main id="main" class="site-main">
        <div class="ride-page-container">
            <header class="page-header">
                <h1 class="page-title"><i class="fas fa-car"></i> 打车出行</h1>
                <p class="page-description">便捷出行，随叫随到</p>
            </header>
            
            <div class="ride-page-content">
                <div class="ride-main-section">
                    <?php echo do_shortcode('[mixm_ride]'); ?>
                </div>
                
                <div class="ride-side-section">
                    <div class="ride-info-card">
                        <h3><i class="fas fa-shield-alt"></i> 安全保障</h3>
                        <ul>
                            <li><i class="fas fa-check-circle"></i> 司机实名认证</li>
                            <li><i class="fas fa-check-circle"></i> 行程实时追踪</li>
                            <li><i class="fas fa-check-circle"></i> 一键报警功能</li>
                            <li><i class="fas fa-check-circle"></i> 全程行程保险</li>
                        </ul>
                    </div>
                    
                    <div class="ride-info-card">
                        <h3><i class="fas fa-star"></i> 服务优势</h3>
                        <ul>
                            <li><i class="fas fa-check-circle"></i> 快速响应，3分钟内接驾</li>
                            <li><i class="fas fa-check-circle"></i> 多种车型，满足不同需求</li>
                            <li><i class="fas fa-check-circle"></i> 透明计价，拒绝乱收费</li>
                            <li><i class="fas fa-check-circle"></i> 专业司机，安全可靠</li>
                        </ul>
                    </div>
                </div>
            </div>
            
            <?php if (is_user_logged_in()) : ?>
            <div class="ride-order-section">
                <h2><i class="fas fa-list-alt"></i> 我的订单</h2>
                <?php echo do_shortcode('[mixm_order_tracking module="ride" limit="5"]'); ?>
            </div>
            <?php endif; ?>
        </div>
    </main>
</div>

<?php
get_footer();
```

- [ ] **Step 2: 创建外卖页面模板 page-food.php**

```php
<?php
/**
 * Template Name: 外卖美食
 * Description: 外卖点餐服务页面模板
 *
 * @package MixM_Laal
 */

get_header();
?>

<div id="primary" class="content-area">
    <main id="main" class="site-main">
        <div class="food-page-container">
            <header class="page-header">
                <h1 class="page-title"><i class="fas fa-utensils"></i> 外卖美食</h1>
                <p class="page-description">美味佳肴，即刻送达</p>
            </header>
            
            <div class="food-page-content">
                <?php echo do_shortcode('[mixm_food per_page="12"]'); ?>
            </div>
            
            <?php if (is_user_logged_in()) : ?>
            <div class="food-order-section">
                <h2><i class="fas fa-list-alt"></i> 我的订单</h2>
                <?php echo do_shortcode('[mixm_order_tracking module="food" limit="5"]'); ?>
            </div>
            <?php endif; ?>
        </div>
    </main>
</div>

<?php
get_footer();
```

- [ ] **Step 3: 创建跑腿页面模板 page-errand.php**

```php
<?php
/**
 * Template Name: 跑腿服务
 * Description: 跑腿服务页面模板
 *
 * @package MixM_Laal
 */

get_header();
?>

<div id="primary" class="content-area">
    <main id="main" class="site-main">
        <div class="errand-page-container">
            <header class="page-header">
                <h1 class="page-title"><i class="fas fa-running"></i> 跑腿服务</h1>
                <p class="page-description">帮买帮送，省时省心</p>
            </header>
            
            <div class="errand-page-content">
                <div class="errand-main-section">
                    <?php echo do_shortcode('[mixm_errand]'); ?>
                </div>
                
                <div class="errand-side-section">
                    <div class="errand-info-card">
                        <h3><i class="fas fa-box"></i> 服务范围</h3>
                        <div class="service-types">
                            <div class="service-type">
                                <i class="fas fa-shopping-bag"></i>
                                <h4>帮我买</h4>
                                <p>帮你购买指定商品，送货上门</p>
                            </div>
                            <div class="service-type">
                                <i class="fas fa-hand-holding"></i>
                                <h4>帮我取</h4>
                                <p>帮你取快递、文件等物品</p>
                            </div>
                            <div class="service-type">
                                <i class="fas fa-truck"></i>
                                <h4>帮我送</h4>
                                <p>帮你送文件、礼品等物品</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="errand-info-card">
                        <h3><i class="fas fa-clock"></i> 服务时间</h3>
                        <p>7x24小时全天服务</p>
                        <p>平均30分钟上门取件</p>
                    </div>
                </div>
            </div>
            
            <?php if (is_user_logged_in()) : ?>
            <div class="errand-order-section">
                <h2><i class="fas fa-list-alt"></i> 我的订单</h2>
                <?php echo do_shortcode('[mixm_order_tracking module="errand" limit="5"]'); ?>
            </div>
            <?php endif; ?>
        </div>
    </main>
</div>

<?php
get_footer();
```

- [ ] **Step 4: 创建生活服务中心页面模板 page-service-center.php**

```php
<?php
/**
 * Template Name: 生活服务中心
 * Description: 综合生活服务中心页面
 *
 * @package MixM_Laal
 */

get_header();
?>

<div id="primary" class="content-area">
    <main id="main" class="site-main">
        <div class="service-center-container">
            <header class="page-header">
                <h1 class="page-title"><i class="fas fa-th-large"></i> 生活服务中心</h1>
                <p class="page-description">一站式生活服务平台</p>
            </header>
            
            <?php if (is_user_logged_in()) : ?>
            <div class="service-dashboard">
                <?php echo do_shortcode('[mixm_dashboard]'); ?>
            </div>
            <?php endif; ?>
            
            <div class="service-grid">
                <div class="service-card ride-service">
                    <div class="service-icon"><i class="fas fa-car"></i></div>
                    <h3>打车出行</h3>
                    <p>便捷出行，随叫随到</p>
                    <a href="<?php echo esc_url(home_url('/ride')); ?>" class="service-btn">立即打车</a>
                </div>
                
                <div class="service-card food-service">
                    <div class="service-icon"><i class="fas fa-utensils"></i></div>
                    <h3>外卖美食</h3>
                    <p>美味佳肴，即刻送达</p>
                    <a href="<?php echo esc_url(home_url('/food')); ?>" class="service-btn">点外卖</a>
                </div>
                
                <div class="service-card errand-service">
                    <div class="service-icon"><i class="fas fa-running"></i></div>
                    <h3>跑腿服务</h3>
                    <p>帮买帮送，省时省心</p>
                    <a href="<?php echo esc_url(home_url('/errand')); ?>" class="service-btn">发跑腿</a>
                </div>
                
                <div class="service-card mall-service">
                    <div class="service-icon"><i class="fas fa-shopping-cart"></i></div>
                    <h3>商城购物</h3>
                    <p>精选好物，优惠多多</p>
                    <a href="<?php echo esc_url(home_url('/shop')); ?>" class="service-btn">去购物</a>
                </div>
            </div>
            
            <div class="activity-section">
                <h2 class="section-title"><i class="fas fa-fire"></i> 热门活动</h2>
                <?php echo do_shortcode('[mixm_activity style="card" limit="4"]'); ?>
            </div>
            
            <div class="groupbuy-section">
                <h2 class="section-title"><i class="fas fa-users"></i> 拼团特惠</h2>
                <?php echo do_shortcode('[mixm_group_buy limit="6" columns="3"]'); ?>
            </div>
            
            <?php if (is_user_logged_in()) : ?>
            <div class="order-section">
                <h2 class="section-title"><i class="fas fa-list-alt"></i> 我的订单</h2>
                <?php echo do_shortcode('[mixm_order_tracking module="all" limit="10"]'); ?>
            </div>
            <?php endif; ?>
            
            <div class="join-section">
                <h2 class="section-title"><i class="fas fa-handshake"></i> 加入我们</h2>
                <div class="join-cards">
                    <div class="join-card driver-join">
                        <div class="join-icon"><i class="fas fa-car-side"></i></div>
                        <h3>成为骑手</h3>
                        <p>时间自由，多劳多得</p>
                        <ul>
                            <li><i class="fas fa-check"></i> 时间灵活，随时接单</li>
                            <li><i class="fas fa-check"></i> 收入可观，多劳多得</li>
                            <li><i class="fas fa-check"></i> 安全保障，放心骑行</li>
                        </ul>
                        <button class="join-btn">立即申请</button>
                    </div>
                    
                    <div class="join-card merchant-join">
                        <div class="join-icon"><i class="fas fa-store"></i></div>
                        <h3>入驻商家</h3>
                        <p>开店入驻，拓展客源</p>
                        <ul>
                            <li><i class="fas fa-check"></i> 海量用户，流量支持</li>
                            <li><i class="fas fa-check"></i> 专业运营，保驾护航</li>
                            <li><i class="fas fa-check"></i> 快速结算，资金安全</li>
                        </ul>
                        <button class="join-btn">立即入驻</button>
                    </div>
                </div>
            </div>
        </div>
    </main>
</div>

<?php
get_footer();
```

---

### Task 6: 添加插件功能的前端样式

**Files:**
- Create: `wp-content/themes/mixm-laal/assets/css/plugin-integration.css`

**Interfaces:**
- Consumes: 主题现有 CSS 变量和设计系统
- Produces: 插件功能模块的统一样式

**Goal:** 为所有插件集成功能提供统一的前端样式，确保与主题设计风格一致

**Steps:**

- [ ] **Step 1: 创建 plugin-integration.css 样式文件**

```css
/* ==================== 插件集成通用样式 ==================== */

.mixm-plugin-widget {
    background: var(--bg-card, #fff);
    border-radius: 12px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
    padding: 20px;
    margin-bottom: 20px;
}

.mixm-plugin-widget h3 {
    margin: 0 0 15px 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary, #333);
    display: flex;
    align-items: center;
    gap: 8px;
}

.mixm-plugin-widget h3 i {
    color: var(--primary-color, #667eea);
}

.mixm-notice {
    background: #fff3cd;
    color: #856404;
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 15px;
    border-left: 4px solid #ffc107;
}

.mixm-notice a {
    color: #856404;
    text-decoration: underline;
}

.loading-spinner {
    text-align: center;
    padding: 30px;
    color: var(--text-secondary, #999);
}

.loading-spinner i {
    margin-right: 8px;
}

/* ==================== 打车模块样式 ==================== */

.mixm-ride-widget .ride-header {
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid var(--border-color, #eee);
}

.ride-form .form-group {
    margin-bottom: 16px;
}

.ride-form label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: var(--text-primary, #333);
}

.ride-form input[type="text"] {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid var(--border-color, #ddd);
    border-radius: 8px;
    font-size: 14px;
    transition: border-color 0.3s;
}

.ride-form input[type="text"]:focus {
    outline: none;
    border-color: var(--primary-color, #667eea);
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.vehicle-types {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
}

.vehicle-type {
    flex: 1;
    min-width: 80px;
    padding: 12px;
    border: 2px solid var(--border-color, #ddd);
    border-radius: 8px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s;
}

.vehicle-type:hover {
    border-color: var(--primary-color, #667eea);
}

.vehicle-type.active {
    border-color: var(--primary-color, #667eea);
    background: rgba(102, 126, 234, 0.05);
}

.vehicle-type i {
    font-size: 24px;
    color: var(--primary-color, #667eea);
    margin-bottom: 6px;
    display: block;
}

.vehicle-type span {
    font-size: 13px;
    color: var(--text-secondary, #666);
}

.ride-estimate {
    background: var(--bg-light, #f8f9fa);
    padding: 15px;
    border-radius: 8px;
    margin-bottom: 16px;
}

.estimate-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    font-size: 14px;
}

.estimate-row.estimate-price {
    font-size: 18px;
    font-weight: 600;
    color: var(--primary-color, #667eea);
    padding-top: 10px;
    margin-top: 6px;
    border-top: 1px dashed var(--border-color, #ddd);
}

.ride-submit-btn {
    width: 100%;
    padding: 14px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
}

.ride-submit-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.ride-submit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

/* ==================== 外卖模块样式 ==================== */

.mixm-food-widget .food-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    padding-bottom: 15px;
    border-bottom: 1px solid var(--border-color, #eee);
}

.food-search {
    display: flex;
    gap: 8px;
}

.food-search input {
    padding: 8px 12px;
    border: 1px solid var(--border-color, #ddd);
    border-radius: 6px;
    font-size: 13px;
}

.food-search button {
    padding: 8px 14px;
    background: var(--primary-color, #667eea);
    color: #fff;
    border: none;
    border-radius: 6px;
    cursor: pointer;
}

.food-categories {
    display: flex;
    gap: 10px;
    margin-bottom: 15px;
    overflow-x: auto;
    padding-bottom: 5px;
}

.category-item {
    padding: 6px 14px;
    background: var(--bg-light, #f5f5f5);
    border-radius: 20px;
    font-size: 13px;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.3s;
}

.category-item:hover {
    background: var(--primary-lighter, #e0e7ff);
}

.category-item.active {
    background: var(--primary-color, #667eea);
    color: #fff;
}

.food-merchant-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
}

@media (max-width: 768px) {
    .food-merchant-list {
        grid-template-columns: 1fr;
    }
}

.merchant-card {
    background: var(--bg-card, #fff);
    border: 1px solid var(--border-color, #eee);
    border-radius: 10px;
    overflow: hidden;
    transition: transform 0.3s, box-shadow 0.3s;
    cursor: pointer;
}

.merchant-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
}

.merchant-thumb {
    height: 120px;
    background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
    position: relative;
}

.merchant-thumb .merchant-rating {
    position: absolute;
    top: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.6);
    color: #fff;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
}

.merchant-info {
    padding: 12px;
}

.merchant-info h4 {
    margin: 0 0 6px 0;
    font-size: 15px;
    font-weight: 600;
}

.merchant-meta {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: var(--text-secondary, #999);
}

/* ==================== 跑腿模块样式 ==================== */

.mixm-errand-widget .errand-header {
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid var(--border-color, #eee);
}

.errand-types {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
}

.errand-type {
    flex: 1;
    padding: 16px;
    border: 2px solid var(--border-color, #ddd);
    border-radius: 10px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s;
}

.errand-type:hover {
    border-color: var(--primary-color, #10b981);
}

.errand-type.active {
    border-color: var(--primary-color, #10b981);
    background: rgba(16, 185, 129, 0.05);
}

.errand-type i {
    font-size: 28px;
    color: var(--primary-color, #10b981);
    margin-bottom: 8px;
    display: block;
}

.errand-type span {
    font-size: 14px;
    font-weight: 500;
}

.errand-form .form-group {
    margin-bottom: 16px;
}

.errand-form label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
}

.errand-form input,
.errand-form textarea {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid var(--border-color, #ddd);
    border-radius: 8px;
    font-size: 14px;
    font-family: inherit;
    resize: vertical;
}

.errand-form input:focus,
.errand-form textarea:focus {
    outline: none;
    border-color: var(--primary-color, #10b981);
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

.contact-info {
    display: flex;
    gap: 10px;
}

.contact-info input {
    flex: 1;
}

.errand-estimate {
    background: var(--bg-light, #f8f9fa);
    padding: 15px;
    border-radius: 8px;
    margin-bottom: 16px;
}

.errand-submit-btn {
    width: 100%;
    padding: 14px;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s;
}

.errand-submit-btn:hover {
    transform: translateY(-1px);
}

/* ==================== 活动模块样式 ==================== */

.activity-card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 16px;
}

.activity-card {
    background: var(--bg-card, #fff);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    transition: transform 0.3s, box-shadow 0.3s;
}

.activity-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.card-thumb {
    height: 140px;
    position: relative;
}

.card-tag {
    position: absolute;
    top: 12px;
    left: 12px;
    background: rgba(255, 255, 255, 0.9);
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
}

.card-body {
    padding: 15px;
}

.card-body h4 {
    margin: 0 0 8px 0;
    font-size: 16px;
    font-weight: 600;
}

.card-body p {
    margin: 0 0 12px 0;
    font-size: 13px;
    color: var(--text-secondary, #666);
    line-height: 1.5;
}

.card-btn {
    width: 100%;
    padding: 8px;
    background: transparent;
    border: 1px solid var(--primary-color, #667eea);
    color: var(--primary-color, #667eea);
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.3s;
}

.card-btn:hover {
    background: var(--primary-color, #667eea);
    color: #fff;
}

/* ==================== 拼团模块样式 ==================== */

.groupbuy-grid {
    display: grid;
    gap: 16px;
}

.groupbuy-grid.grid-cols-3 {
    grid-template-columns: repeat(3, 1fr);
}

.groupbuy-grid.grid-cols-2 {
    grid-template-columns: repeat(2, 1fr);
}

@media (max-width: 768px) {
    .groupbuy-grid.grid-cols-3,
    .groupbuy-grid.grid-cols-2 {
        grid-template-columns: 1fr;
    }
}

.groupbuy-card {
    background: var(--bg-card, #fff);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.groupbuy-thumb {
    height: 160px;
    position: relative;
}

.groupbuy-tag {
    position: absolute;
    top: 10px;
    left: 10px;
    background: #ff4d4f;
    color: #fff;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
}

.groupbuy-count {
    position: absolute;
    top: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.6);
    color: #fff;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 12px;
}

.groupbuy-body {
    padding: 15px;
}

.product-name {
    margin: 0 0 10px 0;
    font-size: 15px;
    font-weight: 600;
    line-height: 1.4;
    height: 42px;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
}

.price-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 10px;
}

.groupbuy-price {
    font-size: 22px;
    font-weight: 700;
    color: #ff4d4f;
}

.original-price {
    font-size: 13px;
    color: var(--text-secondary, #999);
    text-decoration: line-through;
}

.progress-row {
    margin-bottom: 12px;
}

.progress-bar {
    height: 8px;
    background: #f0f0f0;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 6px;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #ff4d4f, #ff7875);
    border-radius: 4px;
    transition: width 0.3s;
}

.progress-text {
    font-size: 12px;
    color: var(--text-secondary, #999);
}

.groupbuy-btn {
    width: 100%;
    padding: 10px;
    background: linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%);
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.3s;
}

.groupbuy-btn:hover {
    opacity: 0.9;
}

/* ==================== 订单追踪样式 ==================== */

.order-tabs {
    display: flex;
    gap: 20px;
    margin-bottom: 15px;
    padding-bottom: 15px;
    border-bottom: 1px solid var(--border-color, #eee);
}

.order-tab {
    font-size: 14px;
    color: var(--text-secondary, #666);
    cursor: pointer;
    padding-bottom: 8px;
    border-bottom: 2px solid transparent;
    transition: all 0.3s;
}

.order-tab:hover {
    color: var(--primary-color, #667eea);
}

.order-tab.active {
    color: var(--primary-color, #667eea);
    border-bottom-color: var(--primary-color, #667eea);
    font-weight: 500;
}

.order-status-filter {
    display: flex;
    gap: 15px;
    margin-bottom: 15px;
    flex-wrap: wrap;
}

.status-item {
    font-size: 13px;
    color: var(--text-secondary, #666);
    cursor: pointer;
    padding: 4px 12px;
    border-radius: 20px;
    transition: all 0.3s;
}

.status-item:hover {
    background: var(--bg-light, #f5f5f5);
}

.status-item.active {
    background: var(--primary-lighter, #e0e7ff);
    color: var(--primary-color, #667eea);
}

.order-list .order-item {
    padding: 15px;
    border: 1px solid var(--border-color, #eee);
    border-radius: 8px;
    margin-bottom: 12px;
}

.order-item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}

.order-no {
    font-size: 13px;
    color: var(--text-secondary, #666);
}

.order-status {
    font-size: 13px;
    font-weight: 500;
    padding: 3px 10px;
    border-radius: 20px;
}

.order-status.pending {
    background: #fff7e6;
    color: #fa8c16;
}

.order-status.accepted,
.order-status.paid {
    background: #e6f7ff;
    color: #1890ff;
}

.order-status.completed {
    background: #f6ffed;
    color: #52c41a;
}

.order-status.cancelled {
    background: #fff1f0;
    color: #ff4d4f;
}

/* ==================== 仪表盘样式 ==================== */

.dashboard-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 16px;
    margin-bottom: 20px;
}

.stat-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 15px;
    background: var(--bg-light, #f8f9fa);
    border-radius: 10px;
}

.stat-icon {
    width: 44px;
    height: 44px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
}

.stat-info {
    display: flex;
    flex-direction: column;
}

.stat-number {
    font-size: 22px;
    font-weight: 700;
    color: var(--text-primary, #333);
}

.stat-label {
    font-size: 12px;
    color: var(--text-secondary, #999);
}

.dashboard-actions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 12px;
}

.action-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 16px 12px;
    background: var(--bg-card, #fff);
    border: 1px solid var(--border-color, #eee);
    border-radius: 10px;
    text-decoration: none;
    color: var(--text-primary, #333);
    transition: all 0.3s;
}

.action-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.action-btn i {
    font-size: 24px;
}

.ride-btn i { color: #667eea; }
.food-btn i { color: #fa8c16; }
.errand-btn i { color: #52c41a; }
.orders-btn i { color: #1890ff; }

.action-btn span {
    font-size: 13px;
    font-weight: 500;
}

/* ==================== 生活服务中心页面样式 ==================== */

.service-center-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

.page-header {
    text-align: center;
    padding: 40px 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
    border-radius: 16px;
    margin-bottom: 30px;
}

.page-header .page-title {
    margin: 0 0 10px 0;
    font-size: 32px;
    font-weight: 700;
}

.page-header .page-description {
    margin: 0;
    font-size: 16px;
    opacity: 0.9;
}

.service-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 20px;
    margin-bottom: 40px;
}

.service-card {
    background: var(--bg-card, #fff);
    border-radius: 16px;
    padding: 30px;
    text-align: center;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
    transition: transform 0.3s, box-shadow 0.3s;
}

.service-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.service-icon {
    width: 64px;
    height: 64px;
    margin: 0 auto 16px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    color: #fff;
}

.ride-service .service-icon { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.food-service .service-icon { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
.errand-service .service-icon { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
.mall-service .service-icon { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }

.service-card h3 {
    margin: 0 0 8px 0;
    font-size: 20px;
    font-weight: 600;
}

.service-card p {
    margin: 0 0 16px 0;
    font-size: 14px;
    color: var(--text-secondary, #666);
}

.service-btn {
    display: inline-block;
    padding: 10px 24px;
    background: var(--primary-color, #667eea);
    color: #fff;
    border-radius: 8px;
    text-decoration: none;
    font-size: 14px;
    font-weight: 500;
    transition: opacity 0.3s;
}

.service-btn:hover {
    opacity: 0.9;
}

.section-title {
    font-size: 22px;
    font-weight: 600;
    margin: 0 0 20px 0;
    display: flex;
    align-items: center;
    gap: 10px;
}

.section-title i {
    color: var(--primary-color, #667eea);
}

.activity-section,
.groupbuy-section,
.order-section,
.join-section {
    margin-bottom: 40px;
}

.join-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
}

.join-card {
    background: var(--bg-card, #fff);
    border-radius: 16px;
    padding: 30px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
    text-align: center;
}

.join-icon {
    width: 72px;
    height: 72px;
    margin: 0 auto 16px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    color: #fff;
}

.driver-join .join-icon { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.merchant-join .join-icon { background: linear-gradient(135deg, #fa8c16 0%, #f5222d 100%); }

.join-card h3 {
    margin: 0 0 8px 0;
    font-size: 22px;
    font-weight: 600;
}

.join-card > p {
    margin: 0 0 16px 0;
    color: var(--text-secondary, #666);
}

.join-card ul {
    text-align: left;
    list-style: none;
    padding: 0;
    margin: 0 0 20px 0;
}

.join-card ul li {
    padding: 6px 0;
    color: var(--text-secondary, #666);
}

.join-card ul li i {
    color: #52c41a;
    margin-right: 8px;
}

.join-btn {
    width: 100%;
    padding: 12px;
    background: transparent;
    border: 2px solid var(--primary-color, #667eea);
    color: var(--primary-color, #667eea);
    border-radius: 8px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
}

.join-btn:hover {
    background: var(--primary-color, #667eea);
    color: #fff;
}

/* ==================== 用户角色徽章样式 ==================== */

.user-role-badges {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 8px;
}

.user-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
}

.driver-badge {
    background: #e6f7ff;
    color: #1890ff;
}

.driver-badge.pending {
    background: #fff7e6;
    color: #fa8c16;
}

.merchant-badge {
    background: #f6ffed;
    color: #52c41a;
}

.merchant-badge.pending {
    background: #fff7e6;
    color: #fa8c16;
}

/* ==================== 响应式适配 ==================== */

@media (max-width: 768px) {
    .mixm-plugin-widget {
        padding: 15px;
    }
    
    .page-header .page-title {
        font-size: 24px;
    }
    
    .service-grid {
        grid-template-columns: repeat(2, 1fr);
    }
    
    .vehicle-types {
        gap: 8px;
    }
    
    .vehicle-type {
        min-width: 60px;
        padding: 10px 8px;
    }
    
    .vehicle-type i {
        font-size: 20px;
    }
    
    .vehicle-type span {
        font-size: 11px;
    }
    
    .errand-types {
        flex-direction: column;
        gap: 10px;
    }
    
    .dashboard-stats {
        grid-template-columns: repeat(2, 1fr);
    }
    
    .dashboard-actions {
        grid-template-columns: repeat(2, 1fr);
    }
    
    .order-tabs {
        gap: 12px;
        font-size: 13px;
    }
    
    .contact-info {
        flex-direction: column;
    }
}
```

- [ ] **Step 2: 在主题中加载样式**

在 `functions.php` 的 `mixm_laal_scripts()` 函数中（或主题资源加载函数中），添加样式加载：

```php
// 插件集成样式
wp_enqueue_style('mixm-laal-plugin-integration', get_template_directory_uri() . '/assets/css/plugin-integration.css', array(), '1.0.0', 'all');
```

---

### Task 7: 更新 functions.php 引入所有新模块

**Files:**
- Modify: `wp-content/themes/mixm-laal/functions.php`

**Goal:** 在 functions.php 中正确引入所有新创建的集成文件

注意：此任务的步骤已分散在前面各任务中，此任务用于确保所有引入都已正确添加并按正确顺序排列。

正确的引入顺序应为：
1. plugin-bridge.php （桥接层，基础）
2. plugin-roles.php （角色权限，依赖桥接层）
3. plugin-shortcodes.php （短代码，依赖桥接层）

---

## 集成验证检查清单

- [ ] **数据库兼容性**
  - [ ] 插件表 `wp_mixm_*` 与主题表 `wp_shop_*` 无命名冲突
  - [ ] 各模块数据表结构完整
  - [ ] 索引正确创建

- [ ] **API 路由**
  - [ ] 插件 API 路由 `/wp-json/mixm/v1/*` 正常注册
  - [ ] 主题 API 路由 `/wp-json/mixm-laal/v1/*` 正常注册
  - [ ] 权限验证正常工作

- [ ] **功能完整性**
  - [ ] 打车模块：下单、接单、完成、评价
  - [ ] 外卖模块：商家列表、菜品、下单
  - [ ] 跑腿模块：下单、接单、配送
  - [ ] 营销活动：列表展示、参与
  - [ ] 拼团活动：列表展示、开团
  - [ ] 订单追踪：各模块订单查询
  - [ ] 工单系统：创建、查询

- [ ] **用户系统**
  - [ ] 骑手角色注册正常
  - [ ] 商家角色注册正常
  - [ ] 权限检查正确
  - [ ] 用户中心显示角色信息

- [ ] **支付集成**
  - [ ] 插件订单可通过主题支付网关支付
  - [ ] 支付回调正确更新订单状态
  - [ ] 四个支付网关（支付宝、微信、PayPal、Stripe）均可用

- [ ] **前端展示**
  - [ ] 短代码正常渲染
  - [ ] 样式与主题风格一致
  - [ ] 移动端响应式正常
  - [ ] 无 JavaScript 错误

- [ ] **后台管理**
  - [ ] 插件后台菜单正常显示
  - [ ] 模块管理器中可见插件模块
  - [ ] 管理员权限正确

- [ ] **安全性**
  - [ ] 所有用户输入经过 sanitize
  - [ ] 所有输出经过转义
  - [ ] nonce 验证正确
  - [ ] 权限检查正确
