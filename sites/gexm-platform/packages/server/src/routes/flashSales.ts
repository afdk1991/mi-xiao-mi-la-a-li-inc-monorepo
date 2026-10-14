import express from 'express'
import flashSaleController from '../controllers/flashSaleController'
import { authMiddleware, verifyAdmin } from '../middleware/auth'
import { csrfProtectionMiddleware } from '../middleware/security'
import { validateUuid } from '../middleware/validateId'

const router = express.Router()

/**
 * @openapi
 * /flash-sales/active:
 *   get:
 *     tags: [FlashSales]
 *     summary: 获取进行中的秒杀活动
 *     description: 返回当前正在进行中的秒杀活动列表（含剩余时间），无需登录
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
 *                       id: { type: string, description: 活动 ID }
 *                       name: { type: string, description: 活动名称 }
 *                       current_status: { type: string, description: 当前状态 }
 *                       remaining_time: { type: integer, description: 剩余时间(毫秒) }
 *       400:
 *         description: 获取失败
 */
router.get('/active', flashSaleController.getActiveSales)

/**
 * @openapi
 * /flash-sales/{id}/status:
 *   get:
 *     tags: [FlashSales]
 *     summary: 获取秒杀活动状态
 *     description: 返回指定秒杀活动的当前状态及剩余时间，无需登录
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: 秒杀活动 ID
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
 *                     id: { type: string }
 *                     name: { type: string }
 *                     status: { type: string, description: 当前状态(active/upcoming/ended) }
 *                     start_time: { type: string, format: date-time }
 *                     end_time: { type: string, format: date-time }
 *                     remaining_time: { type: integer, description: 剩余时间(毫秒) }
 *       404:
 *         description: 秒杀活动不存在
 */
router.get('/:id/status', validateUuid(), flashSaleController.getFlashSaleStatus)

/**
 * @openapi
 * /flash-sales/products/{id}:
 *   get:
 *     tags: [FlashSales]
 *     summary: 获取秒杀商品详情
 *     description: 根据秒杀商品项 ID 获取详情（含库存进度、所属活动信息），无需登录
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: 秒杀商品项 ID
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
 *                     stock: { type: integer, description: 剩余库存 }
 *                     sold_count: { type: integer, description: 已售数量 }
 *                     remaining_stock: { type: integer }
 *                     progress: { type: string, description: 售卖进度百分比 }
 *                     sale_info: { type: object, description: 所属活动信息 }
 *       404:
 *         description: 秒杀商品不存在
 */
router.get('/products/:id', validateUuid(), flashSaleController.getProductDetail)

router.use(authMiddleware)

/**
 * @openapi
 * /flash-sales:
 *   get:
 *     tags: [FlashSales]
 *     summary: 获取秒杀活动列表
 *     description: 分页返回所有秒杀活动列表，可按状态过滤
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
 *         description: 状态过滤(active/upcoming/ended)
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
 *                       items: { type: object, description: 秒杀活动信息 }
 *                     total: { type: integer }
 *                     page: { type: integer }
 *                     pageSize: { type: integer }
 *       401:
 *         description: 未登录
 */
router.get('/', flashSaleController.getFlashSales)

/**
 * @openapi
 * /flash-sales/{id}/items:
 *   get:
 *     tags: [FlashSales]
 *     summary: 获取秒杀活动商品列表
 *     description: 返回指定秒杀活动下的所有秒杀商品项（含库存进度）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: 秒杀活动 ID
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
 *                     sale_info: { type: object, description: 活动信息 }
 *                     items:
 *                       type: array
 *                       items: { type: object, description: 秒杀商品项 }
 *       401:
 *         description: 未登录
 *       404:
 *         description: 秒杀活动不存在
 */
router.get('/:id/items', validateUuid(), flashSaleController.getFlashSaleItems)

/**
 * @openapi
 * /flash-sales/{id}/items/{itemId}:
 *   get:
 *     tags: [FlashSales]
 *     summary: 获取秒杀商品项详情
 *     description: 返回指定秒杀活动下指定商品项的详情
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: 秒杀活动 ID
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: integer }
 *         description: 秒杀商品项 ID
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
 *                     stock: { type: integer }
 *                     sold_count: { type: integer }
 *                     remaining_stock: { type: integer }
 *                     progress: { type: string }
 *                     sale_info: { type: object, description: 活动信息 }
 *       401:
 *         description: 未登录
 *       404:
 *         description: 秒杀活动/商品不存在
 */
