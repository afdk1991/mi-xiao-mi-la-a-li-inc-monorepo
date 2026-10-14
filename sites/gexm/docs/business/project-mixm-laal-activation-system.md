# MixM Laal主题活码系统、软件许可证管理和设备绑定实现域名绑定

## 1. 系统概述

MixM Laal主题已实现完整的活码系统、软件许可证管理和设备绑定及域名绑定功能。这些功能通过以下组件实现：

1. **活码系统（QR Code System）**
2. **软件许可证管理（License Management）**
3. **设备绑定（Device Binding）**
4. **域名绑定（Domain Binding）**

## 2. 活码系统实现

### 2.1 核心功能

MixM Laal主题实现了完整的活码系统，包括：

1. **QR码生成与管理**
2. **动态内容支持**
3. **扫码统计功能**
4. **自定义样式设置**

### 2.2 技术实现

#### 2.2.1 QR码系统类
```php
class MixM_Laal_QR_Code_System {
    // 初始化系统
    public function __construct() {
        add_action('init', array($this, 'init'));
        add_action('admin_menu', array($this, 'add_admin_menu'));
        // ...
    }
    
    // 创建数据库表
    private function create_qr_codes_table() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'mixm_laal_qr_codes';
        
        $sql = "CREATE TABLE IF NOT EXISTS $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            name varchar(255) NOT NULL,
            content text NOT NULL,
            type varchar(50) NOT NULL DEFAULT 'url',
            size int(11) NOT NULL DEFAULT 200,
            color varchar(7) NOT NULL DEFAULT '#000000',
            background varchar(7) NOT NULL DEFAULT '#ffffff',
            scans int(11) NOT NULL DEFAULT 0,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY  (id)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
}
```

#### 2.2.2 管理界面
系统提供了完整的管理界面，包括：
- QR码创建表单
- QR码列表展示
- 扫描统计显示
- QR码预览功能

#### 2.2.3 前端集成
```javascript
// QR码生成功能
$('.generate-qr-code').on('click', function(e) {
    e.preventDefault();
    
    var button = $(this);
    var content = button.data('content') || $('#qr-content').val();
    var size = button.data('size') || $('#qr-size').val() || 200;
    // ...
    
    // AJAX请求生成QR码
    $.ajax({
        url: mixm_laal_qr_code.ajax_url,
        type: 'POST',
        data: {
            action: 'generate_qr_code',
            nonce: mixm_laal_qr_code.nonce,
            content: content,
            size: size,
            color: color,
            background: background
        },
        success: function(response) {
            if (response.success) {
                // 显示QR码
                $('#qr-code-result').html('<img src="' + response.data.qr_url + '" alt="QR Code">');
            } else {
                alert('Error: ' + response.data);
            }
        }
    });
});
```

### 2.3 功能特点

1. **多种内容类型支持**：
   - URL链接
   - 文本内容
   - 邮箱地址
   - 电话号码
   - 短信内容

2. **自定义样式**：
   - 尺寸调整（100px-1000px）
   - 颜色自定义
   - 背景颜色设置

3. **统计功能**：
   - 扫描次数统计
   - 创建时间记录
   - 更新时间跟踪

## 3. 软件许可证管理

### 3.1 核心功能

许可证管理系统实现了以下功能：
1. **许可证激活/停用**
2. **设备绑定管理**
3. **过期时间控制**
4. **使用统计跟踪**

### 3.2 技术实现

#### 3.2.1 许可证验证
```php
/**
 * 检查主题是否已正确授权（激活）
 *
 * @return bool 已授权返回true，否则返回false
 */
function mixm_laal_is_theme_licensed() {
    // 从数据库获取存储的激活码
    $activation_code = get_option( 'mixm_laal_activation_code', '' );
    $device_id = mixm_laal_get_device_id();

    // 如果没有存储激活码，返回false
    if ( empty( $activation_code ) ) {
        return false;
    }

    // 获取主题产品ID
    $theme_product_id = get_option( 'mixm_laal_product_id', 0 );
    if ( ! $theme_product_id ) {
        // 默认产品ID为1
        $theme_product_id = 1;
    }

    // 验证激活码
    $is_valid = mixm_laal_validate_activation_code( $activation_code, $theme_product_id, $device_id );

    // 如果代码有效但未标记为已使用，则现在标记为已使用
    if ( $is_valid ) {
        mixm_laal_mark_activation_code_as_used( $activation_code, get_current_user_id(), $device_id );
        return true;
    }

    return false;
}
```

