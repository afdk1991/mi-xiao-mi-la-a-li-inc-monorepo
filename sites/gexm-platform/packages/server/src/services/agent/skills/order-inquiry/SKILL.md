---
name: order-inquiry
description: 查询和跟踪用户订单状态。当用户询问订单发货、物流、退款或订单详情时使用。
license: Apache-2.0
compatibility: Requires TypeScript
metadata:
  author: gexm-team
  version: "1.0"
allowed-tools: ["query_order", "get_conversation_history"]
---

# 订单查询处理指南

## 处理流程

1. **接收订单查询请求**：确认用户提供的订单号或用户ID
2. **验证权限**：检查订单归属是否正确
3. **查询订单信息**：获取订单状态、金额、创建时间等信息
4. **补充物流信息**：如果订单已发货，提供物流追踪信息
5. **生成回复**：用自然语言总结订单状态

## 订单状态说明

| 状态 | 说明 | 处理方式 |
|------|------|----------|
| pending | 待付款 | 提醒用户完成支付 |
| paid | 已付款 | 告知预计发货时间 |
| shipped | 已发货 | 提供物流单号和追踪链接 |
| delivered | 已送达 | 确认订单完成 |
| cancelled | 已取消 | 说明取消原因 |
| refunded | 已退款 | 确认退款金额和时间 |

## 验证规则

- 订单号必须为有效格式（ORD-YYYY-MMDD-XXXX）
- 用户只能查询自己的订单
- 订单创建时间超过30天需注明历史订单

## 执行脚本

使用 `scripts/validate_order.js` 进行订单验证：

```bash
node scripts/validate_order.js <order_id> <user_id>
```
