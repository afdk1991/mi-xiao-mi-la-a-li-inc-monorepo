import express from 'express'
import memberController from '../controllers/memberController'
import { authMiddleware, verifyAdmin } from '../middleware/auth'
import { csrfProtectionMiddleware } from '../middleware/security'

const router = express.Router()

router.use(authMiddleware)

/**
 * @openapi
 * /members:
 *   get:
 *     tags: [Members]
 *     summary: 获取会员信息
 *     description: 返回当前登录用户的会员信息，包括积分、等级、折扣、累计消费等
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
 *                     user_id: { type: string }
 *                     points: { type: integer, description: 当前积分 }
 *                     level_id: { type: string, description: 等级 ID }
 *                     level_name: { type: string, description: 等级名称 }
 *                     discount: { type: number, description: 折扣率 }
 *                     total_spent: { type: number, description: 累计消费 }
 *                     order_count: { type: integer, description: 订单数 }
 *                     created_at: { type: string, format: date-time }
 *                     updated_at: { type: string, format: date-time }
 *       401:
 *         description: 未登录
 */
router.get('/', memberController.getMemberInfo)

/**
 * @openapi
 * /members/info:
 *   get:
 *     tags: [Members]
 *     summary: 获取会员信息（别名）
 *     description: 与 GET /members 等价，返回当前登录用户的会员信息
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
 *                 data: { type: object, description: 会员信息 }
 *       401:
 *         description: 未登录
 */
router.get('/info', memberController.getMemberInfo)

/**
 * @openapi
 * /members/level:
 *   get:
 *     tags: [Members]
 *     summary: 获取会员等级信息
 *     description: 返回当前登录用户的会员等级信息，包括等级 ID、名称、折扣率和最低积分
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
 *                     level_id: { type: string }
 *                     level_name: { type: string }
 *                     discount_rate: { type: number, description: 折扣率 }
 *                     min_points: { type: integer, description: 该等级最低积分 }
 *       401:
 *         description: 未登录
 */
router.get('/level', memberController.getMemberLevel)

/**
 * @openapi
 * /members/points:
 *   get:
 *     tags: [Members]
 *     summary: 获取积分余额
 *     description: 返回当前登录用户的积分余额、累计获得、累计消费
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
 *                     balance: { type: integer, description: 当前余额 }
 *                     total_earned: { type: integer, description: 累计获得 }
 *                     total_spent: { type: integer, description: 累计消费 }
 *       401:
 *         description: 未登录
 */
router.get('/points', memberController.getPointsBalance)

/**
 * @openapi
 * /members/points/logs:
 *   get:
 *     tags: [Members]
 *     summary: 获取积分流水
 *     description: 返回当前登录用户的积分变动记录（分页），可按类型过滤
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
 *         name: type
 *         schema: { type: string, enum: [earn, spend] }
 *         description: 积分变动类型
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
 *                       items: { type: object, description: 积分流水记录 }
 *                     total: { type: integer }
 *                     page: { type: integer }
 *                     pageSize: { type: integer }
 *       401:
 *         description: 未登录
 */
router.get('/points/logs', memberController.getPointLogs)

/**
 * @openapi
 * /members/growth:
 *   get:
 *     tags: [Members]
 *     summary: 获取成长值信息
 *     description: 返回当前登录用户的成长值及升级进度
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
 *                     current_points: { type: integer, description: 当前积分 }
 *                     next_level_min_points: { type: integer, description: 下一等级最低积分 }
 *                     progress: { type: number, description: 升级进度百分比 }
 *                     growth_value: { type: integer, description: 成长值 }
 *       401:
 *         description: 未登录
 */
router.get('/growth', memberController.getGrowthValue)

/**
 * @openapi
 * /members/benefits:
 *   get:
 *     tags: [Members]
 *     summary: 获取会员权益
 *     description: 返回当前登录用户所属等级的权益列表（折扣、积分等）
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
 *                     benefits:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           type: { type: string, description: 权益类型(discount/points) }
 *                           value: { type: number, description: 权益值 }
 *                           description: { type: string, description: 权益描述 }
 *       401:
 *         description: 未登录
 */
router.get('/benefits', memberController.getMemberBenefits)

/**
 * @openapi
 * /members/next-level:
 *   get:
 *     tags: [Members]
 *     summary: 获取下一等级信息
 *     description: 返回当前登录用户距下一会员等级所需的积分等信息，若已最高级则 next_level_id 为 null
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
 *                     next_level_id: { type: string, nullable: true }
 *                     next_level_name: { type: string }
 *                     next_level_discount: { type: number }
 *                     points_needed: { type: integer, description: 距下一等级所需积分 }
 *                     current_points: { type: integer }
 *                     next_level_min_points: { type: integer }
 *       401:
 *         description: 未登录
 */
router.get('/next-level', memberController.getNextLevelInfo)

/**
 * @openapi
 * /members/points/earn:
 *   post:
 *     tags: [Members]
 *     summary: 积分入账
 *     description: 为当前登录用户增加积分（需 CSRF 保护）
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount: { type: integer, minimum: 1, description: 入账积分数量 }
 *               reason: { type: string, description: 入账原因 }
 *               orderId: { type: string, nullable: true, description: 关联订单 ID }
 *     responses:
 *       200:
 *         description: 积分入账成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: integer, example: 0 }
 *                 message: { type: string, example: 积分入账成功 }
 *                 data:
 *                   type: object
 *                   properties:
 *                     points: { type: integer, description: 入账后余额 }
 *                     log: { type: object, description: 积分流水记录 }
 *       400:
 *         description: 参数错误（积分为空 / 数量非法）
 *       401:
 *         description: 未登录
 */
