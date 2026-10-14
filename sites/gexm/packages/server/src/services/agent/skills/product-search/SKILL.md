---
name: product-search
description: 搜索和推荐商品。当用户询问商品信息、价格、库存或搜索商品时使用。
license: Apache-2.0
compatibility: Requires TypeScript
metadata:
  author: gexm-team
  version: "1.0"
allowed-tools: ["search_product"]
---

# 商品搜索处理指南

## 处理流程

1. **理解搜索意图**：提取用户搜索关键词
2. **执行搜索**：调用商品搜索工具
3. **筛选结果**：根据相关性排序，返回前5个结果
4. **格式化展示**：展示商品名称、价格、库存、简短描述
5. **提供建议**：根据用户需求提供购买建议

## 搜索规则

- 关键词长度至少2个字符
- 支持模糊搜索和精确搜索
- 返回结果按相关性排序
- 库存为0的商品标记为缺货

## 推荐策略

| 用户意图 | 推荐方式 |
|----------|----------|
| 价格敏感 | 推荐价格区间内的高性价比商品 |
| 品牌偏好 | 优先推荐指定品牌商品 |
| 新品需求 | 推荐最近上架的商品 |
| 促销需求 | 推荐正在促销的商品 |

## 执行脚本

使用 `scripts/search_product.js` 进行商品搜索：

```bash
node scripts/search_product.js <keyword> [page] [pageSize]
```
