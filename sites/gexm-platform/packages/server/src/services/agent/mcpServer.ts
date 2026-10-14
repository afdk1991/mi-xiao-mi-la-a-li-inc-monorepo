/**
 * MCP Server - 基于 JSON-RPC 2.0 协议的标准化工具调用服务
 *
 * 提供以下接口：
 * - POST /mcp  : JSON-RPC 2.0 请求处理（tools/list, tools/call）
 * - GET  /mcp  : 服务器信息查询
 */
import express from 'express'
import http from 'http'
import logger from '../../utils/logger'
import orderModel from '../../models/orderModel'
import productModel from '../../models/productModel'
import userModel from '../../models/userModel'
import chatModel from '../../models/chatModel'

// 服务器实例
let mcpApp: express.Application | null = null
let serverInstance: http.Server | null = null
let currentPort: number = 8080

// 工具定义（JSON Schema 格式）
const tools = [
  {
    name: 'query_order',
    description: '查询用户订单信息',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: '用户ID' },
        orderId: { type: 'string', description: '订单号' },
      },
      required: ['userId', 'orderId'],
    },
  },
  {
    name: 'search_product',
    description: '搜索商品信息',
    inputSchema: {
      type: 'object',
      properties: {
        keyword: { type: 'string', description: '搜索关键词' },
      },
      required: ['keyword'],
    },
  },
  {
    name: 'get_user_info',
    description: '获取用户基本信息',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: '用户ID' },
      },
      required: ['userId'],
    },
  },
  {
    name: 'calculator',
    description: '执行数学运算',
    inputSchema: {
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
  },
  {
    name: 'get_conversation_history',
    description: '获取会话历史消息',
    inputSchema: {
      type: 'object',
      properties: {
        conversationId: { type: 'string', description: '会话ID' },
      },
      required: ['conversationId'],
    },
  },
]

/**
 * 执行工具调用
 * @param name 工具名称
 * @param args 工具参数
 * @returns 执行结果字符串
 */
async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  try {
    switch (name) {
      case 'query_order': {
        const { userId, orderId } = args as { userId: string; orderId: string }
        const order = orderModel.findById(orderId)
        if (!order) {
          return `未找到订单号 ${orderId}`
        }
        if (order.user_id !== userId) {
          return '无权查看该订单'
        }
        return `订单号: ${order.id}\n状态: ${order.status}\n金额: ¥${order.total_amount}\n创建时间: ${order.created_at}`
      }

      case 'search_product': {
        const { keyword } = args as { keyword: string }
        const result = productModel.findAll({ keyword, page: 1, pageSize: 5 })
        if (!result || result.products.length === 0) {
          return `未找到包含 "${keyword}" 的商品`
        }
        return result.products
          .map(
            (p) =>
              `商品名: ${p.name}\n价格: ¥${p.price}\n库存: ${p.stock}\n描述: ${p.description?.substring(0, 50)}...`
          )
          .join('\n\n')
      }

      case 'get_user_info': {
        const { userId } = args as { userId: string }
        const user = userModel.findById(userId)
        if (!user) {
          return `未找到用户 ${userId}`
        }
        // 脱敏处理：邮箱和手机号部分隐藏
        const maskedEmail = user.email
          ? user.email.substring(0, 2) + '***' + user.email.substring(user.email.indexOf('@'))
          : '未设置'
        const maskedPhone = user.phone
          ? user.phone.substring(0, 3) + '****' + user.phone.substring(7)
          : '未设置'
        return `用户名: ${user.nickname}\n邮箱: ${maskedEmail}\n手机号: ${maskedPhone}\n注册时间: ${user.created_at}`
      }

      case 'calculator': {
        const { a, b, operation } = args as { a: number; b: number; operation: string }
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

      case 'get_conversation_history': {
        const { conversationId } = args as { conversationId: string }
        const result = chatModel.getConversationMessages(conversationId, { page: 1, pageSize: 10 })
        if (!result || result.messages.length === 0) {
          return '会话暂无消息'
        }
        return result.messages
          .map((m) => `${m.sender_id === 'ai_assistant' ? 'AI助手' : '用户'}: ${m.content}`)
          .join('\n')
      }

      default:
        return `未知工具: ${name}`
    }
  } catch (error) {
    logger.error(`执行工具 ${name} 失败:`, error)
    return `执行工具 ${name} 失败: ${(error as Error).message}`
  }
}

/**
 * 启动 MCP Server
 * @param port 端口号，默认 8080
 */
export function startMcpServer(port: number = 8080): void {
  if (serverInstance) {
    logger.info('MCP Server 已启动')
    return
  }

  currentPort = port
  mcpApp = express()
  mcpApp.use(express.json())

  // JSON-RPC 2.0 请求处理
  mcpApp.post('/mcp', async (req, res) => {
    const { id, method, params } = req.body || {}

    try {
      if (method === 'tools/list') {
        res.json({
          jsonrpc: '2.0',
          id,
          result: { tools },
        })
      } else if (method === 'tools/call') {
        if (!params || !params.name) {
          return res.status(400).json({
            jsonrpc: '2.0',
            id,
            error: { code: -32602, message: '缺少 params.name 参数' },
          })
        }
        const { name, arguments: args } = params
        const result = await executeTool(name, args || {})
        res.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: result }],
          },
        })
      } else {
        res.status(400).json({
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method not found: ${method}` },
        })
      }
    } catch (error) {
      logger.error('MCP Server 处理请求失败:', error)
      res.status(500).json({
        jsonrpc: '2.0',
        id,
        error: { code: -32603, message: (error as Error).message },
      })
    }
  })

  // 服务器信息查询
  mcpApp.get('/mcp', (_req, res) => {
    res.json({
      name: 'gexm-agent-mcp-server',
      version: '1.0.0',
      description: 'Gexm 电商平台 Agent MCP Server',
      tools: tools.map((t) => ({ name: t.name, description: t.description })),
    })
  })

  serverInstance = mcpApp.listen(port, () => {
    logger.info(`MCP Server 已启动在 http://localhost:${port}/mcp`)
  })
}

/**
 * 停止 MCP Server
 */
export function stopMcpServer(): void {
  if (serverInstance) {
    serverInstance.close()
    serverInstance = null
  }
  mcpApp = null
  logger.info('MCP Server 已停止')
}

/**
 * 获取 MCP Server 状态
 */
export function getMcpServerStatus(): { running: boolean; port: number } {
  return {
    running: !!serverInstance,
    port: currentPort,
  }
}
