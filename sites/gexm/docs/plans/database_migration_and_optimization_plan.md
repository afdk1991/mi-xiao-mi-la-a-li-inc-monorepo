# 数据库优化和迁移方案

## 1. 现有数据库结构分析

### 1.1 现有结构概览

目前系统包含三个主要数据库环境：

1. **WordPress数据库** (laal_top)
2. **Laravel后端数据库** (核心内容管理)
3. **微服务后端数据库** (待整合)

### 1.2 Laravel后端数据库表结构

**核心表：**

- `users` - 用户信息表
- `posts` - 文章内容表
- `categories` - 文章分类表
- `tags` - 标签表
- `comments` - 评论表
- `user_follows` - 用户关注关系表

**权限系统表：**
- `roles` - 角色表
- `permissions` - 权限表
- `model_has_roles` - 用户角色关联表
- `model_has_permissions` - 用户权限关联表
- `role_has_permissions` - 角色权限关联表

**关联表：**
- `post_tags` - 文章标签关联表

## 2. 数据库整合优化方案

### 2.1 统一数据库架构

建议采用**统一数据库 + 分库分表**的架构，具体如下：

1. **核心数据库** (laal_core)：存储用户、权限、系统配置等核心数据
2. **内容数据库** (laal_content)：存储文章、分类、标签、评论等内容相关数据
3. **电商数据库** (laal_ecommerce)：存储商品、订单、支付等电商相关数据
4. **社区数据库** (laal_community)：存储社区帖子、互动等社区相关数据

### 2.2 表结构优化设计

#### 2.2.1 核心数据库表优化

**`users`表优化：**
- 增加`user_type`字段区分WordPress用户和系统用户
- 增加`created_from`字段记录来源系统
- 优化索引结构，添加常用查询的复合索引
- 分表策略：按用户ID范围分表

**权限系统优化：**
- 保持现有权限表结构
- 增加缓存层减少数据库查询

#### 2.2.2 内容数据库表优化

**`posts`表优化：**
- 优化`content`字段存储，考虑使用`MEDIUMTEXT`或`LONGTEXT`
- 增加`last_update_author_id`字段追踪最后编辑人
- 添加更多全文索引支持搜索
- 考虑使用分区表按时间范围分区

**`categories`表优化：**
- 增加`level`字段优化层级查询
- 增加`path`字段存储全路径，优化面包屑导航

**`comments`表优化：**
- 增加`comment_type`字段区分不同类型评论
- 优化嵌套评论查询性能
- 考虑使用MPTT树结构优化评论层级查询

#### 2.2.3 新增电商相关表

```sql
-- 商品表
CREATE TABLE products (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description LONGTEXT,
    short_description TEXT,
    price DECIMAL(10,2) NOT NULL,
    original_price DECIMAL(10,2) DEFAULT NULL,
    stock_quantity INT DEFAULT 0,
    SKU VARCHAR(100) DEFAULT NULL,
    images JSON,
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    category_id BIGINT UNSIGNED DEFAULT NULL,
    brand_id BIGINT UNSIGNED DEFAULT NULL,
    sales_count INT DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0,
    view_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    INDEX idx_status (status),
    INDEX idx_category_id (category_id),
    INDEX idx_brand_id (brand_id),
    FULLTEXT INDEX ft_name (name),
    FULLTEXT INDEX ft_description (description)
);

-- 订单表
CREATE TABLE orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_no VARCHAR(50) NOT NULL UNIQUE,
    user_id BIGINT UNSIGNED NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    actual_amount DECIMAL(10,2) NOT NULL,
    payment_status ENUM('unpaid', 'paid', 'refunded', 'partial_refunded') DEFAULT 'unpaid',
    order_status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    shipping_address JSON NOT NULL,
    billing_address JSON DEFAULT NULL,
    payment_method VARCHAR(50) DEFAULT NULL,
    payment_time TIMESTAMP NULL,
    shipping_fee DECIMAL(10,2) DEFAULT 0,
    coupon_id BIGINT UNSIGNED DEFAULT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    remark TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_order_no (order_no),
    INDEX idx_payment_status (payment_status),
    INDEX idx_order_status (order_status)
);

-- 订单商品关联表
CREATE TABLE order_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_price DECIMAL(10,2) NOT NULL,
    quantity INT NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    product_attributes JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_order_id (order_id),
    INDEX idx_product_id (product_id)
);

-- 购物车表
CREATE TABLE cart_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    quantity INT NOT NULL,
    product_attributes JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unq_user_product (user_id, product_id),
    INDEX idx_user_id (user_id),
    INDEX idx_product_id (product_id)
);
```

