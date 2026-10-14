# 社区互动电商平台 - 项目结构与数据库设计方案

## 一、项目结构设计

### 1. 前端项目结构 (`community-ecommerce-frontend`)

```
├── public/              # 静态资源
├── src/
│   ├── assets/          # 项目资源文件
│   ├── components/      # 通用组件
│   │   ├── common/      # 基础公共组件
│   │   ├── community/   # 社区互动组件
│   │   ├── ecommerce/   # 电商交易组件
│   │   └──团长/          # 团长相关组件
│   ├── layouts/         # 布局组件
│   ├── modules/         # 功能模块
│   │   ├── community/   # 社区互动模块
│   │   ├── ecommerce/   # 电商交易模块
│   │   ├──团长/          # 团长体系模块
│   │   └── local/       # 本地服务模块
│   ├── router/          # 路由配置
│   ├── services/        # API服务
│   ├── store/           # Vuex状态管理
│   ├── utils/           # 工具函数
│   ├── views/           # 页面视图
│   ├── App.vue          # 根组件
│   └── main.ts          # 入口文件
├── .env                 # 环境变量
├── index.html           # HTML模板
├── package.json         # 项目依赖
├── tsconfig.json        # TypeScript配置
└── vite.config.ts       # Vite配置
```

### 2. 后端微服务结构 (`community-ecommerce-backend`)

```
├── api-gateway/                 # API网关服务
├── common/                      # 公共模块
│   ├── core/                    # 核心功能
│   ├── exception/               # 异常处理
│   └── util/                    # 工具类
├── community-service/           # 社区互动服务
├── ecommerce-service/           # 电商交易服务
├── leader-service/              # 团长服务
├── content-service/             # 内容管理服务
├── mobile-service/              # 移动端支持服务
├── user-service/                # 用户服务
├── search-service/              # 搜索服务
├── storage-service/             # 文件存储服务
└── admin-service/               # 后台管理服务
```

## 二、数据库设计

### 1. 用户模块 (user_service)

#### `users` 表
| 字段名 | 数据类型 | 约束 | 描述 |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | `PRIMARY KEY AUTO_INCREMENT` | 用户ID |
| `username` | `VARCHAR(50)` | `UNIQUE NOT NULL` | 用户名 |
| `phone` | `VARCHAR(20)` | `UNIQUE NOT NULL` | 手机号 |
| `password` | `VARCHAR(255)` | `NOT NULL` | 密码（加密存储） |
| `avatar` | `VARCHAR(255)` | | 头像URL |
| `nickname` | `VARCHAR(50)` | | 昵称 |
| `gender` | `TINYINT` | | 性别（0:未知, 1:男, 2:女） |
| `birth_date` | `DATE` | | 出生日期 |
| `community_address` | `VARCHAR(255)` | | 社区地址 |
| `积分` | `INT` | `DEFAULT 0` | 用户积分 |
| `level` | `TINYINT` | `DEFAULT 1` | 用户等级(1-5) |
| `status` | `TINYINT` | `DEFAULT 1` | 状态（0:禁用, 1:启用） |
| `created_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 |
| `updated_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | 更新时间 |

#### `user_addresses` 表
| 字段名 | 数据类型 | 约束 | 描述 |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | `PRIMARY KEY AUTO_INCREMENT` | 地址ID |
| `user_id` | `BIGINT` | `FOREIGN KEY REFERENCES users(id)` | 用户ID |
| `consignee_name` | `VARCHAR(50)` | `NOT NULL` | 收货人姓名 |
| `phone` | `VARCHAR(20)` | `NOT NULL` | 收货人电话 |
| `province` | `VARCHAR(50)` | `NOT NULL` | 省份 |
| `city` | `VARCHAR(50)` | `NOT NULL` | 城市 |
| `district` | `VARCHAR(50)` | `NOT NULL` | 区县 |
| `detail_address` | `VARCHAR(255)` | `NOT NULL` | 详细地址 |
| `is_default` | `TINYINT` | `DEFAULT 0` | 是否默认地址 |
| `created_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 |

### 2. 社区互动模块 (community_service)

#### `posts` 表
| 字段名 | 数据类型 | 约束 | 描述 |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | `PRIMARY KEY AUTO_INCREMENT` | 帖子ID |
| `user_id` | `BIGINT` | `FOREIGN KEY REFERENCES users(id)` | 发布用户ID |
| `title` | `VARCHAR(255)` | `NOT NULL` | 标题 |
| `content` | `TEXT` | `NOT NULL` | 内容 |
| `type` | `TINYINT` | `DEFAULT 1` | 类型（1:图文, 2:短视频） |
| `media_urls` | `JSON` | | 媒体文件URLs |
| `topic_ids` | `JSON` | | 关联话题ID列表 |
| `product_ids` | `JSON` | | 关联商品ID列表 |
| `view_count` | `INT` | `DEFAULT 0` | 浏览数 |
| `like_count` | `INT` | `DEFAULT 0` | 点赞数 |
| `comment_count` | `INT` | `DEFAULT 0` | 评论数 |
| `share_count` | `INT` | `DEFAULT 0` | 分享数 |
| `status` | `TINYINT` | `DEFAULT 1` | 状态（0:禁用, 1:启用） |
| `created_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 |
| `updated_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | 更新时间 |

#### `comments` 表
| 字段名 | 数据类型 | 约束 | 描述 |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | `PRIMARY KEY AUTO_INCREMENT` | 评论ID |
| `post_id` | `BIGINT` | `FOREIGN KEY REFERENCES posts(id)` | 帖子ID |
| `user_id` | `BIGINT` | `FOREIGN KEY REFERENCES users(id)` | 评论用户ID |
| `parent_id` | `BIGINT` | `DEFAULT 0` | 父评论ID（0表示顶级评论） |
| `content` | `TEXT` | `NOT NULL` | 评论内容 |
| `image_urls` | `JSON` | | 评论图片 |
| `like_count` | `INT` | `DEFAULT 0` | 点赞数 |
| `status` | `TINYINT` | `DEFAULT 1` | 状态 |
| `created_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 |

