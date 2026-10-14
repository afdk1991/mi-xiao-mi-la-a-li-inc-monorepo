import express from 'express'
import reviewController from '../controllers/reviewController'
import { authMiddleware } from '../middleware/auth'

const router = express.Router()

/**
 * @openapi
 * /reviews:
 *   post:
 *     tags: [Reviews]
 *     summary: 创建商品评价
 *     description: 用户对已购买商品的订单进行评价，同一订单同一商品仅可评价一次
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId, productId, rating, content]
 *             properties:
 *               orderId: { type: string, description: 订单 ID }
 *               productId: { type: string, description: 商品 ID }
 *               skuId: { type: string, nullable: true, description: SKU ID }
 *               rating: { type: integer, minimum: 1, maximum: 5, description: 评分(1-5) }
 *               content: { type: string, description: 评价内容 }
 *               images:
 *                 type: array
 *                 items: { type: string }
 *                 description: 评价图片 URL 列表
 *     responses:
 *       201:
 *         description: 评价成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: integer, example: 0 }
 *                 message: { type: string, example: 评价成功 }
 *                 data: { type: object, description: 评价信息 }
 *       400:
 *         description: 参数错误（必填项为空 / 评分非法 / 已评价过）
 *       401:
 *         description: 未登录
 */
router.post('/', authMiddleware, reviewController.createReview)

/**
 * @openapi
 * /reviews/mine:
 *   get:
 *     tags: [Reviews]
 *     summary: 获取我的评价列表
 *     description: 返回当前登录用户发表的评价列表（分页）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *         description: 页码
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, default: 10 }
 *         description: 每页数量
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
 *                     list:
 *                       type: array
 *                       items: { type: object, description: 评价信息 }
 *                     total: { type: integer, description: 总数 }
 *                     page: { type: integer }
 *                     pageSize: { type: integer }
 *       401:
 *         description: 未登录
 */
router.get('/mine', authMiddleware, reviewController.getMyReviews)

export default router
