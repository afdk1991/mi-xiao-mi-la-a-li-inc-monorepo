import express from 'express'
import categoryController from '../controllers/categoryController'
import { authMiddleware, adminMiddleware } from '../middleware/auth'
import { validateUuid } from '../middleware/validateId'

const router = express.Router()

/**
 * @openapi
 * /categories:
 *   get:
 *     tags: [Categories]
 *     summary: 获取分类树
 *     description: 返回完整的商品分类树形结构（无需登录）
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
 *                     description: 分类节点（含 children 子分类数组）
 */
router.get('/', categoryController.getCategoryTree)

/**
 * @openapi
 * /categories/{id}/products:
 *   get:
 *     tags: [Categories, Products]
 *     summary: 获取分类下商品列表
 *     description: 分页返回指定分类下的商品列表（无需登录）
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: 分类 ID
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *         description: 页码
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, default: 20 }
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
 *                       items: { type: object, description: 商品信息 }
 *                     total: { type: integer }
 *                     page: { type: integer }
 *                     pageSize: { type: integer }
 *       404:
 *         description: 分类不存在
 */
router.get('/:id/products', validateUuid(), categoryController.getCategoryProducts)

/**
 * @openapi
 * /categories/{id}/path:
 *   get:
 *     tags: [Categories]
 *     summary: 获取分类路径
 *     description: 返回从根分类到指定分类的完整路径（无需登录）
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: 分类 ID
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
 *                   items: { type: object, description: 路径上的分类节点 }
 *       404:
 *         description: 分类不存在
 */
router.get('/:id/path', validateUuid(), categoryController.getCategoryPath)

router.use(authMiddleware, adminMiddleware)

/**
 * @openapi
 * /categories:
 *   post:
 *     tags: [Categories]
 *     summary: 创建分类
 *     description: 管理员创建新的商品分类，支持指定父分类
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, description: 分类名称 }
 *               parent_id: { type: string, nullable: true, description: 父分类 ID }
 *               icon: { type: string, nullable: true, description: 图标 }
 *               sort_order: { type: integer, nullable: true, description: 排序值 }
 *               status: { type: string, nullable: true, description: 状态 }
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
 *                 data: { type: object, description: 创建后的分类信息 }
 *       400:
 *         description: 参数错误（名称为空 / 父分类不存在）
 *       401:
 *         description: 未登录
 *       403:
 *         description: 无管理员权限
 */
router.post('/', categoryController.createCategory)

/**
 * @openapi
 * /categories/{id}:
 *   put:
 *     tags: [Categories]
 *     summary: 更新分类
 *     description: 管理员更新指定分类的信息，不能将自己设为父分类
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: 分类 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, description: 分类名称 }
 *               parent_id: { type: string, nullable: true, description: 父分类 ID }
 *               icon: { type: string, nullable: true, description: 图标 }
 *               sort_order: { type: integer, nullable: true, description: 排序值 }
 *               status: { type: string, nullable: true, description: 状态 }
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
 *                 data: { type: object, description: 更新后的分类信息 }
 *       400:
 *         description: 参数错误（不能将自己设为父分类 / 父分类不存在）
 *       401:
 *         description: 未登录
 *       403:
 *         description: 无管理员权限
 *       404:
 *         description: 分类不存在
 */
router.put('/:id', validateUuid(), categoryController.updateCategory)

/**
 * @openapi
 * /categories/{id}:
 *   delete:
 *     tags: [Categories]
 *     summary: 删除分类
 *     description: 管理员删除指定分类，若存在子分类则禁止删除
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: 分类 ID
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
 *       400:
 *         description: 请先删除子分类
 *       401:
 *         description: 未登录
 *       403:
 *         description: 无管理员权限
 *       404:
 *         description: 分类不存在
 */
router.delete('/:id', validateUuid(), categoryController.deleteCategory)

/**
 * @openapi
 * /categories/{id}/sort:
 *   patch:
 *     tags: [Categories]
 *     summary: 更新分类排序
 *     description: 管理员更新指定分类的排序值
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: 分类 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sort_order]
 *             properties:
 *               sort_order: { type: integer, description: 排序值 }
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
 *                 data: { type: object, description: 更新后的分类信息 }
 *       400:
 *         description: 排序值无效
 *       401:
 *         description: 未登录
 *       403:
 *         description: 无管理员权限
 *       404:
 *         description: 分类不存在
 */
router.patch('/:id/sort', validateUuid(), categoryController.updateCategorySort)

/**
 * @openapi
 * /categories/batch/sort:
 *   post:
 *     tags: [Categories]
 *     summary: 批量更新分类排序
 *     description: 管理员批量更新多个分类的排序值
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items]
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id: { type: string, description: 分类 ID }
 *                     sort_order: { type: integer, description: 排序值 }
 *     responses:
 *       200:
 *         description: 批量排序成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: integer, example: 0 }
 *                 message: { type: string, example: 批量排序成功 }
 *                 data:
 *                   type: object
 *                   properties:
 *                     count: { type: integer, description: 更新数量 }
 *       400:
 *         description: 排序参数不完整 / 列表为空
 *       401:
 *         description: 未登录
 *       403:
 *         description: 无管理员权限
 *       404:
 *         description: 指定分类不存在
 */
router.post('/batch/sort', categoryController.batchUpdateCategorySort)

export default router
