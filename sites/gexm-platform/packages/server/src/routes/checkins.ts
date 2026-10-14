import express from 'express'
import checkinController from '../controllers/checkinController'
import { authMiddleware, verifyAdmin } from '../middleware/auth'
import { csrfProtectionMiddleware } from '../middleware/security'

const router = express.Router()

router.use(authMiddleware)

/**
 * @openapi
 * /checkins:
 *   post:
 *     tags: [Members]
 *     summary: 每日签到
 *     description: 当前登录用户进行每日签到，同一天仅可签到一次，连续签到可获得额外积分（需 CSRF 保护）
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 签到成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: integer, example: 0 }
 *                 message: { type: string, example: 签到成功 }
 *                 data:
 *                   type: object
 *                   properties:
 *                     record: { type: object, description: 签到记录 }
 *                     message: { type: string, description: 签到结果文案 }
 *       400:
 *         description: 今日已签到 / 签到失败
 *       401:
 *         description: 未登录
 */
router.post('/', csrfProtectionMiddleware, checkinController.checkin)

/**
 * @openapi
 * /checkins/history:
 *   get:
 *     tags: [Members]
 *     summary: 获取签到历史
 *     description: 分页返回当前登录用户的签到历史记录
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *         description: 页码
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, default: 30 }
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
 *                       items: { type: object, description: 签到记录 }
 *                     total: { type: integer }
 *                     page: { type: integer }
 *                     pageSize: { type: integer }
 *       401:
 *         description: 未登录
 */
router.get('/history', checkinController.getHistory)

/**
 * @openapi
 * /checkins/stats:
 *   get:
 *     tags: [Members]
 *     summary: 获取签到统计
 *     description: 返回当前登录用户的签到统计数据（连续天数、累计天数、累计积分等）
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
 *                 data: { type: object, description: 签到统计数据 }
 *       401:
 *         description: 未登录
 */
router.get('/stats', checkinController.getStats)

/**
 * @openapi
 * /checkins/calendar:
 *   get:
 *     tags: [Members]
 *     summary: 获取签到日历
 *     description: 返回指定年月的签到日历数据，未指定年月时返回当月
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *         description: 年份
 *       - in: query
 *         name: month
 *         schema: { type: integer }
 *         description: 月份
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
 *                 data: { type: object, description: 签到日历数据 }
 *       401:
 *         description: 未登录
 */
router.get('/calendar', checkinController.getCalendar)

/**
 * @openapi
 * /checkins/admin/config:
 *   get:
 *     tags: [Members, Admin]
 *     summary: 管理后台-获取签到配置
 *     description: 管理员获取签到系统的配置信息（每日积分、连续奖励、最大连续天数等）
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
 *                     daily_points: { type: integer, description: 每日签到积分 }
 *                     consecutive_bonus:
 *                       type: array
 *                       items: { type: integer }
 *                       description: 连续签到奖励
 *                     max_consecutive_days: { type: integer, description: 最大连续天数 }
 *       401:
 *         description: 未登录
 *       403:
 *         description: 无管理员权限
 */
router.get('/admin/config', verifyAdmin, checkinController.adminGetConfig)

/**
 * @openapi
 * /checkins/admin/config:
 *   put:
 *     tags: [Members, Admin]
 *     summary: 管理后台-更新签到配置
 *     description: 管理员更新签到系统配置（需 CSRF 保护）
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               daily_points: { type: integer, minimum: 0, description: 每日签到积分 }
 *               consecutive_bonus:
 *                 type: array
 *                 items: { type: integer }
 *                 description: 连续签到奖励数组
 *               max_consecutive_days: { type: integer, minimum: 1, description: 最大连续天数 }
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
 *                   type: object
 *                   description: 更新后的配置
 *       400:
 *         description: 参数错误（每日积分非法 / 最大连续天数非法）
 *       401:
 *         description: 未登录
 *       403:
 *         description: 无管理员权限
 */
router.put(
  '/admin/config',
  verifyAdmin,
  csrfProtectionMiddleware,
  checkinController.adminUpdateConfig
)

/**
 * @openapi
 * /checkins/admin/stats:
 *   get:
 *     tags: [Members, Admin]
 *     summary: 管理后台-获取签到统计
 *     description: 管理员获取签到统计数据，可按用户 ID 过滤
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *         description: 指定用户 ID 过滤
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
 *                 data: { type: object, description: 签到统计数据 }
 *       401:
 *         description: 未登录
 *       403:
 *         description: 无管理员权限
 */
router.get('/admin/stats', verifyAdmin, checkinController.adminGetStats)

export default router