router.post('/points/earn', csrfProtectionMiddleware, memberController.earnPoints)

/**
 * @openapi
 * /members/points/spend:
 *   post:
 *     tags: [Members]
 *     summary: 积分消费
 *     description: 扣减当前登录用户的积分（需 CSRF 保护），积分不足时返回业务错误
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount: { type: integer, minimum: 1, description: 消费积分数量 }
 *               reason: { type: string, description: 消费原因 }
 *               orderId: { type: string, nullable: true, description: 关联订单 ID }
 *     responses:
 *       200:
 *         description: 积分消费成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: integer, example: 0 }
 *                 message: { type: string, example: 积分消费成功 }
 *                 data:
 *                   type: object
 *                   properties:
 *                     points: { type: integer, description: 消费后余额 }
 *                     log: { type: object, description: 积分流水记录 }
 *       400:
 *         description: 参数错误或积分不足
 *       401:
 *         description: 未登录
 */
router.post('/points/spend', csrfProtectionMiddleware, memberController.spendPoints)

/**
 * @openapi
 * /members/points/exchange:
 *   post:
 *     tags: [Members]
 *     summary: 积分兑换
 *     description: 使用积分兑换优惠券/权益等兑换项（需 CSRF 保护），积分不足或兑换项不存在时返回业务错误
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [exchangeId]
 *             properties:
 *               exchangeId: { type: integer, description: 兑换项 ID }
 *     responses:
 *       200:
 *         description: 兑换成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: integer, example: 0 }
 *                 message: { type: string, example: 兑换成功 }
 *                 data:
 *                   type: object
 *                   properties:
 *                     points: { type: integer, description: 兑换后余额 }
 *                     exchanged_item: { type: object, description: 兑换的物品信息 }
 *       400:
 *         description: 兑换项不存在 / 积分不足
 *       401:
 *         description: 未登录
 */
router.post('/points/exchange', csrfProtectionMiddleware, memberController.exchangePoints)

/**
 * @openapi
 * /members/admin/levels:
 *   get:
 *     tags: [Members, Admin]
 *     summary: 管理后台-获取所有会员等级
 *     description: 管理员获取系统中所有会员等级配置列表
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
 *                       id: { type: string }
 *                       name: { type: string }
 *                       min_points: { type: integer }
 *                       discount_rate: { type: number }
 *                       sort_order: { type: integer }
 *       401:
 *         description: 未登录
 *       403:
 *         description: 无管理员权限
 */
router.get('/admin/levels', verifyAdmin, memberController.adminGetLevels)

/**
 * @openapi
 * /members/admin/levels/{id}:
 *   put:
 *     tags: [Members, Admin]
 *     summary: 管理后台-更新会员等级
 *     description: 管理员更新指定会员等级的配置信息（需 CSRF 保护）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: 等级 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, description: 等级名称 }
 *               min_points: { type: integer, description: 最低积分 }
 *               discount: { type: number, description: 折扣率 }
 *               icon: { type: integer, description: 排序值 }
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
 *                 data: { type: object, description: 更新后的等级信息 }
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 未登录
 *       403:
 *         description: 无管理员权限
 *       404:
 *         description: 会员等级不存在
 */
router.put(
  '/admin/levels/:id',
  verifyAdmin,
  csrfProtectionMiddleware,
  memberController.adminUpdateLevel
)

/**
 * @openapi
 * /members/admin/members:
 *   get:
 *     tags: [Members, Admin]
 *     summary: 管理后台-会员列表
 *     description: 管理员分页查询所有会员信息，可按等级过滤
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
 *         name: level_id
 *         schema: { type: string }
 *         description: 等级 ID 过滤
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
 *                       items: { type: object, description: 会员信息 }
 *                     total: { type: integer }
 *                     page: { type: integer }
 *                     pageSize: { type: integer }
 *       401:
 *         description: 未登录
 *       403:
 *         description: 无管理员权限
 */
router.get('/admin/members', verifyAdmin, memberController.adminListMembers)

/**
 * @openapi
 * /members/admin/members/{userId}:
 *   get:
 *     tags: [Members, Admin]
 *     summary: 管理后台-获取指定会员详情
 *     description: 管理员根据用户 ID 获取该用户的会员信息
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *         description: 用户 ID
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
 *                 data: { type: object, description: 会员信息 }
 *       401:
 *         description: 未登录
 *       403:
 *         description: 无管理员权限
 *       404:
 *         description: 会员信息不存在
 */
router.get('/admin/members/:userId', verifyAdmin, memberController.adminGetMember)

/**
 * @openapi
 * /members/admin/members/{userId}/points:
 *   put:
 *     tags: [Members, Admin]
 *     summary: 管理后台-调整会员积分
 *     description: 管理员调整指定用户的积分，正数为增加，负数为扣减（需 CSRF 保护）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *         description: 用户 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount: { type: integer, description: 调整积分数（正数增加，负数扣减） }
 *               reason: { type: string, description: 调整原因 }
 *     responses:
 *       200:
 *         description: 调整成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: integer, example: 0 }
 *                 message: { type: string, example: 积分增加成功 }
 *                 data:
 *                   type: object
 *                   properties:
 *                     points: { type: integer, description: 调整后余额 }
 *       400:
 *         description: 参数错误（积分为空 / 格式错误）
 *       401:
 *         description: 未登录
 *       403:
 *         description: 无管理员权限
 */
router.put(
  '/admin/members/:userId/points',
  verifyAdmin,
  csrfProtectionMiddleware,
  memberController.adminAdjustPoints
)

export default router