router.get('/:id/items/:itemId', validateUuid(), flashSaleController.getFlashSaleItem)

/**
 * @openapi
 * /flash-sales/{id}/buy:
 *   post:
 *     tags: [FlashSales]
 *     summary: 秒杀下单
 *     description: 用户对指定秒杀活动的商品进行秒杀下单（需 CSRF 保护），受库存和限购数量约束
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: 秒杀活动 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [itemId]
 *             properties:
 *               itemId: { type: string, description: 秒杀商品项 ID }
 *               quantity: { type: integer, minimum: 1, default: 1, description: 购买数量 }
 *     responses:
 *       201:
 *         description: 秒杀成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: integer, example: 0 }
 *                 message: { type: string, example: 秒杀成功，请尽快支付 }
 *                 data: { type: object, description: 秒杀订单信息 }
 *       400:
 *         description: 活动未开始/已结束 / 库存不足 / 超出限购数量
 *       401:
 *         description: 未登录
 *       404:
 *         description: 秒杀活动/商品不存在
 */
router.post(
  '/:id/buy',
  validateUuid(),
  csrfProtectionMiddleware,
  flashSaleController.buyFlashSale
)

/**
 * @openapi
 * /flash-sales/join:
 *   post:
 *     tags: [FlashSales]
 *     summary: 直接参与秒杀
 *     description: 通过秒杀商品项 ID 直接参与秒杀下单（需 CSRF 保护），无需先获取活动 ID
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId]
 *             properties:
 *               productId: { type: string, description: 秒杀商品项 ID }
 *               quantity: { type: integer, minimum: 1, default: 1, description: 购买数量 }
 *     responses:
 *       201:
 *         description: 秒杀成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: integer, example: 0 }
 *                 message: { type: string, example: 秒杀成功，请尽快支付 }
 *                 data: { type: object, description: 秒杀订单信息 }
 *       400:
 *         description: 活动未开始/已结束 / 库存不足 / 超出限购数量
 *       401:
 *         description: 未登录
 *       404:
 *         description: 秒杀商品不存在
 */
router.post('/join', csrfProtectionMiddleware, flashSaleController.joinFlashSale)

/**
 * @openapi
 * /flash-sales/my-orders:
 *   get:
 *     tags: [FlashSales]
 *     summary: 获取我的秒杀订单
 *     description: 分页返回当前登录用户的秒杀订单列表，可按状态过滤
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
 *         description: 状态过滤
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
 *                       items: { type: object, description: 秒杀订单信息 }
 *                     total: { type: integer }
 *                     page: { type: integer }
 *                     pageSize: { type: integer }
 *       401:
 *         description: 未登录
 */
router.get('/my-orders', flashSaleController.getUserOrders)

/**
 * @openapi
 * /flash-sales/my-orders/{orderId}/cancel:
 *   post:
 *     tags: [FlashSales]
 *     summary: 取消秒杀订单
 *     description: 用户取消自己的待支付秒杀订单，取消后恢复库存（需 CSRF 保护）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string }
 *         description: 秒杀订单 ID
 *     responses:
 *       200:
 *         description: 取消成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: integer, example: 0 }
 *                 message: { type: string, example: 取消成功 }
 *                 data: { type: object, nullable: true }
 *       400:
 *         description: 订单状态不允许取消
 *       401:
 *         description: 未登录
 *       403:
 *         description: 无权操作此订单
 *       404:
 *         description: 订单不存在
 */
router.post('/my-orders/:orderId/cancel', csrfProtectionMiddleware, flashSaleController.cancelOrder)

/**
 * @openapi
 * /flash-sales/admin:
 *   post:
 *     tags: [FlashSales, Admin]
 *     summary: 管理后台-创建秒杀活动
 *     description: 管理员创建新的秒杀活动（需 CSRF 保护）
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, start_time, end_time]
 *             properties:
 *               name: { type: string, description: 活动名称 }
 *               description: { type: string, nullable: true, description: 活动描述 }
 *               start_time: { type: string, format: date-time, description: 开始时间 }
 *               end_time: { type: string, format: date-time, description: 结束时间 }
 *               status: { type: string, default: pending, description: 状态 }
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
 *                 data: { type: object, description: 创建后的活动信息 }
 *       400:
 *         description: 参数错误（名称为空 / 时间为空 / 开始时间不早于结束时间）
 *       401:
 *         description: 未登录
 *       403:
 *         description: 无管理员权限
 */
