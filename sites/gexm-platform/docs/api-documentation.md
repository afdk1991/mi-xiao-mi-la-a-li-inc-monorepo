# Gexm 应用 API 文档

## 1. 概述

本文档描述了 Gexm 应用的后端 API 接口规范。所有接口均遵循 RESTful 设计原则，使用 JSON 格式进行数据传输。

### 1.1 基础信息

- **基础 URL**: `https://api.example.com`
- **协议**: HTTPS
- **数据格式**: JSON
- **字符编码**: UTF-8
- **认证方式**: Bearer Token

### 1.2 响应格式

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| code | number | 状态码，0 表示成功，其他值表示失败 |
| message | string | 提示信息 |
| data | any | 返回数据 |

### 1.3 错误码

| 错误码 | 说明 |
|--------|------|
| 0 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未认证或 Token 过期 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 2. 用户认证接口

### 2.1 用户登录

**POST** `/api/auth/login`

请求体：

```json
{
  "username": "string (必填，用户名或手机号)",
  "password": "string (必填，密码)"
}
```

成功响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "token": "string (JWT Token)",
    "user": {
      "id": "number",
      "username": "string",
      "nickname": "string",
      "avatar": "string",
      "phone": "string"
    }
  }
}
```

### 2.2 用户注册

**POST** `/api/auth/register`

请求体：

```json
{
  "username": "string (必填，用户名)",
  "password": "string (必填，密码)",
  "phone": "string (必填，手机号)",
  "nickname": "string (可选，昵称)"
}
```

成功响应：

```json
{
  "code": 0,
  "message": "注册成功",
  "data": {
    "id": "number",
    "username": "string",
    "nickname": "string"
  }
}
```

### 2.3 获取用户信息

**GET** `/api/auth/me`

请求头：

```
Authorization: Bearer <token>
```

成功响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "number",
    "username": "string",
    "nickname": "string",
    "avatar": "string",
    "phone": "string",
    "email": "string",
    "level": "number",
    "points": "number"
  }
}
```

### 2.4 修改用户信息

**PUT** `/api/auth/profile`

请求头：

```
Authorization: Bearer <token>
```

请求体：

```json
{
  "nickname": "string (可选，昵称)",
  "avatar": "string (可选，头像URL)",
  "gender": "string (可选，male/female/other)",
  "birthday": "string (可选，YYYY-MM-DD)"
}
```

成功响应：

```json
{
  "code": 0,
  "message": "修改成功",
  "data": {}
}
```

---

## 3. 商品接口

### 3.1 获取推荐商品

**GET** `/api/products/recommend`

请求参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| limit | number | 否 | 返回数量，默认 20 |

成功响应：

```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "id": "number",
      "name": "string",
      "price": "number",
      "originalPrice": "number",
      "image": "string",
      "sales": "number",
      "rating": "number",
      "reviewCount": "number",
      "categoryName": "string"
    }
  ]
}
```

### 3.2 获取商品详情

**GET** `/api/products/{id}`

路径参数：

| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 商品 ID |

成功响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "number",
    "name": "string",
    "price": "number",
    "originalPrice": "number",
    "image": "string",
    "images": ["string"],
    "description": "string",
    "sales": "number",
    "stock": "number",
    "rating": "number",
    "reviewCount": "number",
    "tags": ["string"],
    "sku": [
      {
        "id": "number",
        "name": "string",
        "options": [
          {
            "id": "number",
            "name": "string",
            "value": "string"
          }
        ]
      }
    ],
    "categoryId": "number",
    "categoryName": "string"
  }
}
```

### 3.3 搜索商品

**GET** `/api/products/search`

请求参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| keyword | string | 是 | 搜索关键词 |
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页数量，默认 20 |
| categoryId | number | 否 | 分类 ID |

成功响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [/* 商品列表 */],
    "total": "number",
    "page": "number",
    "pageSize": "number"
  }
}
```

### 3.4 获取分类商品

**GET** `/api/products`

请求参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| categoryId | number | 否 | 分类 ID |
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页数量，默认 20 |

