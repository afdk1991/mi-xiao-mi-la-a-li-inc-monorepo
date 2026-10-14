import chatModel from '../../models/chatModel'
import orderModel from '../../models/orderModel'
import productModel from '../../models/productModel'
import userModel from '../../models/userModel'
import logger from '../../utils/logger'

export const queryOrderTool = {
  name: 'query_order',
  description: '查询用户订单信息',
  schema: {
    type: 'object',
    properties: {
      userId: { type: 'string', description: '用户ID' },
      orderId: { type: 'string', description: '订单号' },
    },
    required: ['userId', 'orderId'],
  },
}

export const searchProductTool = {
  name: 'search_product',
  description: '搜索商品信息',
  schema: {
    type: 'object',
    properties: {
      keyword: { type: 'string', description: '搜索关键词' },
    },
    required: ['keyword'],
  },
}

export const getUserInfoTool = {
  name: 'get_user_info',
  description: '获取用户基本信息',
  schema: {
    type: 'object',
    properties: {
      userId: { type: 'string', description: '用户ID' },
    },
    required: ['userId'],
  },
}

export const calculatorTool = {
  name: 'calculator',
  description: '执行数学运算',
  schema: {
    type: 'object',
    properties: {
      a: { type: 'number', description: '第一个数字' },
      b: { type: 'number', description: '第二个数字' },
      operation: {
        type: 'string',
        enum: ['add', 'subtract', 'multiply', 'divide'],
        description: '运算类型',
      },
    },
    required: ['a', 'b', 'operation'],
  },
}

export const getConversationHistoryTool = {
  name: 'get_conversation_history',
  description: '获取会话历史消息',
  schema: {
    type: 'object',
    properties: {
      conversationId: { type: 'string', description: '会话ID' },
    },
    required: ['conversationId'],
  },
}

export const allTools = [
  queryOrderTool,
  searchProductTool,
  getUserInfoTool,
  calculatorTool,
  getConversationHistoryTool,
]

export async function executeQueryOrder(userId: string, orderId: string): Promise<string> {
  try {
    const order = await orderModel.findById(orderId)
    if (!order) {
      return `未找到订单号 ${orderId}`
    }
    if (order.user_id !== userId) {
      return '无权查看该订单'
    }
    return `订单号: ${order.id}\n状态: ${order.status}\n金额: ¥${order.total_amount}\n创建时间: ${order.created_at}`
  } catch (error) {
    logger.error('查询订单失败:', error)
    return '查询订单失败，请稍后重试'
  }
}

export async function executeSearchProduct(keyword: string): Promise<string> {
  try {
    const result = productModel.findAll({ keyword, page: 1, pageSize: 5 })
    const products = result.products
    if (!products || products.length === 0) {
      return `未找到包含 "${keyword}" 的商品`
    }
    return products
      .map(
        (p) =>
          `商品名: ${p.name}\n价格: ¥${p.price}\n库存: ${p.stock}\n描述: ${p.description?.substring(0, 50)}...`
      )
      .join('\n\n')
  } catch (error) {
    logger.error('搜索商品失败:', error)
    return '搜索商品失败，请稍后重试'
  }
}

export async function executeGetUserInfo(userId: string): Promise<string> {
  try {
    const user = userModel.findById(userId)
    if (!user) {
      return `未找到用户 ${userId}`
    }
    // 脱敏处理：邮箱显示前2位+***+@域名，手机号显示前3位+****+后4位
    const maskedEmail = user.email
      ? user.email.substring(0, 2) + '***' + user.email.substring(user.email.indexOf('@'))
      : '未设置'
    const maskedPhone = user.phone
      ? user.phone.substring(0, 3) + '****' + user.phone.substring(7)
      : '未设置'
    return `用户名: ${user.nickname}\n邮箱: ${maskedEmail}\n手机号: ${maskedPhone}\n注册时间: ${user.created_at}`
  } catch (error) {
    logger.error('查询用户信息失败:', error)
    return '查询用户信息失败，请稍后重试'
  }
}

export function executeCalculator(a: number, b: number, operation: string): string {
  let result: number
  switch (operation) {
    case 'add':
      result = a + b
      break
    case 'subtract':
      result = a - b
      break
    case 'multiply':
      result = a * b
      break
    case 'divide':
      result = b !== 0 ? a / b : 0
      break
    default:
      return '未知操作类型'
  }
  return `${a} ${operation} ${b} = ${result}`
}

export async function executeGetConversationHistory(conversationId: string): Promise<string> {
  try {
    const result = chatModel.getConversationMessages(conversationId, { page: 1, pageSize: 10 })
    if (!result || result.messages.length === 0) {
      return '会话暂无消息'
    }
    return result.messages
      .map((m) => `${m.sender_id === 'ai_assistant' ? 'AI助手' : '用户'}: ${m.content}`)
      .join('\n')
  } catch (error) {
    logger.error('获取会话历史失败:', error)
    return '获取会话历史失败，请稍后重试'
  }
}
