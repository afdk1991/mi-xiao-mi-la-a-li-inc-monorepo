import express from 'express'
import productController from '../controllers/productController'
import reviewController from '../controllers/reviewController'
import { authMiddleware, adminMiddleware } from '../middleware/auth'
import { validateUuid } from '../middleware/validateId'

const router = express.Router()

/**
 * @openapi
 * /products/hot:
 *   get:
 *     tags: [Products]
 *     summary: 获取热门商品
 *     responses:
 *       200:
 *         description: 热门商品列表
 */
router.get('/hot', productController.getHotProducts)

/**
 * @openapi
 * /products/new:
 *   get:
 *     tags: [Products]
 *     summary: 获取新品商品
 *     responses:
 *       200:
 *         description: 新品商品列表
 */
router.get('/new', productController.getNewProducts)

/**
 * @openapi
 * /products/price-range:
 *   get:
 *     tags: [Products]
 *     summary: 获取商品价格范围
 *     responses:
 *       200:
 *         description: 商品价格范围
 */
router.get('/price-range', productController.getPriceRange)

/**
 * @openapi
 * /products:
 *   get:
 *     tags: [Products]
 *     summary: 获取商品列表
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
 *       - name: categoryId
 *         in: query
 *         schema:
 *           type: string
 *       - name: keyword
 *         in: query
 *         schema:
 *           type: string
 *       - name: sort
 *         in: query
 *         schema:
 *           type: string
 *           enum: [price_asc, price_desc, sales, newest]
 *     responses:
 *       200:
 *         description: 商品列表
 */
router.get('/', productController.getProducts)

/**
 * @openapi
 * /products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: 获取商品详情
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 商品详情
 *       404:
 *         description: 商品不存在
 */
router.get('/:id', validateUuid(), productController.getProductDetail)

/**
 * @openapi
 * /products/{id}/skus:
 *   get:
 *     tags: [Products]
 *     summary: 获取商品 SKU 列表
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: SKU 列表
 */
router.get('/:id/skus', validateUuid(), productController.getProductSkus)

/**
 * @openapi
 * /products/{id}/reviews:
 *   get:
 *     tags: [Products, Reviews]
 *     summary: 获取商品评价
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *       - name: pageSize
 *         in: query
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 评价列表
 */
router.get('/:id/reviews', validateUuid(), reviewController.getProductReviews)
router.get('/:id/reviews/stats', validateUuid(), reviewController.getProductReviewStats)

router.use(authMiddleware, adminMiddleware)

/**
 * @openapi
 * /products:
 *   post:
 *     tags: [Products]
 *     summary: 创建商品（管理员）
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, price, stock]
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: integer
 *               categoryId:
 *                 type: string
 *               description:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: 创建成功
 *       403:
 *         description: 无权限
 */
router.post('/', productController.createProduct)

/**
 * @openapi
 * /products/{id}:
 *   put:
 *     tags: [Products]
 *     summary: 更新商品（管理员）
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
 *         description: 更新成功
 *       404:
 *         description: 商品不存在
 */
router.put('/:id', validateUuid(), productController.updateProduct)

/**
 * @openapi
 * /products/{id}:
 *   delete:
 *     tags: [Products]
 *     summary: 删除商品（管理员）
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
 *         description: 删除成功
 */
router.delete('/:id', validateUuid(), productController.deleteProduct)
router.patch('/:id/status', validateUuid(), productController.updateProductStatus)
router.patch('/:id/stock', validateUuid(), productController.adjustStock)
router.get('/:id/stock-logs', validateUuid(), productController.getStockLogs)
router.get('/low-stock/list', productController.getLowStockProducts)

export default router