成功响应：同上

---

## 4. 分类接口

### 4.1 获取全部分类

**GET** `/api/categories`

成功响应：

```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "id": "number",
      "name": "string",
      "icon": "string",
      "parentId": "number",
      "children": [/* 子分类 */]
    }
  ]
}
```

### 4.2 获取分类详情

**GET** `/api/categories/{id}`

路径参数：

| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 分类 ID |

成功响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "number",
    "name": "string",
    "icon": "string",
    "parentId": "number",
    "children": [/* 子分类 */]
  }
}
```

---

## 5. 购物车接口

### 5.1 获取购物车列表

**GET** `/api/cart`

请求头：

```
Authorization: Bearer <token>
```

成功响应：

```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "id": "number",
      "productId": "number",
      "productName": "string",
      "productImage": "string",
      "price": "number",
      "quantity": "number",
      "skuId": "number",
      "skuName": "string",
      "selected": "boolean"
    }
  ]
}
```

### 5.2 添加商品到购物车

**POST** `/api/cart`

请求头：

```
Authorization: Bearer <token>
```

请求体：

```json
{
  "productId": "number (必填)",
  "quantity": "number (必填，默认 1)",
  "skuId": "number (可选)"
}
```

成功响应：

```json
{
  "code": 0,
  "message": "添加成功",
  "data": {}
}
```

### 5.3 更新购物车商品数量

**PUT** `/api/cart/{id}`

请求头：

```
Authorization: Bearer <token>
```

路径参数：

| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 购物车项 ID |

请求体：

```json
{
  "quantity": "number (必填)"
}
```

成功响应：

```json
{
  "code": 0,
  "message": "更新成功",
  "data": {}
}
```

### 5.4 删除购物车商品

**DELETE** `/api/cart/{id}`

请求头：

```
Authorization: Bearer <token>
```

路径参数：

| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 购物车项 ID |

成功响应：

```json
{
  "code": 0,
  "message": "删除成功",
  "data": {}
}
```

---

## 6. 订单接口

### 6.1 创建订单

**POST** `/api/orders`

请求头：

```
Authorization: Bearer <token>
```

请求体：

```json
{
  "items": [
    {
      "productId": "number",
      "quantity": "number",
      "skuId": "number"
    }
  ],
  "addressId": "number (必填)",
  "couponId": "number (可选)"
}
```

成功响应：

```json
{
  "code": 0,
  "message": "创建成功",
  "data": {
    "id": "number",
    "orderNo": "string",
    "totalAmount": "number",
    "status": "string"
  }
}
```

### 6.2 获取订单列表

**GET** `/api/orders`

请求头：

```
Authorization: Bearer <token>
```

请求参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 否 | 订单状态筛选 |
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页数量，默认 20 |

成功响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "number",
        "orderNo": "string",
        "totalAmount": "number",
        "status": "string",
        "items": [/* 订单商品 */],
        "createdAt": "string"
      }
    ],
    "total": "number",
    "page": "number",
    "pageSize": "number"
  }
}
```

### 6.3 获取订单详情

**GET** `/api/orders/{id}`

请求头：

```
Authorization: Bearer <token>
```

路径参数：

| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 订单 ID |