#### 3.2.2 许可证激活
```php
/**
 * 使用激活码激活主题
 *
 * @param string $code 激活码
 * @return array 包含成功状态和消息的结果数组
 */
function mixm_laal_activate_theme( $code ) {
    // 获取主题产品ID
    $theme_product_id = get_option( 'mixm_laal_product_id', 0 );
    if ( ! $theme_product_id ) {
        $theme_product_id = 1; // 默认产品ID
    }

    $device_id = mixm_laal_get_device_id();
    $domain = mixm_laal_get_current_domain();

    // 验证代码
    if ( mixm_laal_validate_activation_code( $code, $theme_product_id, $device_id ) ) {
        // 标记代码为已使用并与当前用户和设备关联
        mixm_laal_mark_activation_code_as_used( $code, get_current_user_id(), $device_id );

        // 更新激活码的域名
        mixm_laal_update_activation_code_domain( $code, $domain );

        // 存储激活码
        update_option( 'mixm_laal_activation_code', $code );

        return array(
            'success' => true,
            'message' => __( 'Theme activated successfully!', 'mixm-laal' )
        );
    } else {
        return array(
            'success' => false,
            'message' => __( 'Invalid or expired activation code.', 'mixm-laal' )
        );
    }
}
```

### 3.3 功能特点

1. **设备限制**：
   - 默认支持3个设备绑定
   - 可扩展设备数量

2. **过期控制**：
   - 支持设置过期时间
   - 自动检查许可证状态

3. **管理界面**：
   - 许可证信息展示
   - 激活/停用操作
   - 设备绑定状态查看

## 4. 设备绑定实现

### 4.1 核心功能

设备绑定系统实现了以下功能：
1. **唯一设备标识生成**
2. **设备绑定验证**
3. **设备使用统计**
4. **设备限制控制**

### 4.2 技术实现

#### 4.2.1 设备ID生成
```php
/**
 * 获取用于许可的唯一设备ID
 *
 * @return string 唯一的设备标识符
 */
function mixm_laal_get_device_id() {
    // 检查是否已存储设备ID
    $device_id = get_option( 'mixm_laal_device_id', '' );

    if ( empty( $device_id ) ) {
        // 生成唯一的设备ID
        $device_id = md5( site_url() . wp_generate_uuid4() );
        // 存储它
        update_option( 'mixm_laal_device_id', $device_id );
    }

    return $device_id;
}
```

#### 4.2.2 设备绑定验证
```php
/**
 * 标记激活码为已使用并管理设备限制
 *
 * @param string $code 激活码
 * @param int $user_id 用户ID
 * @param string $device_id 设备ID用于绑定
 * @return bool 成功返回true，失败返回false
 */
function mixm_laal_mark_activation_code_as_used( $code, $user_id = null, $device_id = null ) {
    global $wpdb;
    $table_name = $wpdb->prefix . 'mixm_laal_activation_codes';

    // 获取当前代码数据
    $code_data = $wpdb->get_row(
        $wpdb->prepare("SELECT * FROM $table_name WHERE code = %s", $code),
        ARRAY_A
    );

    if ( ! $code_data ) {
        return false;
    }

    $data = array(
        'is_used' => 1,
        'used_at' => current_time( 'mysql' )
    );

    if ( $user_id ) {
        $data['user_id'] = $user_id;
    }

    // 处理设备绑定和计数
    if ( $device_id ) {
        // 检查此设备是否已使用此代码
        if ( $code_data['device_id'] !== $device_id ) {
            // 新设备，检查限制
            if ( $code_data['device_count'] < $code_data['device_limit'] ) {
                $data['device_id'] = $device_id;
                $data['device_count'] = $code_data['device_count'] + 1;
            } else {
                // 设备限制已达到
                return false;
            }
        } else {
            // 相同设备，不更改计数
            $data['device_id'] = $device_id;
        }
    }

    return $wpdb->update(
        $table_name,
        $data,
        array( 'code' => $code ),
        array( '%d', '%s', '%d', '%s', '%d' ),
        array( '%s' )
    );
}
```