#### 2.2.4 新增社区相关表

```sql
-- 社区帖子表
CREATE TABLE community_posts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content LONGTEXT NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    topic_id BIGINT UNSIGNED NOT NULL,
    status ENUM('draft', 'published', 'closed') DEFAULT 'draft',
    view_count INT DEFAULT 0,
    comment_count INT DEFAULT 0,
    like_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_topic_id (topic_id),
    INDEX idx_status (status),
    FULLTEXT INDEX ft_title (title),
    FULLTEXT INDEX ft_content (content)
);

-- 话题表
CREATE TABLE topics (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT DEFAULT NULL,
    icon VARCHAR(50) DEFAULT NULL,
    post_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_slug (slug)
);

-- 用户收藏表
CREATE TABLE user_collections (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    item_type ENUM('post', 'product', 'community_post') NOT NULL,
    item_id BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unq_user_item (user_id, item_type, item_id),
    INDEX idx_user_id (user_id),
    INDEX idx_item (item_type, item_id)
);

-- 通知表
CREATE TABLE notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    type VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    data JSON DEFAULT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at)
);
```

## 3. 数据库迁移策略

### 3.1 WordPress数据迁移

**用户数据迁移：**
- 将WordPress用户表(wp_users)数据迁移到统一users表
- 密码需要使用WordPress兼容的哈希算法处理
- 保留用户元数据，存储在users表的settings JSON字段

**文章数据迁移：**
- 将WordPress文章(wp_posts)迁移到posts表
- 处理文章分类和标签映射
- 处理自定义字段，存储在settings JSON字段

**评论数据迁移：**
- 将WordPress评论(wp_comments)迁移到comments表
- 保持评论层级关系

### 3.2 现有Laravel数据迁移

**核心数据迁移：**
- 用户、角色、权限数据迁移到核心数据库
- 内容相关数据迁移到内容数据库
- 确保数据完整性和关联关系

### 3.3 迁移执行步骤

1. **备份阶段**
   - 备份所有现有数据库
   - 记录数据库结构和数据统计信息

2. **准备阶段**
   - 创建新的数据库结构
   - 准备迁移脚本和验证脚本

3. **执行迁移**
   - 按模块顺序执行数据迁移
   - 执行增量数据验证

4. **验证阶段**
   - 执行数据一致性检查
   - 执行功能测试

5. **切换阶段**
   - 切换应用配置指向新数据库
   - 监控系统性能和错误

## 4. 数据库性能优化

### 4.1 索引优化

- 为所有外键添加索引
- 为常用查询条件添加索引
- 优化复合索引顺序
- 定期重建和优化索引

### 4.2 查询优化

- 优化N+1查询问题
- 合理使用预加载(Eager Loading)
- 使用适当的查询缓存
- 避免全表扫描

### 4.3 存储优化

- 合理设置字段类型和长度
- 使用JSON类型存储灵活数据
- 定期清理过期数据
- 实现数据归档策略

### 4.4 高可用配置

- 实现主从复制
- 设置数据库集群
- 配置自动备份策略
- 实现读写分离

## 5. 迁移脚本示例

### 5.1 用户数据迁移脚本