成功响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "number",
    "orderNo": "string",
    "totalAmount": "number",
    "status": "string",
    "payType": "string",
    "payTime": "string",
    "items": [/* 订单商品 */],
    "address": {
      "name": "string",
      "phone": "string",
      "province": "string",
      "city": "string",
      "district": "string",
      "detail": "string"
    },
    "createdAt": "string"
  }
}
```

### 6.4 取消订单

**PUT** `/api/orders/{id}/cancel`

请求头：

```
Authorization: Bearer <token>
```

路径参数：

| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 订单 ID |

成功响应：

```json
{
  "code": 0,
  "message": "取消成功",
  "data": {}
}
```

---

## 7. 地址接口

### 7.1 获取地址列表

**GET** `/api/addresses`

请求头：

```
Authorization: Bearer <token>
```

成功响应：

```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "id": "number",
      "name": "string",
      "phone": "string",
      "province": "string",
      "city": "string",
      "district": "string",
      "detail": "string",
      "isDefault": "boolean"
    }
  ]
}
```

### 7.2 添加地址

**POST** `/api/addresses`

请求头：

```
Authorization: Bearer <token>
```

请求体：

```json
{
  "name": "string (必填)",
  "phone": "string (必填)",
  "province": "string (必填)",
  "city": "string (必填)",
  "district": "string (必填)",
  "detail": "string (必填)",
  "isDefault": "boolean (可选，默认 false)"
}
```

成功响应：

```json
{
  "code": 0,
  "message": "添加成功",
  "data": {}
}
```

### 7.3 更新地址

**PUT** `/api/addresses/{id}`

请求头：

```
Authorization: Bearer <token>
```

路径参数：

| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 地址 ID |

请求体：

```json
{
  "name": "string (可选)",
  "phone": "string (可选)",
  "province": "string (可选)",
  "city": "string (可选)",
  "district": "string (可选)",
  "detail": "string (可选)",
  "isDefault": "boolean (可选)"
}
```

成功响应：

```json
{
  "code": 0,
  "message": "更新成功",
  "data": {}
}
```

### 7.4 删除地址

**DELETE** `/api/addresses/{id}`

请求头：

```
Authorization: Bearer <token>
```

路径参数：

| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 地址 ID |

成功响应：

```json
{
  "code": 0,
  "message": "删除成功",
  "data": {}
}
```

---

## 8. 优惠券接口

### 8.1 获取优惠券列表

**GET** `/api/coupons`

请求头：

```
Authorization: Bearer <token>
```

成功响应：

```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "id": "number",
      "name": "string",
      "discountType": "string (fixed/percent)",
      "discountValue": "number",
      "minAmount": "number",
      "expireAt": "string",
      "stock": "number"
    }
  ]
}
```

### 8.2 领取优惠券

**POST** `/api/coupons/{id}/claim`

请求头：

```
Authorization: Bearer <token>
```

路径参数：

| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 优惠券 ID |

成功响应：

```json
{
  "code": 0,
  "message": "领取成功",
  "data": {}
}
```

---

## 9. 支付接口

### 9.1 发起支付

**POST** `/api/payments`

请求头：

```
Authorization: Bearer <token>
```

请求体：

```json
{
  "orderId": "number (必填)",
  "payType": "string (必填，wxpay/alipay)"
}
```

成功响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "orderInfo": "string (支付参数)"
  }
}
```

### 9.2 查询支付状态

**GET** `/api/payments/{orderId}`

请求头：

```
Authorization: Bearer <token>
```

路径参数：

| 参数 | 类型 | 说明 |
|------|------|------|
| orderId | number | 订单 ID |

成功响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "status": "string (pending/paid/failed)",
    "payTime": "string"
  }
}
```

---

## 10. 通知接口

### 10.1 获取通知列表

**GET** `/api/notifications`

请求头：

```
Authorization: Bearer <token>
```

请求参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页数量，默认 20 |

成功响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "number",
        "type": "string",
        "title": "string",
        "content": "string",
        "read": "boolean",
        "createdAt": "string"
      }
    ],
    "total": "number",
    "unreadCount": "number"
  }
}
```

### 10.2 标记通知为已读

**PUT** `/api/notifications/{id}/read`

请求头：

```
Authorization: Bearer <token>
```

路径参数：

| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 通知 ID |

成功响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

---

## 附录

### A. 订单状态说明

| 状态 | 说明 |
|------|------|
| pending | 待付款 |
| paid | 已付款 |
| shipped | 已发货 |
| completed | 已完成 |
| cancelled | 已取消 |

### B. 支付方式说明

| 支付方式 | 说明 |
|----------|------|
| wxpay | 微信支付 |
| alipay | 支付宝 |

### C. 折扣类型说明

| 类型 | 说明 |
|------|------|
| fixed | 固定金额折扣 |
| percent | 百分比折扣 |