### 4.3 功能特点

1. **唯一标识**：
   - 基于站点URL和UUID生成
   - 持久化存储设备ID

2. **绑定控制**：
   - 支持多设备绑定
   - 设备数量限制
   - 绑定状态跟踪

3. **使用统计**：
   - 设备使用次数统计
   - 最后使用时间记录

## 5. 域名绑定实现

### 5.1 核心功能

域名绑定系统实现了以下功能：
1. **域名获取与验证**
2. **域名绑定管理**
3. **域名变更控制**
4. **变更次数限制**

### 5.2 技术实现

#### 5.2.1 域名获取
```php
/**
 * 获取当前站点域名
 *
 * @return string 当前域名
 */
function mixm_laal_get_current_domain() {
    return parse_url( site_url(), PHP_URL_HOST );
}
```

#### 5.2.2 域名绑定更新
```php
/**
 * 更新激活码的域名
 *
 * @param string $code 激活码
 * @param string $domain 新域名
 * @return bool 成功返回true，失败返回false
 */
function mixm_laal_update_activation_code_domain( $code, $domain ) {
    global $wpdb;
    $table_name = $wpdb->prefix . 'mixm_laal_activation_codes';

    // 获取当前代码数据
    $code_data = $wpdb->get_row(
        $wpdb->prepare("SELECT * FROM $table_name WHERE code = %s", $code),
        ARRAY_A
    );

    if ( ! $code_data ) {
        return false;
    }

    // 检查域名是否不同
    if ( $code_data['domain'] === $domain ) {
        return true; // 无需更改
    }

    // 检查域名变更限制是否已达到
    if ( $code_data['domain_change_count'] >= $code_data['domain_change_limit'] ) {
        // 域名变更限制已达到，需要付费
        return false;
    }

    // 更新域名并增加变更计数
    $data = array(
        'domain' => $domain,
        'domain_change_count' => $code_data['domain_change_count'] + 1
    );

    return $wpdb->update(
        $table_name,
        $data,
        array( 'code' => $code ),
        array( '%s', '%d' ),
        array( '%s' )
    );
}
```

#### 5.2.3 域名变更处理
```php
/**
 * 处理域名变更请求
 *
 * @return void
 */
function mixm_laal_handle_domain_change() {
    // 仅处理POST请求
    if ( ! isset( $_POST['mixm_laal_change_domain_nonce'] ) || ! wp_verify_nonce( $_POST['mixm_laal_change_domain_nonce'], 'mixm_laal_change_domain' ) ) {
        return;
    }

    // 检查用户权限
    if ( ! current_user_can( 'manage_options' ) ) {
        wp_die( __( 'You do not have sufficient permissions to perform this action.', 'mixm-laal' ) );
    }

    // 获取激活码
    $activation_code = get_option( 'mixm_laal_activation_code', '' );
    if ( empty( $activation_code ) ) {
        wp_die( __( 'Theme is not activated.', 'mixm-laal' ) );
    }

    // 检查是否允许域名变更
    $check_result = mixm_laal_check_domain_change_allowed( $activation_code );
    if ( ! $check_result['allowed'] ) {
        // 设置错误消息
        set_transient( 'mixm_laal_domain_change_error', $check_result['message'], 30 );
        // 重定向回域名设置页面
        wp_redirect( admin_url( 'admin.php?page=mixm-laal-domain-settings' ) );
        exit;
    }

    // 获取新域名（当前域名）
    $new_domain = mixm_laal_get_current_domain();

    // 更新域名
    if ( mixm_laal_update_activation_code_domain( $activation_code, $new_domain ) ) {
        // 设置成功消息
        set_transient( 'mixm_laal_domain_change_success', sprintf( __( 'Domain updated to %s successfully. You have %d changes remaining.', 'mixm-laal' ), $new_domain, $check_result['remaining_changes'] - 1 ), 30 );
    } else {
        // 设置错误消息
        set_transient( 'mixm_laal_domain_change_error', __( 'Failed to update domain. Please try again.', 'mixm-laal' ), 30 );
    }

    // 重定向回域名设置页面
    wp_redirect( admin_url( 'admin.php?page=mixm-laal-domain-settings' ) );
    exit;
}
```