```sql
-- WordPress用户迁移到统一用户表
INSERT INTO laal_core.users (
    id, name, username, email, password, 
    avatar, bio, website, location, status,
    created_at, updated_at, user_type, created_from
)
SELECT
    ID,
    display_name,
    user_login,
    user_email,
    user_pass,
    (SELECT meta_value FROM wp_usermeta WHERE user_id = wp_users.ID AND meta_key = 'avatar' LIMIT 1) as avatar,
    (SELECT meta_value FROM wp_usermeta WHERE user_id = wp_users.ID AND meta_key = 'description' LIMIT 1) as bio,
    (SELECT meta_value FROM wp_usermeta WHERE user_id = wp_users.ID AND meta_key = 'url' LIMIT 1) as website,
    NULL as location,
    'active',
    user_registered,
    user_registered,
    'wordpress',
    'wordpress'
FROM wp_users;

-- Laravel用户迁移到统一用户表
INSERT INTO laal_core.users (
    id, name, username, email, password, 
    avatar, bio, website, location, status,
    last_login_at, login_count, settings,
    created_at, updated_at, user_type, created_from
)
SELECT
    id,
    name,
    username,
    email,
    password,
    avatar,
    bio,
    website,
    location,
    status,
    last_login_at,
    login_count,
    settings,
    created_at,
    updated_at,
    'system',
    'laravel'
FROM users
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    username = VALUES(username),
    email = VALUES(email),
    password = VALUES(password),
    avatar = VALUES(avatar),
    bio = VALUES(bio),
    website = VALUES(website),
    location = VALUES(location),
    status = VALUES(status),
    last_login_at = VALUES(last_login_at),
    login_count = VALUES(login_count),
    settings = VALUES(settings),
    updated_at = VALUES(updated_at);
```

### 5.2 内容数据迁移脚本

```sql
-- WordPress文章迁移到posts表
INSERT INTO laal_content.posts (
    id, title, slug, content, excerpt, featured_image,
    status, author_id, category_id, views, likes,
    comment_count, seo_title, seo_description, seo_keywords,
    published_at, settings, created_at, updated_at
)
SELECT
    p.ID,
    p.post_title,
    p.post_name,
    p.post_content,
    p.post_excerpt,
    (SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_thumbnail_id') as featured_image,
    CASE 
        WHEN p.post_status = 'publish' THEN 'published'
        WHEN p.post_status = 'draft' THEN 'draft'
        ELSE 'pending'
    END as status,
    p.post_author,
    (SELECT term_taxonomy.term_id FROM wp_term_relationships 
     JOIN wp_term_taxonomy ON wp_term_relationships.term_taxonomy_id = wp_term_taxonomy.term_taxonomy_id
     WHERE wp_term_relationships.object_id = p.ID AND wp_term_taxonomy.taxonomy = 'category' LIMIT 1) as category_id,
    0,
    0,
    (SELECT COUNT(*) FROM wp_comments WHERE comment_post_ID = p.ID AND comment_approved = 1) as comment_count,
    (SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_yoast_wpseo_title' LIMIT 1) as seo_title,
    (SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_yoast_wpseo_metadesc' LIMIT 1) as seo_description,
    (SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_yoast_wpseo_focuskw' LIMIT 1) as seo_keywords,
    p.post_date,
    NULL,
    p.post_date,
    p.post_modified
FROM wp_posts p
WHERE p.post_type = 'post';
```

## 6. 迁移注意事项和风险控制

### 6.1 数据一致性保障

- 使用事务确保数据迁移的原子性
- 实现数据校验机制
- 保留原始数据备份

### 6.2 性能影响最小化

- 选择低峰期执行迁移
- 使用批量处理减少资源消耗
- 监控系统资源使用情况

### 6.3 回滚策略

- 制定详细的回滚计划
- 准备回滚脚本
- 设定回滚触发条件

### 6.4 安全性考虑

- 确保数据迁移过程中的数据安全
- 加密敏感信息
- 限制迁移操作的权限范围

## 7. 后续优化建议

### 7.1 监控与维护

- 建立数据库性能监控系统
- 设置定期备份和检查机制
- 实现自动化的性能报告

### 7.2 扩展规划

- 预留水平扩展空间
- 设计分库分表策略
- 考虑NoSQL数据库的集成

### 7.3 性能调优路线图

- 定期进行性能审计
- 优化慢查询
- 根据业务增长调整数据库配置