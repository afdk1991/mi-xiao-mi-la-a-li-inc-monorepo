import express from 'express'
import couponController from '../controllers/couponController'
import { authMiddleware, verifyAdmin } from '../middleware/auth'
import { csrfProtectionMiddleware } from '../middleware/security'
import auditLog from '../middleware/auditMiddleware'
import couponModel from '../models/couponModel'
import { validateEntityId } from '../middleware/validateId'

const router = express.Router()

/**
 * @openapi
 * /coupons:
 *   get:
 *     tags: [Coupons]
 *     summary: 获取可用优惠券列表
 *     description: 公开接口，返回当前可领取的优惠券列表（无需登录）
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
 *                     $ref: '#/components/schemas/Coupon'
 *       400:
 *         description: 获取失败
 */
// 公开接口：无需登录即可浏览可用优惠券列表
router.get('/', couponController.getAvailable)

// 以下接口需要登录认证
router.use(authMiddleware)

/**
 * @openapi
 * /coupons/mine:
 *   get:
 *     tags: [Coupons]
 *     summary: 获取我的优惠券
 *     description: 返回当前登录用户已领取的优惠券列表，可按状态筛选
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [unused, used, expired] }
 *         description: 优惠券状态筛选
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
 *                     $ref: '#/components/schemas/UserCoupon'
 *       400:
 *         description: 获取失败
 *       401:
 *         description: 未登录
 */
router.get('/mine', couponController.getMine)

/**
 * @openapi
 * /coupons/{id}/claim:
 *   post:
 *     tags: [Coupons]
 *     summary: 领取优惠券
 *     description: 用户领取指定优惠券，受 CSRF 保护
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: 优惠券 ID
 *     responses:
 *       201:
 *         description: 领取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: integer, example: 0 }
 *                 message: { type: string, example: 领取成功 }
 *                 data: { type: object, description: 用户优惠券记录 }
 *       400:
 *         description: 优惠券已失效/尚未开始/已过期/已被领完/已达领取上限
 *       404:
 *         description: 优惠券不存在
 */
router.post('/:id/claim', validateEntityId(), csrfProtectionMiddleware, couponController.claim)

/**
 * @openapi
 * /coupons/apply:
 *   post:
 *     tags: [Coupons]
 *     summary: 试算优惠券折扣
 *     description: 根据订单金额计算优惠券可抵扣金额，不实际使用优惠券
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [couponId, totalAmount]
 *             properties:
 *               couponId: { type: string, description: 用户优惠券 ID }
 *               totalAmount: { type: number, description: 订单总金额 }
 *     responses:
 *       200:
 *         description: 计算成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: integer, example: 0 }
 *                 message: { type: string, example: 计算成功 }
 *                 data:
 *                   type: object
 *                   properties:
 *                     coupon_id: { type: string }
 *                     discount: { type: string, description: 抵扣金额 }
 *                     final_amount: { type: string, description: 实付金额 }
 *       400:
 *         description: 优惠券不存在/已使用/已过期/未达门槛等
 */
router.post('/apply', couponController.apply)

/**
 * @openapi
 * /coupons/use:
 *   post:
 *     tags: [Coupons]
 *     summary: 使用优惠券
 *     description: 在指定订单上使用优惠券，受 CSRF 保护
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [couponId, orderId]
 *             properties:
 *               couponId: { type: string, description: 用户优惠券 ID }
 *               orderId: { type: string, description: 订单 ID }
 *     responses:
 *       200:
 *         description: 使用成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: integer, example: 0 }
 *                 message: { type: string, example: 使用成功 }
 *                 data: { type: object, description: 更新后的用户优惠券 }
 *       400:
 *         description: 优惠券不存在/已使用/已过期
 */
router.post('/use', csrfProtectionMiddleware, couponController.useCoupon)

