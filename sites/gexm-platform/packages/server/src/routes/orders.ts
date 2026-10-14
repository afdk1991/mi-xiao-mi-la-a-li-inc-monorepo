import express from 'express'
import orderController from '../controllers/orderController'
import { authMiddleware } from '../middleware/auth'
import { validateUuid } from '../middleware/validateId'

const router = express.Router()

router.use(authMiddleware)

/**
 * @openapi
 * /orders:
 *   get:
 *     tags: [Orders]
 *     summary: 获取订单列表
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: pageSize
 *         in: query
 *         schema:
 *           type: integer
 *           default: 20
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 订单列表
 */
router.get('/', orderController.getOrders)

/**
 * @openapi
 * /orders/statistics:
 *   get:
 *     tags: [Orders]
 *     summary: 获取订单统计
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 订单统计数据
 */
router.get('/statistics', orderController.getOrderStatistics)

/**
 * @openapi
 * /orders/{id}:
 *   get:
 *     tags: [Orders]
 *     summary: 获取订单详情
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 订单详情
 *       404:
 *         description: 订单不存在
 */
router.get('/:id', validateUuid(), orderController.getOrderDetail)

/**
 * @openapi
 * /orders/preview:
 *   post:
 *     tags: [Orders]
 *     summary: 预览订单
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [direct, cart]
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *               cartItemIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               addressId:
 *                 type: string
 *               couponId:
 *                 type: string
 *               usePoints:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: 订单预览信息
 */
router.post('/preview', orderController.previewOrder)

/**
 * @openapi
 * /orders:
 *   post:
 *     tags: [Orders]
 *     summary: 创建订单
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, addressId]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [direct, cart]
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: string
 *                     skuId:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *               cartItemIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               addressId:
 *                 type: string
 *               couponId:
 *                 type: string
 *               usePoints:
 *                 type: boolean
 *               remark:
 *                 type: string
 *     responses:
 *       201:
 *         description: 订单创建成功
 *       400:
 *         description: 参数错误
 */
router.post('/', orderController.createOrder)

/**
 * @openapi
 * /orders/{id}/cancel:
 *   patch:
 *     tags: [Orders]
 *     summary: 取消订单
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 取消成功
 *       400:
 *         description: 订单状态不允许取消
 */
router.patch('/:id/cancel', validateUuid(), orderController.cancelOrder)

/**
 * @openapi
 * /orders/{id}/confirm:
 *   patch:
 *     tags: [Orders]
 *     summary: 确认收货
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 确认成功
 */
router.patch('/:id/confirm', validateUuid(), orderController.confirmReceive)

/**
 * @openapi
 * /orders/{id}/refund/apply:
 *   post:
 *     tags: [Orders]
 *     summary: 申请退款
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: 申请成功
 */
router.post('/:id/refund/apply', validateUuid(), orderController.applyRefund)

export default router
