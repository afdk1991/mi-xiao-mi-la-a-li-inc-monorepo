import express from 'express'
import cartController from '../controllers/cartController'
import { authMiddleware } from '../middleware/auth'
import { validateUuid } from '../middleware/validateId'

const router = express.Router()

router.use(authMiddleware)

/**
 * @openapi
 * /cart:
 *   get:
 *     tags: [Cart]
 *     summary: 获取购物车列表
 *     description: 返回当前登录用户的购物车所有商品列表
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
 *                       id: { type: string, description: 购物车项 ID }
 *                       user_id: { type: string }
 *                       product_id: { type: string }
 *                       sku_id: { type: string, nullable: true }
 *                       quantity: { type: integer }
 *                       selected: { type: integer, description: 选中状态(0/1) }
 *       401:
 *         description: 未登录
 */
router.get('/', cartController.getCart)

/**
 * @openapi
 * /cart/count:
 *   get:
 *     tags: [Cart]
 *     summary: 获取购物车商品数量
 *     description: 返回当前登录用户购物车中的商品总数量
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
 *                     count: { type: integer, description: 购物车商品数量 }
 *       401:
 *         description: 未登录
 */
router.get('/count', cartController.getCount)

/**
 * @openapi
 * /cart:
 *   post:
 *     tags: [Cart]
 *     summary: 添加商品到购物车
 *     description: 将指定商品添加到购物车，若已存在相同 SKU 则累加数量
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
 *               productId: { type: string, description: 商品 ID }
 *               skuId: { type: string, nullable: true, description: SKU ID }
 *               quantity: { type: integer, minimum: 1, default: 1, description: 数量 }
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
 *                 data: { type: object, description: 购物车项信息 }
 *       400:
 *         description: 参数错误（商品ID为空 / 数量非法）
 *       401:
 *         description: 未登录
 */
router.post('/', cartController.addToCart)

/**
 * @openapi
 * /cart/{id}:
 *   put:
 *     tags: [Cart]
 *     summary: 修改购物车商品数量
 *     description: 更新指定购物车项的商品数量
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: 购物车项 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantity]
 *             properties:
 *               quantity: { type: integer, minimum: 1, description: 新数量 }
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
 *                 data: { type: object, description: 更新后的购物车项 }
 *       400:
 *         description: 数量非法
 *       403:
 *         description: 无权限操作他人购物车
 *       404:
 *         description: 购物车商品不存在
 */
router.put('/:id', validateUuid(), cartController.updateQuantity)

/**
 * @openapi
 * /cart/{id}:
 *   delete:
 *     tags: [Cart]
 *     summary: 删除购物车单项商品
 *     description: 删除指定购物车项
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: 购物车项 ID
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
 *         description: 无权限操作
 *       404:
 *         description: 购物车商品不存在
 */
router.delete('/:id', validateUuid(), cartController.deleteItem)

/**
 * @openapi
 * /cart:
 *   delete:
 *     tags: [Cart]
 *     summary: 批量删除购物车商品
 *     description: 根据购物车项 ID 列表批量删除
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids]
 *             properties:
 *               ids:
 *                 type: array
 *                 items: { type: string }
 *                 description: 购物车项 ID 列表
 *     responses:
 *       200:
 *         description: 删除成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: integer, example: 0 }
 *                 message: { type: string, example: 删除成功，共删除 N 件商品 }
 *                 data:
 *                   type: object
 *                   properties:
 *                     deleted: { type: integer, description: 实际删除数量 }
 *       400:
 *         description: 未选择要删除的商品
 */
router.delete('/', cartController.batchDelete)

/**
 * @openapi
 * /cart/select:
 *   patch:
 *     tags: [Cart]
 *     summary: 更新购物车选中状态
 *     description: 可单选/取消单选，也可全选/取消全选
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id: { type: string, description: 购物车项 ID（单选时必填） }
 *               selected: { type: boolean, description: 选中状态 }
 *               allSelected: { type: boolean, description: 是否全选（传入时执行全选/取消全选） }
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
 *                 data: { type: object, nullable: true }
 *       400:
 *         description: 购物车ID不能为空
 *       403:
 *         description: 无权限操作
 *       404:
 *         description: 购物车商品不存在
 */
router.patch('/select', cartController.updateSelected)

export default router
