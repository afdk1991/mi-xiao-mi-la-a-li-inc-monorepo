import express from 'express'
import addressController from '../controllers/addressController'
import { authMiddleware } from '../middleware/auth'
import { validateSchema } from '../middleware/validateSchema'
import { createAddressSchema, updateAddressSchema } from '../schemas/address'
import { validateUuid } from '../middleware/validateId'

const router = express.Router()

router.use(authMiddleware)

/**
 * @openapi
 * /addresses:
 *   get:
 *     tags: [Addresses]
 *     summary: 获取用户收货地址列表
 *     description: 返回当前登录用户的所有收货地址
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
 *                     $ref: '#/components/schemas/Address'
 *       401:
 *         description: 用户未登录
 */
router.get('/', addressController.getAddresses)

/**
 * @openapi
 * /addresses/default:
 *   get:
 *     tags: [Addresses]
 *     summary: 获取默认收货地址
 *     description: 返回当前登录用户的默认收货地址，若不存在则返回 null
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
 *                   $ref: '#/components/schemas/Address'
 *       401:
 *         description: 用户未登录
 */
router.get('/default', addressController.getDefaultAddress)

/**
 * @openapi
 * /addresses/{id}:
 *   get:
 *     tags: [Addresses]
 *     summary: 获取单个收货地址详情
 *     description: 根据 ID 获取收货地址详情，仅能查看本人地址
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: 地址 ID
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
 *                   $ref: '#/components/schemas/Address'
 *       403:
 *         description: 无权限查看
 *       404:
 *         description: 地址不存在
 */
router.get('/:id', validateUuid(), addressController.getAddress)

/**
 * @openapi
 * /addresses:
 *   post:
 *     tags: [Addresses]
 *     summary: 新增收货地址
 *     description: 创建一条新的收货地址，若设为默认将自动取消其他默认地址
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddressInput'
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
 *                   $ref: '#/components/schemas/Address'
 *       400:
 *         description: 参数校验失败
 *       401:
 *         description: 用户未登录
 */
router.post('/', validateSchema(createAddressSchema), addressController.createAddress)

/**
 * @openapi
 * /addresses/{id}:
 *   put:
 *     tags: [Addresses]
 *     summary: 更新收货地址
 *     description: 更新指定收货地址信息，仅能更新本人地址
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: 地址 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddressInput'
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
 *                   $ref: '#/components/schemas/Address'
 *       400:
 *         description: 参数校验失败
 *       403:
 *         description: 无权限修改
 *       404:
 *         description: 地址不存在
 */
router.put(
  '/:id',
  validateUuid(),
  validateSchema(updateAddressSchema),
  addressController.updateAddress
)

/**
 * @openapi
 * /addresses/{id}:
 *   delete:
 *     tags: [Addresses]
 *     summary: 删除收货地址
 *     description: 删除指定收货地址，仅能删除本人地址
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: 地址 ID
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
 *         description: 无权限删除
 *       404:
 *         description: 地址不存在
 */
router.delete('/:id', validateUuid(), addressController.deleteAddress)

/**
 * @openapi
 * /addresses/{id}/default:
 *   patch:
 *     tags: [Addresses]
 *     summary: 设置默认收货地址
 *     description: 将指定地址设为默认，同时取消其他默认地址
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: 地址 ID
 *     responses:
 *       200:
 *         description: 设置成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: integer, example: 0 }
 *                 message: { type: string, example: 设置成功 }
 *                 data:
 *                   $ref: '#/components/schemas/Address'
 *       403:
 *         description: 无权限操作
 *       404:
 *         description: 地址不存在
 */
router.patch('/:id/default', validateUuid(), addressController.setDefault)

export default router