#### `topics` 表
| 字段名 | 数据类型 | 约束 | 描述 |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | `PRIMARY KEY AUTO_INCREMENT` | 话题ID |
| `name` | `VARCHAR(50)` | `UNIQUE NOT NULL` | 话题名称 |
| `description` | `VARCHAR(255)` | | 话题描述 |
| `post_count` | `INT` | `DEFAULT 0` | 帖子数量 |
| `created_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 |

### 3. 电商交易模块 (ecommerce_service)

#### `products` 表
| 字段名 | 数据类型 | 约束 | 描述 |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | `PRIMARY KEY AUTO_INCREMENT` | 商品ID |
| `name` | `VARCHAR(255)` | `NOT NULL` | 商品名称 |
| `category_id` | `BIGINT` | `FOREIGN KEY REFERENCES categories(id)` | 分类ID |
| `brand` | `VARCHAR(100)` | | 品牌 |
| `description` | `TEXT` | | 商品描述 |
| `main_image` | `VARCHAR(255)` | | 主图URL |
| `image_urls` | `JSON` | | 图片URL列表 |
| `original_price` | `DECIMAL(10,2)` | `NOT NULL` | 原价 |
| `current_price` | `DECIMAL(10,2)` | `NOT NULL` | 现价 |
| `community_price` | `DECIMAL(10,2)` | | 社区专属价 |
| `stock` | `INT` | `NOT NULL DEFAULT 0` | 库存 |
| `sales_count` | `INT` | `DEFAULT 0` | 销量 |
| `status` | `TINYINT` | `DEFAULT 1` | 状态（0:下架, 1:上架） |
| `created_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 |
| `updated_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | 更新时间 |

#### `product_skus` 表
| 字段名 | 数据类型 | 约束 | 描述 |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | `PRIMARY KEY AUTO_INCREMENT` | SKU ID |
| `product_id` | `BIGINT` | `FOREIGN KEY REFERENCES products(id)` | 商品ID |
| `attributes` | `JSON` | `NOT NULL` | 属性（如{"重量":"500g","颜色":"红色"}） |
| `price` | `DECIMAL(10,2)` | `NOT NULL` | 价格 |
| `stock` | `INT` | `NOT NULL DEFAULT 0` | 库存 |
| `sales_count` | `INT` | `DEFAULT 0` | 销量 |
| `created_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 |

### 4. 团长模块 (leader_service)

#### `leaders` 表
| 字段名 | 数据类型 | 约束 | 描述 |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | `PRIMARY KEY AUTO_INCREMENT` | 团长ID |
| `user_id` | `BIGINT` | `FOREIGN KEY REFERENCES users(id) UNIQUE` | 用户ID |
| `real_name` | `VARCHAR(50)` | `NOT NULL` | 真实姓名 |
| `id_card_no` | `VARCHAR(20)` | `UNIQUE NOT NULL` | 身份证号 |
| `store_name` | `VARCHAR(100)` | `NOT NULL` | 店铺名称 |
| `store_address` | `VARCHAR(255)` | `NOT NULL` | 店铺地址 |
| `latitude` | `DECIMAL(10,6)` | | 纬度 |
| `longitude` | `DECIMAL(10,6)` | | 经度 |
| `business_hours` | `VARCHAR(255)` | | 营业时间 |
| `contact_phone` | `VARCHAR(20)` | `NOT NULL` | 联系电话 |
| `commission_rate` | `DECIMAL(5,2)` | `DEFAULT 8.00` | 佣金比例(%) |
| `total_sales` | `DECIMAL(12,2)` | `DEFAULT 0.00` | 累计销售额 |
| `total_orders` | `INT` | `DEFAULT 0` | 累计订单数 |
| `status` | `TINYINT` | `DEFAULT 0` | 状态（0:待审核, 1:审核通过, 2:审核拒绝） |
| `created_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 |
| `updated_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | 更新时间 |

### 5. 订单模块 (order_service)

