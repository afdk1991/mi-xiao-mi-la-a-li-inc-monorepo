import express from 'express'
import paymentController from '../controllers/paymentController'
import reconciliationController from '../controllers/reconciliationController'
import { authMiddleware, adminMiddleware } from '../middleware/auth'
import { ipWhitelistMiddleware } from '../middleware/ipWhitelist'
import { validateSchema } from '../middleware/validateSchema'
import { paySchema, paymentListQuerySchema } from '../schemas/payment'
import { validateUuid } from '../middleware/validateId'

const router = express.Router()

/**
 * @openapi
 * /payment/callback/{method}:
 *   post:
 *     tags: [Payment]
 *     summary: 支付回调
 *     description: 第三方支付平台回调接口（IP 白名单限制）
 *     parameters:
 *       - name: method
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           enum: [alipay, wechat]
 *     responses:
 *       200:
 *         description: 回调处理成功
 *       403:
 *         description: IP 不在白名单
 */
router.post('/callback/:method', ipWhitelistMiddleware, paymentController.callback)

router.use(authMiddleware)

/**
 * @openapi
 * /payment/pay:
 *   post:
 *     tags: [Payment]
 *     summary: 发起支付
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId, method]
 *             properties:
 *               orderId:
 *                 type: string
 *               method:
 *                 type: string
 *                 enum: [alipay, wechat, balance]
 *     responses:
 *       200:
 *         description: 支付信息
 *       400:
 *         description: 订单状态不允许支付
 */
router.post('/pay', validateSchema(paySchema), paymentController.pay)

/**
 * @openapi
 * /payment/list:
 *   get:
 *     tags: [Payment]
 *     summary: 获取支付记录列表
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 支付记录列表
 */
router.get(
  '/list',
  validateSchema(paymentListQuerySchema, 'query'),
  paymentController.getPaymentList
)

/**
 * @openapi
 * /payment/{orderId}/status:
 *   get:
 *     tags: [Payment]
 *     summary: 查询支付状态
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: orderId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 支付状态信息
 */
router.get('/:orderId/status', validateUuid('orderId'), paymentController.getPaymentStatus)
router.get('/:orderId/query', validateUuid('orderId'), paymentController.queryPaymentStatus)
router.post('/:orderId/close', validateUuid('orderId'), paymentController.closePayment)

/**
 * @openapi
 * /payment/detail/{id}:
 *   get:
 *     tags: [Payment]
 *     summary: 获取支付详情
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
 *         description: 支付详情
 */
router.get('/detail/:id', validateUuid('id'), paymentController.getPaymentDetail)

/**
 * @openapi
 * /payment/reconciliation:
 *   get:
 *     tags: [Payment]
 *     summary: 对账查询（管理员）
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 对账数据
 */
router.get('/reconciliation', adminMiddleware, reconciliationController.getReconciliation)

/**
 * @openapi
 * /payment/reconciliation/list:
 *   get:
 *     tags: [Payment]
 *     summary: 对账历史列表（管理员）
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 对账历史列表
 */
router.get('/reconciliation/list', adminMiddleware, reconciliationController.getReconciliationHistory)

export default router