### 5.3 功能特点

1. **域名验证**：
   - 自动获取当前站点域名
   - 域名变更检测

2. **变更控制**：
   - 默认允许3次域名变更
   - 变更次数限制
   - 超限购买机制

3. **管理界面**：
   - 域名信息展示
   - 变更操作按钮
   - 剩余变更次数显示

## 6. 数据库设计

### 6.1 激活码表结构
```sql
CREATE TABLE IF NOT EXISTS wp_mixm_laal_activation_codes (
    id mediumint(9) NOT NULL AUTO_INCREMENT,
    code varchar(50) NOT NULL,
    product_id int(11) NOT NULL,
    order_id int(11) DEFAULT NULL,
    user_id int(11) DEFAULT NULL,
    is_used tinyint(1) DEFAULT 0,
    created_at datetime DEFAULT CURRENT_TIMESTAMP,
    used_at datetime DEFAULT NULL,
    expires_at datetime DEFAULT NULL,
    device_id varchar(255) DEFAULT NULL,
    device_limit int(11) DEFAULT 1,
    device_count int(11) DEFAULT 0,
    domain varchar(255) DEFAULT NULL,
    domain_change_count int(11) DEFAULT 0,
    domain_change_limit int(11) DEFAULT 3,
    ipr_registered tinyint(1) DEFAULT 0,
    ipr_holder_name varchar(255) DEFAULT NULL,
    ipr_holder_email varchar(255) DEFAULT NULL,
    ipr_registration_date datetime DEFAULT NULL
    PRIMARY KEY  (id),
    UNIQUE KEY code (code)
) $charset_collate;
```

### 6.2 QR码表结构
```sql
CREATE TABLE IF NOT EXISTS wp_mixm_laal_qr_codes (
    id mediumint(9) NOT NULL AUTO_INCREMENT,
    name varchar(255) NOT NULL,
    content text NOT NULL,
    type varchar(50) NOT NULL DEFAULT 'url',
    size int(11) NOT NULL DEFAULT 200,
    color varchar(7) NOT NULL DEFAULT '#000000',
    background varchar(7) NOT NULL DEFAULT '#ffffff',
    scans int(11) NOT NULL DEFAULT 0,
    created_at datetime DEFAULT CURRENT_TIMESTAMP,
    updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY  (id)
) $charset_collate;
```

## 7. 安全机制

### 7.1 数据加密
- 设备ID使用MD5哈希算法生成
- 敏感信息在存储时进行处理

### 7.2 防篡改机制
- 许可证信息包含验证机制
- 激活码与特定产品绑定

### 7.3 访问控制
- 只有管理员可以管理系统
- 设备绑定信息受保护

## 8. 扩展建议

### 8.1 活码系统增强
1. 实现本地QR码生成，减少对第三方服务依赖
2. 增加QR码统计功能（扫描次数、来源等）
3. 支持动态内容变更的QR码

### 8.2 许可证系统优化
1. 增加许可证服务器验证机制
2. 实现许可证转移功能
3. 添加许可证使用统计

### 8.3 设备绑定改进
1. 支持设备解绑功能
2. 增加设备信息记录（操作系统、浏览器等）
3. 实现设备异常登录提醒

### 8.4 域名绑定增强
1. 支持通配符域名绑定
2. 增加域名白名单机制
3. 实现域名变更历史记录