#### `orders` 表
| 字段名 | 数据类型 | 约束 | 描述 |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | `PRIMARY KEY AUTO_INCREMENT` | 订单ID |
| `order_sn` | `VARCHAR(50)` | `UNIQUE NOT NULL` | 订单号 |
| `user_id` | `BIGINT` | `FOREIGN KEY REFERENCES users(id)` | 用户ID |
| `leader_id` | `BIGINT` | `FOREIGN KEY REFERENCES leaders(id)` | 团长ID |
| `total_amount` | `DECIMAL(10,2)` | `NOT NULL` | 订单总金额 |
| `actual_pay_amount` | `DECIMAL(10,2)` | `NOT NULL` | 实际支付金额 |
| `shipping_fee` | `DECIMAL(10,2)` | `DEFAULT 0.00` | 运费 |
| `discount_amount` | `DECIMAL(10,2)` | `DEFAULT 0.00` | 优惠金额 |
| `payment_method` | `TINYINT` | | 支付方式（1:微信, 2:支付宝） |
| `payment_status` | `TINYINT` | `DEFAULT 0` | 支付状态（0:待支付, 1:已支付） |
| `order_status` | `TINYINT` | `DEFAULT 0` | 订单状态（0:待支付, 1:备货中, 2:已到店, 3:已完成, 4:已取消） |
| `pickup_code` | `VARCHAR(20)` | | 取货码 |
| `consignee_name` | `VARCHAR(50)` | `NOT NULL` | 收货人姓名 |
| `consignee_phone` | `VARCHAR(20)` | `NOT NULL` | 收货人电话 |
| `created_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 |
| `updated_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | 更新时间 |
| `payment_time` | `DATETIME` | | 支付时间 |
| `completed_time` | `DATETIME` | | 完成时间 |

#### `order_items` 表
| 字段名 | 数据类型 | 约束 | 描述 |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | `PRIMARY KEY AUTO_INCREMENT` | 订单项ID |
| `order_id` | `BIGINT` | `FOREIGN KEY REFERENCES orders(id)` | 订单ID |
| `product_id` | `BIGINT` | `FOREIGN KEY REFERENCES products(id)` | 商品ID |
| `sku_id` | `BIGINT` | `FOREIGN KEY REFERENCES product_skus(id)` | SKU ID |
| `product_name` | `VARCHAR(255)` | `NOT NULL` | 商品名称 |
| `sku_attributes` | `JSON` | | SKU属性 |
| `price` | `DECIMAL(10,2)` | `NOT NULL` | 购买时单价 |
| `quantity` | `INT` | `NOT NULL` | 购买数量 |
| `total_amount` | `DECIMAL(10,2)` | `NOT NULL` | 总金额 |
| `created_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 |

### 6. 积分与等级模块 (user_service)

#### `user_points` 表
| 字段名 | 数据类型 | 约束 | 描述 |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | `PRIMARY KEY AUTO_INCREMENT` | 记录ID |
| `user_id` | `BIGINT` | `FOREIGN KEY REFERENCES users(id)` | 用户ID |
| `points_change` | `INT` | `NOT NULL` | 积分变化量 |
| `points_balance` | `INT` | `NOT NULL` | 积分余额 |
| `change_type` | `TINYINT` | `NOT NULL` | 变化类型（1:发帖, 2:评论, 3:晒单, 4:消费, 5:兑换） |
| `related_id` | `BIGINT` | | 相关ID（如帖子ID、订单ID） |
| `description` | `VARCHAR(255)` | | 描述 |
| `created_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 |

## 三、Redis缓存设计

### 1. 用户相关缓存
- `user:info:{user_id}` - 用户基本信息
- `user:session:{token}` - 用户会话信息

### 2. 商品相关缓存
- `product:detail:{product_id}` - 商品详情
- `product:hot:list` - 热门商品列表
- `product:category:{category_id}` - 分类商品列表

### 3. 社区相关缓存
- `post:hot:list` - 热门帖子列表
- `topic:hot:list` - 热门话题列表

### 4. 团长相关缓存
- `leader:nearby:{latitude}:{longitude}` - 附近团长列表

### 5. 订单相关缓存
- `order:unpaid:{order_id}` - 待支付订单（用于15分钟自动取消）

## 四、数据分片与分表策略

### 1. 按时间分表
- `orders` 表按月分表：`orders_202401`, `orders_202402`
- `order_items` 表按月分表：`order_items_202401`, `order_items_202402`

### 2. 按用户ID分片
- `user_points` 表按用户ID范围分片

### 3. 读写分离
- 主库：写操作
- 从库：读操作，包括商品查询、订单查询等

## 五、关键业务索引设计

### 1. 用户表索引
- `idx_phone` (phone)
- `idx_username` (username)

### 2. 商品表索引
- `idx_category_id` (category_id)
- `idx_current_price` (current_price)
- `idx_sales_count` (sales_count)

### 3. 订单表索引
- `idx_order_sn` (order_sn)
- `idx_user_id` (user_id)
- `idx_leader_id` (leader_id)
- `idx_payment_status_order_status` (payment_status, order_status)

### 4. 帖子表索引
- `idx_user_id` (user_id)
- `idx_created_at` (created_at)
- `idx_view_count` (view_count)
- `idx_like_count` (like_count)
