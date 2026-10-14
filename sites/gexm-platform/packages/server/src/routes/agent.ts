import express from 'express'
import {
  processAgentMessage,
  getAvailableTools,
  isAgentAvailable,
} from '../services/agent/agentService'
import { startMcpServer, stopMcpServer, getMcpServerStatus } from '../services/agent/mcpServer'
import { authMiddleware, verifyAdmin } from '../middleware/auth'
import { successResponse, errorResponse } from '../utils/response'
import logger from '../utils/logger'

const router = express.Router()

// 所有 agent 路由都需要认证
router.use(authMiddleware)

router.post('/chat', async (req, res) => {
  try {
    const { conversationId, userId, message } = req.body

    if (!conversationId || !userId || !message) {
      return errorResponse(res, '参数不完整', 1001, 400)
    }

    const response = await processAgentMessage(conversationId, userId, message)
    return successResponse(res, { response })
  } catch (error) {
    logger.error('Agent聊天失败:', error)
    return errorResponse(res, 'Agent聊天失败', 1000, 500)
  }
})

router.get('/tools', (req, res) => {
  try {
    const tools = getAvailableTools()
    return successResponse(res, { tools })
  } catch (error) {
    logger.error('获取工具列表失败:', error)
    return errorResponse(res, '获取工具列表失败', 1000, 500)
  }
})

router.get('/status', (req, res) => {
  try {
    const agentAvailable = isAgentAvailable()
    const mcpStatus = getMcpServerStatus()
    return successResponse(res, {
      agentAvailable,
      mcpServer: mcpStatus,
    })
  } catch (error) {
    logger.error('获取Agent状态失败:', error)
    return errorResponse(res, '获取Agent状态失败', 1000, 500)
  }
})

router.post('/mcp/start', verifyAdmin, (req, res) => {
  try {
    const { port } = req.body
    startMcpServer(port || 8080)
    return successResponse(res, { message: 'MCP Server 启动成功' })
  } catch (error) {
    logger.error('启动MCP Server失败:', error)
    return errorResponse(res, '启动MCP Server失败', 1000, 500)
  }
})

router.post('/mcp/stop', verifyAdmin, (req, res) => {
  try {
    stopMcpServer()
    return successResponse(res, { message: 'MCP Server 停止成功' })
  } catch (error) {
    logger.error('停止MCP Server失败:', error)
    return errorResponse(res, '停止MCP Server失败', 1000, 500)
  }
})

export default router