router.post('/admin', verifyAdmin, csrfProtectionMiddleware, flashSaleController.adminCreate)

/**
 * @openapi
 * /flash-sales/admin/{id}:
 *   put:
 *     tags: [FlashSales, Admin]
 *     summary: 管理后台-更新秒杀活动
 *     description: 管理员更新指定秒杀活动信息（需 CSRF 保护）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: 秒杀活动 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, description: 活动名称 }
 *               description: { type: string, nullable: true, description: 活动描述 }
 *               start_time: { type: string, format: date-time, description: 开始时间 }
 *               end_time: { type: string, format: date-time, description: 结束时间 }
 *               status: { type: string, description: 状态 }
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
 *                 data: { type: object, description: 更新后的活动信息 }
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 未登录
 *       403:
 *         description: 无管理员权限
 *       404:
 *         description: 秒杀活动不存在
 */
router.put('/admin/:id', verifyAdmin, csrfProtectionMiddleware, flashSaleController.adminUpdate)

/**
 * @openapi
 * /flash-sales/admin/{id}:
 *   delete:
 *     tags: [FlashSales, Admin]
 *     summary: 管理后台-删除秒杀活动
 *     description: 管理员删除指定秒杀活动（需 CSRF 保护）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: 秒杀活动 ID
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
 *       401:
 *         description: 未登录
 *       403:
 *         description: 无管理员权限
 *       404:
 *         description: 秒杀活动不存在
 */
router.delete('/admin/:id', verifyAdmin, csrfProtectionMiddleware, flashSaleController.adminDelete)

/**
 * @openapi
 * /flash-sales/admin/{id}/items:
 *   post:
 *     tags: [FlashSales, Admin]
 *     summary: 管理后台-添加秒杀商品
 *     description: 管理员向指定秒杀活动添加秒杀商品项（需 CSRF 保护）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: 秒杀活动 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [product_id, sale_price, stock]
 *             properties:
 *               product_id: { type: string, description: 商品 ID }
 *               sku_id: { type: string, nullable: true, description: SKU ID }
 *               sale_price: { type: number, description: 秒杀价格 }
 *               original_price: { type: number, description: 原价 }
 *               stock: { type: integer, minimum: 1, description: 库存数量 }
 *               limit_per_user: { type: integer, default: 1, description: 每人限购数量 }
 *     responses:
 *       201:
 *         description: 添加成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: integer, example: 0 }
 *                 message: { type: string, example: 添加成功 }
 *                 data: { type: object, description: 添加后的商品项信息 }
 *       400:
 *         description: 参数错误（商品ID为空 / 价格非法 / 库存非法）
 *       401:
 *         description: 未登录
 *       403:
 *         description: 无管理员权限
 *       404:
 *         description: 秒杀活动不存在
 */
router.post(
  '/admin/:id/items',
  verifyAdmin,
  csrfProtectionMiddleware,
  flashSaleController.adminAddItem
)

/**
 * @openapi
 * /flash-sales/admin/{id}/items/{itemId}:
 *   delete:
 *     tags: [FlashSales, Admin]
 *     summary: 管理后台-移除秒杀商品
 *     description: 管理员从指定秒杀活动中移除秒杀商品项（需 CSRF 保护）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: 秒杀活动 ID
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: string }
 *         description: 秒杀商品项 ID
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
 *       401:
 *         description: 未登录
 *       403:
 *         description: 无管理员权限
 *       404:
 *         description: 秒杀活动/商品不存在
 */
router.delete(
  '/admin/:id/items/:itemId',
  verifyAdmin,
  csrfProtectionMiddleware,
  flashSaleController.adminRemoveItem
)

/**
 * @openapi
 * /flash-sales/admin/{id}/orders:
 *   get:
 *     tags: [FlashSales, Admin]
 *     summary: 管理后台-获取秒杀订单列表
 *     description: 管理员分页查询指定秒杀活动的订单列表，可按状态过滤
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: 秒杀活动 ID
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
 *         description: 状态过滤
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
 *                       items: { type: object, description: 秒杀订单信息 }
 *                     total: { type: integer }
 *                     page: { type: integer }
 *                     pageSize: { type: integer }
 *       401:
 *         description: 未登录
 *       403:
 *         description: 无管理员权限
 *       404:
 *         description: 秒杀活动不存在
 */
router.get('/admin/:id/orders', verifyAdmin, flashSaleController.adminListOrders)

export default router
