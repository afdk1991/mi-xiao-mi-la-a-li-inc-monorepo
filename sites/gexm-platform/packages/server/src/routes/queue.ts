import express from 'express'
import type { Request, Response } from 'express'
import { verifyAdmin } from '../middleware/auth'
import { csrfProtectionMiddleware } from '../middleware/security'
import queueService from '../services/queueService'
import { successResponse } from '../utils/response'

const router = express.Router()

// 所有队列管理接口仅限管理员访问
router.use(verifyAdmin)

/**
 * @openapi
 * /queue/stats:
 *   get:
 *     tags: [Admin, Queue]
 *     summary: 获取消息队列统计
 *     description: 返回消息队列的全局统计信息（发送数、处理数、失败数、重试数、死信数等）
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: integer, example: 0 }
 *                 message: { type: string, example: 获取成功 }
 *                 data:
 *                   type: object
 *                   properties:
 *                     messagesSent: { type: integer, description: 发送消息总数 }
 *                     messagesReceived: { type: integer, description: 接收消息总数 }
 *                     messagesProcessed: { type: integer, description: 处理成功总数 }
 *                     messagesFailed: { type: integer, description: 处理失败总数 }
 *                     messagesRetried: { type: integer, description: 重试次数 }
 *                     messagesDeadLettered: { type: integer, description: 死信消息数 }
 *                     activeConsumers: { type: integer, description: 活跃消费者数 }
 *       403:
 *         description: 非管理员
 */
router.get('/stats', (req: Request, res: Response) => {
  const stats = queueService.getStats()
  successResponse(res, stats, '获取成功')
})

/**
 * @openapi
 * /queue/queues:
 *   get:
 *     tags: [Admin, Queue]
 *     summary: 获取所有队列详情
 *     description: 返回所有队列的名称、待处理消息数及是否为死信队列
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: integer, example: 0 }
 *                 message: { type: string, example: 获取成功 }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       queue: { type: string, description: 队列名称 }
 *                       pendingCount: { type: integer, description: 待处理消息数 }
 *                       isDeadLetter: { type: boolean, description: 是否为死信队列 }
 *       403:
 *         description: 非管理员
 */
router.get('/queues', (req: Request, res: Response) => {
  const details = queueService.getQueueDetails()
  successResponse(res, details, '获取成功')
})

/**
 * @openapi
 * /queue/dead-letters:
 *   get:
 *     tags: [Admin, Queue]
 *     summary: 获取死信队列消息列表
 *     description: 返回死信队列中所有消息的详细信息
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: integer, example: 0 }
 *                 message: { type: string, example: 获取成功 }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string, description: 消息 ID }
 *                       queue: { type: string, description: 原队列名 }
 *                       payload: { type: object, description: 消息内容 }
 *                       timestamp: { type: integer, description: 时间戳 }
 *                       retryCount: { type: integer, description: 已重试次数 }
 *       403:
 *         description: 非管理员
 */
router.get('/dead-letters', (req: Request, res: Response) => {
  const messages = queueService.getDeadLetterMessages()
  successResponse(res, messages, `获取成功，共 ${messages.length} 条死信`)
})

/**
 * @openapi
 * /queue/dead-letters/retry:
 *   post:
 *     tags: [Admin, Queue]
 *     summary: 重试死信队列消息
 *     description: 将死信队列中的消息重新放回原队列（或指定队列）进行重试，重置重试计数
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               queue:
 *                 type: string
 *                 description: 可选，指定重试到的目标队列名。不传则放回消息的原队列
 *     responses:
 *       200:
 *         description: 重试成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: integer, example: 0 }
 *                 message: { type: string, example: 重试成功，共重试 N 条消息 }
 *                 data:
 *                   type: object
 *                   properties:
 *                     retried: { type: integer, description: 实际重试的消息数 }
 *       403:
 *         description: 非管理员
 */
router.post('/dead-letters/retry', csrfProtectionMiddleware, async (req: Request, res: Response) => {
  const { queue } = req.body
  const retried = await queueService.retryDeadLetterMessages(queue)
  successResponse(res, { retried }, `重试成功，共重试 ${retried} 条消息`)
})

/**
 * @openapi
 * /queue/dead-letters:
 *   delete:
 *     tags: [Admin, Queue]
 *     summary: 清空死信队列
 *     description: 清空死信队列中的所有消息，不可恢复（需 CSRF 保护）
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 清空成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: integer, example: 0 }
 *                 message: { type: string, example: 清空成功，共清除 N 条消息 }
 *                 data:
 *                   type: object
 *                   properties:
 *                     cleared: { type: integer, description: 清除的消息数 }
 *       403:
 *         description: 非管理员
 */
router.delete('/dead-letters', csrfProtectionMiddleware, (req: Request, res: Response) => {
  const cleared = queueService.clearDeadLetterMessages()
  successResponse(res, { cleared }, `清空成功，共清除 ${cleared} 条消息`)
})

/**
 * @openapi
 * /queue/stats/reset:
 *   post:
 *     tags: [Admin, Queue]
 *     summary: 重置队列统计
 *     description: 将所有队列统计计数器归零（需 CSRF 保护）
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 重置成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: integer, example: 0 }
 *                 message: { type: string, example: 重置成功 }
 *                 data: { type: object, nullable: true }
 *       403:
 *         description: 非管理员
 */
router.post('/stats/reset', csrfProtectionMiddleware, (req: Request, res: Response) => {
  queueService.resetStats()
  successResponse(res, null, '重置成功')
})

export default router
