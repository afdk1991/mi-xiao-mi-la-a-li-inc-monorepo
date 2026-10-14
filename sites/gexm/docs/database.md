# 数据字典文档

**文档版本**：v1.0.0
**最后更新**：2026-06-27
**数据库类型**：SQLite 3
**存储引擎**：WAL (Write-Ahead Logging)

---

## 目录

1. [数据库概述](#数据库概述)
2. [用户系统表](#用户系统表)
3. [商城模块表](#商城模块表)
4. [聊天消息表](#聊天消息表)
5. [通用表](#通用表)
6. [索引清单](#索引清单)
7. [枚举值定义](#枚举值定义)

---

## 数据库概述

### 设计规范

| 规范项 | 说明 |
|--------|------|
| 主键类型 | TEXT (UUID v4) |
| 时间字段 | TEXT (ISO 8601 格式) |
| 布尔值 | INTEGER (0/1) |
| JSON 字段 | TEXT (JSON 字符串存储) |
| 外键约束 | 启用 (ON DELETE CASCADE / SET NULL) |
| 命名风格 | 小写 + 下划线 (snake_case) |

### 表分类

| 分类 | 表数量 | 说明 |
|------|--------|------|
| 用户系统 | 2 | 用户表、刷新令牌表 |
| 商城模块 | 10 | 分类、商品、SKU、购物车、地址、订单、订单项、支付、评价、收藏 |
| 聊天消息 | 4 | 会话、消息、评论、会话阅读状态 |
| 通用 | 5 | 通知、文件、同步记录、错误日志、 |

---

## 用户系统表

### users（用户表）

用户核心信息表，存储所有注册用户的账号资料。

| 字段名 | 数据类型 | 允许空 | 默认值 | 说明 |
|--------|----------|--------|--------|------|
| id | TEXT | 否 | - | 主键，UUID v4 |
| username | TEXT | 否 | - | 用户名，唯一索引 |
| email | TEXT | 否 | - | 邮箱，唯一索引 |
| password | TEXT | 否 | - | 密码（bcrypt 加密） |
| nickname | TEXT | 是 | NULL | 昵称 |
| avatar | TEXT | 是 | NULL | 头像 URL |
| phone | TEXT | 是 | NULL | 手机号 |
| status | TEXT | 是 | 'active' | 账号状态，见[枚举值](#用户状态) |
| role | TEXT | 是 | 'user' | 用户角色，见[枚举值](#用户角色) |
| created_at | TEXT | 否 | - | 创建时间 (ISO 8601) |
| updated_at | TEXT | 否 | - | 更新时间 (ISO 8601) |
| last_login_at | TEXT | 是 | NULL | 最后登录时间 (ISO 8601) |

**索引**：
- `idx_users_username` (username)
- `idx_users_email` (email)

---

### refresh_tokens（刷新令牌表）

存储 JWT 刷新令牌，支持令牌吊销机制。

| 字段名 | 数据类型 | 允许空 | 默认值 | 说明 |
|--------|----------|--------|--------|------|
| id | TEXT | 否 | - | 主键，UUID v4 |
| user_id | TEXT | 否 | - | 关联用户 ID，外键 → users.id (ON DELETE CASCADE) |
| token | TEXT | 否 | - | 刷新令牌值，唯一 |
| expires_at | TEXT | 否 | - | 过期时间 (ISO 8601) |
| created_at | TEXT | 否 | - | 创建时间 (ISO 8601) |

---

## 商城模块表

### categories（商品分类表）

支持多级分类树形结构。

| 字段名 | 数据类型 | 允许空 | 默认值 | 说明 |
|--------|----------|--------|--------|------|
| id | TEXT | 否 | - | 主键，UUID v4 |
| name | TEXT | 否 | - | 分类名称 |
| parent_id | TEXT | 是 | NULL | 父分类 ID，外键 → categories.id (ON DELETE SET NULL) |
| level | INTEGER | 是 | 1 | 分类层级（1=一级，2=二级...） |
| icon | TEXT | 是 | NULL | 分类图标 |
| sort_order | INTEGER | 是 | 0 | 排序值，数值越小越靠前 |
| status | TEXT | 是 | 'active' | 状态，见[枚举值](#分类状态) |
| created_at | TEXT | 否 | - | 创建时间 |
| updated_at | TEXT | 否 | - | 更新时间 |

**索引**：
- `idx_categories_parent` (parent_id)
- `idx_categories_status` (status)

---

### products（商品表）

商品基本信息表。

| 字段名 | 数据类型 | 允许空 | 默认值 | 说明 |
|--------|----------|--------|--------|------|
| id | TEXT | 否 | - | 主键，UUID v4 |
| name | TEXT | 否 | - | 商品名称 |
| subtitle | TEXT | 是 | NULL | 副标题/卖点 |
| category_id | TEXT | 是 | NULL | 分类 ID，外键 → categories.id (ON DELETE SET NULL) |
| main_image | TEXT | 是 | NULL | 主图 URL |
| images | TEXT | 是 | NULL | 商品图片列表（JSON 数组字符串） |
| price | REAL | 否 | 0 | 销售价（元） |
| original_price | REAL | 是 | NULL | 原价（元） |
| stock | INTEGER | 是 | 0 | 总库存 |
| sales | INTEGER | 是 | 0 | 销量 |
| description | TEXT | 是 | NULL | 商品详情描述 |
| status | TEXT | 是 | 'on_sale' | 商品状态，见[枚举值](#商品状态) |
| sort_order | INTEGER | 是 | 0 | 排序值 |
| created_at | TEXT | 否 | - | 创建时间 |
| updated_at | TEXT | 否 | - | 更新时间 |

**索引**：
- `idx_products_category` (category_id)
- `idx_products_status` (status)
- `idx_products_sort` (sort_order)

---

### product_skus（商品 SKU 表）

商品规格库存单位表，支持多规格。

| 字段名 | 数据类型 | 允许空 | 默认值 | 说明 |
|--------|----------|--------|--------|------|
| id | TEXT | 否 | - | 主键，UUID v4 |
| product_id | TEXT | 否 | - | 关联商品 ID，外键 → products.id (ON DELETE CASCADE) |
| sku_name | TEXT | 否 | - | SKU 名称（如"标准版-黑色"） |
| specs | TEXT | 是 | NULL | 规格参数（JSON 对象字符串） |
| price | REAL | 否 | 0 | SKU 价格（元） |
| original_price | REAL | 是 | NULL | SKU 原价（元） |
| stock | INTEGER | 是 | 0 | SKU 库存 |
| sku_image | TEXT | 是 | NULL | SKU 图片 URL |
| created_at | TEXT | 否 | - | 创建时间 |
| updated_at | TEXT | 否 | - | 更新时间 |

**索引**：
- `idx_product_skus_product` (product_id)

---

### carts（购物车表）

用户购物车商品项。

| 字段名 | 数据类型 | 允许空 | 默认值 | 说明 |
|--------|----------|--------|--------|------|
| id | TEXT | 否 | - | 主键，UUID v4 |
| user_id | TEXT | 否 | - | 用户 ID，外键 → users.id (ON DELETE CASCADE) |
| product_id | TEXT | 否 | - | 商品 ID，外键 → products.id (ON DELETE CASCADE) |
| sku_id | TEXT | 是 | NULL | SKU ID，外键 → product_skus.id (ON DELETE SET NULL) |
| quantity | INTEGER | 是 | 1 | 商品数量 |
| selected | INTEGER | 是 | 1 | 是否选中（0=否，1=是） |
| created_at | TEXT | 否 | - | 创建时间 |
| updated_at | TEXT | 否 | - | 更新时间 |

**索引**：
- `idx_carts_user` (user_id)

**唯一约束**：(user_id, product_id, sku_id) 逻辑唯一（应用层保证）

---

### addresses（收货地址表）

用户收货地址管理。

| 字段名 | 数据类型 | 允许空 | 默认值 | 说明 |
|--------|----------|--------|--------|------|
| id | TEXT | 否 | - | 主键，UUID v4 |
| user_id | TEXT | 否 | - | 用户 ID，外键 → users.id (ON DELETE CASCADE) |
| name | TEXT | 否 | - | 收货人姓名 |
| phone | TEXT | 否 | - | 收货人手机号 |
| province | TEXT | 否 | - | 省份 |
| city | TEXT | 否 | - | 城市 |
| district | TEXT | 否 | - | 区县 |
| detail | TEXT | 否 | - | 详细地址 |
| is_default | INTEGER | 是 | 0 | 是否默认地址（0=否，1=是） |
| tag | TEXT | 是 | NULL | 地址标签（家、公司等） |
| created_at | TEXT | 否 | - | 创建时间 |
| updated_at | TEXT | 否 | - | 更新时间 |

**索引**：
- `idx_addresses_user` (user_id)

---

### orders（订单表）

订单主表，记录订单核心信息。

| 字段名 | 数据类型 | 允许空 | 默认值 | 说明 |
|--------|----------|--------|--------|------|
| id | TEXT | 否 | - | 主键，UUID v4 |
| order_no | TEXT | 否 | - | 订单编号，唯一（格式：OD + 时间戳 + 6位随机数） |
| user_id | TEXT | 否 | - | 用户 ID，外键 → users.id (ON DELETE CASCADE) |
| status | TEXT | 是 | 'pending' | 订单状态，见[枚举值](#订单状态) |
| total_amount | REAL | 否 | 0 | 商品总金额（元） |
| freight | REAL | 是 | 0 | 运费（元） |
| discount_amount | REAL | 是 | 0 | 优惠金额（元） |
| pay_amount | REAL | 否 | 0 | 实付金额（元） |
| pay_method | TEXT | 是 | NULL | 支付方式，见[枚举值](#支付方式) |
| pay_time | TEXT | 是 | NULL | 支付时间 |
| shipping_address | TEXT | 是 | NULL | 收货地址快照（JSON 字符串） |
| shipping_company | TEXT | 是 | NULL | 物流公司 |
| shipping_no | TEXT | 是 | NULL | 物流单号 |
| shipped_at | TEXT | 是 | NULL | 发货时间 |
| completed_at | TEXT | 是 | NULL | 完成时间 |
| cancelled_at | TEXT | 是 | NULL | 取消时间 |
| cancel_reason | TEXT | 是 | NULL | 取消原因 |
| remark | TEXT | 是 | NULL | 订单备注 |
| created_at | TEXT | 否 | - | 创建时间 |
| updated_at | TEXT | 否 | - | 更新时间 |

**索引**：
- `idx_orders_user` (user_id)
- `idx_orders_status` (status)
- `idx_orders_no` (order_no)

---

### order_items（订单商品表）

订单商品明细，快照方式存储商品信息。

| 字段名 | 数据类型 | 允许空 | 默认值 | 说明 |
|--------|----------|--------|--------|------|
| id | TEXT | 否 | - | 主键，UUID v4 |
| order_id | TEXT | 否 | - | 订单 ID，外键 → orders.id (ON DELETE CASCADE) |
| product_id | TEXT | 否 | - | 商品 ID（关联用，数据以快照为准） |
| sku_id | TEXT | 是 | NULL | SKU ID |
| product_name | TEXT | 否 | - | 商品名称快照 |
| product_image | TEXT | 是 | NULL | 商品图片快照 |
| sku_name | TEXT | 是 | NULL | SKU 名称快照 |
| price | REAL | 否 | 0 | 单价快照（元） |
| quantity | INTEGER | 否 | 1 | 数量 |
| total_price | REAL | 否 | 0 | 小计（元） |
| created_at | TEXT | 否 | - | 创建时间 |

**索引**：
- `idx_order_items_order` (order_id)

---

### payments（支付记录表）

支付流水记录，支持多支付方式。

| 字段名 | 数据类型 | 允许空 | 默认值 | 说明 |
|--------|----------|--------|--------|------|
| id | TEXT | 否 | - | 主键，UUID v4 |
| order_id | TEXT | 否 | - | 订单 ID，外键 → orders.id (ON DELETE CASCADE) |
| user_id | TEXT | 否 | - | 用户 ID，外键 → users.id (ON DELETE CASCADE) |
| payment_no | TEXT | 是 | NULL | 支付流水号，唯一 |
| pay_method | TEXT | 否 | - | 支付方式，见[枚举值](#支付方式) |
| amount | REAL | 否 | 0 | 支付金额（元） |
| status | TEXT | 是 | 'pending' | 支付状态，见[枚举值](#支付状态) |
| third_party_no | TEXT | 是 | NULL | 第三方支付流水号 |
| paid_at | TEXT | 是 | NULL | 支付完成时间 |
| callback_data | TEXT | 是 | NULL | 回调数据（JSON 字符串） |
| created_at | TEXT | 否 | - | 创建时间 |
| updated_at | TEXT | 否 | - | 更新时间 |

**索引**：
- `idx_payments_order` (order_id)

---

### reviews（商品评价表）

用户对已购商品的评价。

| 字段名 | 数据类型 | 允许空 | 默认值 | 说明 |
|--------|----------|--------|--------|------|
| id | TEXT | 否 | - | 主键，UUID v4 |
| user_id | TEXT | 否 | - | 用户 ID，外键 → users.id (ON DELETE CASCADE) |
| order_id | TEXT | 否 | - | 订单 ID，外键 → orders.id (ON DELETE CASCADE) |
| product_id | TEXT | 否 | - | 商品 ID，外键 → products.id (ON DELETE CASCADE) |
| sku_id | TEXT | 是 | NULL | SKU ID |
| rating | INTEGER | 否 | 5 | 评分（1-5 星） |
| content | TEXT | 否 | - | 评价内容 |
| images | TEXT | 是 | NULL | 评价图片（JSON 数组字符串） |
| seller_reply | TEXT | 是 | NULL | 商家回复 |
| reply_time | TEXT | 是 | NULL | 回复时间 |
| status | TEXT | 是 | 'active' | 状态，见[枚举值](#评价状态) |
| likes | INTEGER | 是 | 0 | 点赞数 |
| created_at | TEXT | 否 | - | 创建时间 |
| updated_at | TEXT | 否 | - | 更新时间 |

**索引**：
- `idx_reviews_product` (product_id)
- `idx_reviews_status` (status)

---

### favorites（收藏表）

用户商品收藏关系。

| 字段名 | 数据类型 | 允许空 | 默认值 | 说明 |
|--------|----------|--------|--------|------|
| id | TEXT | 否 | - | 主键，UUID v4 |
| user_id | TEXT | 否 | - | 用户 ID，外键 → users.id (ON DELETE CASCADE) |
| product_id | TEXT | 否 | - | 商品 ID，外键 → products.id (ON DELETE CASCADE) |
| created_at | TEXT | 否 | - | 创建时间 |

**索引**：
- `idx_favorites_user` (user_id)
- `idx_favorites_product` (product_id)

**唯一约束**：`UNIQUE(user_id, product_id)` — 同一用户对同一商品只能收藏一次

---

## 聊天消息表

### conversations（会话表）

聊天会话基础信息。

| 字段名 | 数据类型 | 允许空 | 默认值 | 说明 |
|--------|----------|--------|--------|------|
| id | TEXT | 否 | - | 主键，UUID v4 |
| creator_id | TEXT | 否 | - | 创建者 ID，外键 → users.id (ON DELETE CASCADE) |
| participant_id | TEXT | 是 | NULL | 参与者 ID（私聊场景） |
| type | TEXT | 是 | 'private' | 会话类型，见[枚举值](#会话类型) |
| title | TEXT | 是 | NULL | 会话标题 |
| status | TEXT | 是 | 'active' | 会话状态，见[枚举值](#会话状态) |
| last_message | TEXT | 是 | NULL | 最后一条消息预览 |
| last_message_at | TEXT | 是 | NULL | 最后消息时间 |
| created_at | TEXT | 否 | - | 创建时间 |
| updated_at | TEXT | 否 | - | 更新时间 |

**索引**：
- `idx_conversations_creator` (creator_id)
- `idx_conversations_participant` (participant_id)

---

### messages（消息表）

聊天消息内容。

| 字段名 | 数据类型 | 允许空 | 默认值 | 说明 |
|--------|----------|--------|--------|------|
| id | TEXT | 否 | - | 主键，UUID v4 |
| conversation_id | TEXT | 否 | - | 会话 ID，外键 → conversations.id (ON DELETE CASCADE) |
| sender_id | TEXT | 否 | - | 发送者 ID |
| content | TEXT | 否 | - | 消息内容 |
| type | TEXT | 是 | 'text' | 消息类型，见[枚举值](#消息类型) |
| status | TEXT | 是 | 'sent' | 消息状态，见[枚举值](#消息状态) |
| created_at | TEXT | 否 | - | 创建时间 |

**索引**：
- `idx_messages_conversation` (conversation_id)
- `idx_messages_created_at` (created_at)

---

### comments（评论/留言表）

支持多级回复的评论系统。

| 字段名 | 数据类型 | 允许空 | 默认值 | 说明 |
|--------|----------|--------|--------|------|
| id | TEXT | 否 | - | 主键，UUID v4 |
| user_id | TEXT | 否 | - | 用户 ID，外键 → users.id (ON DELETE CASCADE) |
| target_type | TEXT | 是 | 'global' | 评论目标类型（global/product等） |
| target_id | TEXT | 是 | NULL | 评论目标 ID |
| content | TEXT | 否 | - | 评论内容 |
| parent_id | TEXT | 是 | NULL | 父评论 ID，外键 → comments.id (ON DELETE CASCADE) |
| status | TEXT | 是 | 'active' | 状态，见[枚举值](#评论状态) |
| likes | INTEGER | 是 | 0 | 点赞数 |
| created_at | TEXT | 否 | - | 创建时间 |
| updated_at | TEXT | 否 | - | 更新时间 |

**索引**：
- `idx_comments_target` (target_type, target_id)
- `idx_comments_parent` (parent_id)

---

### conversation_reads（会话阅读状态表）

记录用户每个会话的最后阅读时间，用于计算未读数。

| 字段名 | 数据类型 | 允许空 | 默认值 | 说明 |
|--------|----------|--------|--------|------|
| id | TEXT | 否 | - | 主键，UUID v4 |
| user_id | TEXT | 否 | - | 用户 ID，外键 → users.id (ON DELETE CASCADE) |
| conversation_id | TEXT | 否 | - | 会话 ID，外键 → conversations.id (ON DELETE CASCADE) |
| last_read_at | TEXT | 否 | - | 最后阅读时间 |
| updated_at | TEXT | 否 | - | 更新时间 |

**索引**：
- `idx_conversation_reads_user` (user_id)
- `idx_conversation_reads_conversation` (conversation_id)

**唯一约束**：`UNIQUE(user_id, conversation_id)`

---

## 通用表

### notifications（通知表）

系统通知和消息推送。

| 字段名 | 数据类型 | 允许空 | 默认值 | 说明 |
|--------|----------|--------|--------|------|
| id | TEXT | 否 | - | 主键，UUID v4 |
| user_id | TEXT | 否 | - | 用户 ID，外键 → users.id (ON DELETE CASCADE) |
| title | TEXT | 否 | - | 通知标题 |
| content | TEXT | 否 | - | 通知内容 |
| type | TEXT | 是 | 'system' | 通知类型，见[枚举值](#通知类型) |
| read | INTEGER | 是 | 0 | 是否已读（0=未读，1=已读） |
| created_at | TEXT | 否 | - | 创建时间 |

**索引**：
- `idx_notifications_user_id` (user_id)
- `idx_notifications_read` (read)

---

### files（文件表）

上传文件记录。

| 字段名 | 数据类型 | 允许空 | 默认值 | 说明 |
|--------|----------|--------|--------|------|
| id | TEXT | 否 | - | 主键，UUID v4 |
| user_id | TEXT | 否 | - | 上传用户 ID，外键 → users.id (ON DELETE CASCADE) |
| name | TEXT | 否 | - | 原始文件名 |
| url | TEXT | 否 | - | 文件访问 URL |
| size | INTEGER | 否 | - | 文件大小（字节） |
| type | TEXT | 是 | NULL | 文件类型（MIME type） |
| created_at | TEXT | 否 | - | 创建时间 |

---

### sync_records（数据同步表）

多端数据同步记录，支持离线数据同步。

| 字段名 | 数据类型 | 允许空 | 默认值 | 说明 |
|--------|----------|--------|--------|------|
| id | TEXT | 否 | - | 主键，UUID v4 |
| user_id | TEXT | 否 | - | 用户 ID，外键 → users.id (ON DELETE CASCADE) |
| table_name | TEXT | 否 | - | 同步表名 |
| record_id | TEXT | 否 | - | 记录 ID |
| action | TEXT | 否 | - | 操作类型（create/update/delete） |
| sync_status | TEXT | 是 | 'pending' | 同步状态（pending/synced/failed） |
| timestamp | INTEGER | 否 | - | 操作时间戳（毫秒） |
| retry_count | INTEGER | 是 | 0 | 重试次数 |
| created_at | TEXT | 否 | - | 创建时间 |

**索引**：
- `idx_sync_records_user_id` (user_id)

---

### error_logs（错误日志表）

前端错误上报记录。

| 字段名 | 数据类型 | 允许空 | 默认值 | 说明 |
|--------|----------|--------|--------|------|
| id | TEXT | 否 | - | 主键，UUID v4 |
| user_id | TEXT | 是 | NULL | 关联用户 ID（可选） |
| platform | TEXT | 是 | NULL | 平台（h5/mp-weixin/app等） |
| app_version | TEXT | 是 | NULL | 应用版本 |
| error_type | TEXT | 是 | NULL | 错误类型 |
| error_message | TEXT | 是 | NULL | 错误信息 |
| stack_trace | TEXT | 是 | NULL | 错误堆栈 |
| user_agent | TEXT | 是 | NULL | User-Agent |
| created_at | TEXT | 否 | - | 创建时间 |

**索引**：
- `idx_error_logs_created_at` (created_at)

---

## 索引清单

### 用户系统索引

| 索引名 | 表名 | 字段 | 类型 |
|--------|------|------|------|
| idx_users_username | users | username | 唯一 |
| idx_users_email | users | email | 唯一 |

### 商城模块索引

| 索引名 | 表名 | 字段 |
|--------|------|------|
| idx_categories_parent | categories | parent_id |
| idx_categories_status | categories | status |
| idx_products_category | products | category_id |
| idx_products_status | products | status |
| idx_products_sort | products | sort_order |
| idx_product_skus_product | product_skus | product_id |
| idx_carts_user | carts | user_id |
| idx_addresses_user | addresses | user_id |
| idx_orders_user | orders | user_id |
| idx_orders_status | orders | status |
| idx_orders_no | orders | order_no |
| idx_order_items_order | order_items | order_id |
| idx_payments_order | payments | order_id |
| idx_reviews_product | reviews | product_id |
| idx_reviews_status | reviews | status |
| idx_favorites_user | favorites | user_id |
| idx_favorites_product | favorites | product_id |

### 聊天消息索引

| 索引名 | 表名 | 字段 |
|--------|------|------|
| idx_conversations_creator | conversations | creator_id |
| idx_conversations_participant | conversations | participant_id |
| idx_messages_conversation | messages | conversation_id |
| idx_messages_created_at | messages | created_at |
| idx_comments_target | comments | target_type, target_id |
| idx_comments_parent | comments | parent_id |
| idx_conversation_reads_user | conversation_reads | user_id |
| idx_conversation_reads_conversation | conversation_reads | conversation_id |

### 通用索引

| 索引名 | 表名 | 字段 |
|--------|------|------|
| idx_notifications_user_id | notifications | user_id |
| idx_notifications_read | notifications | read |
| idx_sync_records_user_id | sync_records | user_id |
| idx_error_logs_created_at | error_logs | created_at |

---

## 枚举值定义

### 用户状态 (users.status)

| 值 | 说明 |
|----|------|
| active | 正常，可登录 |
| disabled | 已禁用，禁止登录 |
| locked | 已锁定（临时锁定） |

### 用户角色 (users.role)

| 值 | 说明 |
|----|------|
| user | 普通用户 |
| admin | 管理员 |

### 分类状态 (categories.status)

| 值 | 说明 |
|----|------|
| active | 启用 |
| inactive | 禁用 |

### 商品状态 (products.status)

| 值 | 说明 |
|----|------|
| on_sale | 上架中 |
| off_shelf | 已下架 |
| deleted | 已删除（软删除） |

### 订单状态 (orders.status)

| 值 | 说明 | 可流转至 |
|----|------|----------|
| pending | 待支付 | paid, cancelled |
| paid | 已支付，待发货 | shipped, cancelled（退款） |
| shipped | 已发货，待收货 | completed |
| completed | 已完成 | - |
| cancelled | 已取消 | - |
| refunding | 退款中 | refunded |
| refunded | 已退款 | - |

### 支付方式 (pay_method)

| 值 | 说明 |
|----|------|
| wechat | 微信支付 |
| alipay | 支付宝 |
| balance | 余额支付 |

### 支付状态 (payments.status)

| 值 | 说明 |
|----|------|
| pending | 待支付 |
| success | 支付成功 |
| failed | 支付失败 |
| cancelled | 已取消 |
| refunded | 已退款 |

### 评价状态 (reviews.status)

| 值 | 说明 |
|----|------|
| active | 正常显示 |
| hidden | 已隐藏 |
| deleted | 已删除 |

### 会话类型 (conversations.type)

| 值 | 说明 |
|----|------|
| private | 私聊 |
| group | 群聊 |
| ai | AI 对话 |

### 会话状态 (conversations.status)

| 值 | 说明 |
|----|------|
| active | 活跃 |
| archived | 已归档 |
| deleted | 已删除 |

### 消息类型 (messages.type)

| 值 | 说明 |
|----|------|
| text | 文本消息 |
| image | 图片消息 |
| system | 系统消息 |

### 消息状态 (messages.status)

| 值 | 说明 |
|----|------|
| sending | 发送中 |
| sent | 已发送 |
| delivered | 已送达 |
| read | 已读 |
| failed | 发送失败 |

### 评论状态 (comments.status)

| 值 | 说明 |
|----|------|
| active | 正常 |
| hidden | 已隐藏 |
| deleted | 已删除 |

### 通知类型 (notifications.type)

| 值 | 说明 |
|----|------|
| system | 系统通知 |
| order | 订单通知 |
| payment | 支付通知 |
| chat | 聊天通知 |

### 同步状态 (sync_records.sync_status)

| 值 | 说明 |
|----|------|
| pending | 待同步 |
| synced | 已同步 |
| failed | 同步失败 |

---

## 默认数据

### 默认管理员账号

首次启动时自动创建：

| 字段 | 值 |
|------|-----|
| 用户名 | admin |
| 邮箱 | admin@gexm.com |
| 密码 | admin123456（可通过 ADMIN_DEFAULT_PASSWORD 环境变量配置） |
| 角色 | admin |
| 昵称 | 超级管理员 |

### 默认商品分类

首次启动时自动创建 8 个一级分类：

| 分类名称 | 图标 | 排序 |
|----------|------|------|
| 数码电子 | 📱 | 1 |
| 服饰鞋包 | 👕 | 2 |
| 美妆护肤 | 💄 | 3 |
| 食品生鲜 | 🍎 | 4 |
| 家居生活 | 🏠 | 5 |
| 运动户外 | ⚽ | 6 |
| 图书文具 | 📚 | 7 |
| 母婴玩具 | 🧸 | 8 |

### 默认示例商品

首次启动时自动创建 8 个示例商品（每个分类各 1 个），每个商品包含 2 个 SKU（标准版、豪华版）。

---

## 数据库配置

### 连接配置

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| 数据库路径 | data/app.db | 相对于项目根目录 |
| 日志模式 | WAL | 提升并发性能 |
| 外键约束 | 启用 | ON DELETE 级联/置空 |

### 环境变量配置

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| DB_PATH | 数据库文件路径 | data/app.db |
| ADMIN_DEFAULT_PASSWORD | 默认管理员密码 | admin123456 |