/**
 * @openapi
 * /coupons/admin:
 *   post:
 *     tags: [Admin, Coupons]
 *     summary: 管理员创建优惠券
 *     description: 管理员创建新的优惠券，受 CSRF 保护并记录审计日志
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CouponInput'
 *     responses:
 *       201:
 *         description: 创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: integer, example: 0 }
 *                 message: { type: string, example: 创建成功 }
 *                 data:
 *                   $ref: '#/components/schemas/Coupon'
 *       400:
 *         description: 参数错误（名称为空/类型无效/数值非法等）
 *       403:
 *         description: 非管理员
 */
router.post(
  '/admin',
  verifyAdmin,
  csrfProtectionMiddleware,
  auditLog('create', 'coupon'),
  couponController.adminCreate
)

/**
 * @openapi
 * /coupons/admin:
 *   get:
 *     tags: [Admin, Coupons]
 *     summary: 管理员获取优惠券列表
 *     description: 分页查询所有优惠券，可按状态筛选
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *         description: 页码
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, default: 20 }
 *         description: 每页数量
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *         description: 状态筛选
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
 *                       items:
 *                         $ref: '#/components/schemas/Coupon'
 *                     total: { type: integer }
 *                     page: { type: integer }
 *                     pageSize: { type: integer }
 *       403:
 *         description: 非管理员
 */
router.get('/admin', verifyAdmin, couponController.adminList)

/**
 * @openapi
 * /coupons/admin/{id}:
 *   put:
 *     tags: [Admin, Coupons]
 *     summary: 管理员更新优惠券
 *     description: 更新指定优惠券信息，受 CSRF 保护并记录审计日志（含修改前数据）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: 优惠券 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CouponInput'
 *     responses:
 *       200:
 *         description: 更新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: integer, example: 0 }
 *                 message: { type: string, example: 更新成功 }
 *                 data:
 *                   $ref: '#/components/schemas/Coupon'
 *       400:
 *         description: 参数错误
 *       403:
 *         description: 非管理员
 *       404:
 *         description: 优惠券不存在
 */
router.put(
  '/admin/:id',
  verifyAdmin,
  validateEntityId(),
  csrfProtectionMiddleware,
  auditLog('update', 'coupon', {
    getBeforeData: (req) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
      return Promise.resolve(couponModel.findById(id))
    },
  }),
  couponController.adminUpdate
)

/**
 * @openapi
 * /coupons/admin/{id}:
 *   delete:
 *     tags: [Admin, Coupons]
 *     summary: 管理员删除优惠券
 *     description: 删除指定优惠券，受 CSRF 保护并记录审计日志（含删除前数据）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: 优惠券 ID
 *     responses:
 *       200:
 *         description: 删除成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: integer, example: 0 }
 *                 message: { type: string, example: 删除成功 }
 *                 data: { type: object, nullable: true }
 *       403:
 *         description: 非管理员
 *       404:
 *         description: 优惠券不存在
 */
router.delete(
  '/admin/:id',
  verifyAdmin,
  validateEntityId(),
  csrfProtectionMiddleware,
  auditLog('delete', 'coupon', {
    getBeforeData: (req) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
      return Promise.resolve(couponModel.findById(id))
    },
  }),
  couponController.adminDelete
)

/**
 * @openapi
 * /coupons/admin/issue:
 *   post:
 *     tags: [Admin, Coupons]
 *     summary: 管理员批量发放优惠券
 *     description: 向指定用户列表批量发放指定优惠券，受 CSRF 保护并记录审计日志
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [couponId, userIds]
 *             properties:
 *               couponId: { type: string, description: 优惠券 ID }
 *               userIds:
 *                 type: array
 *                 items: { type: string }
 *                 description: 接收优惠券的用户 ID 列表
 *     responses:
 *       200:
 *         description: 发放成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: integer, example: 0 }
 *                 message: { type: string, example: 发放成功，共发放 N 张 }
 *                 data:
 *                   type: object
 *                   properties:
 *                     issued: { type: integer, description: 实际发放数量 }
 *       400:
 *         description: 优惠券ID为空 / 用户列表为空
 *       403:
 *         description: 非管理员
 */
router.post(
  '/admin/issue',
  verifyAdmin,
  csrfProtectionMiddleware,
  auditLog('issue', 'coupon'),
  couponController.adminIssue
)

export default router
