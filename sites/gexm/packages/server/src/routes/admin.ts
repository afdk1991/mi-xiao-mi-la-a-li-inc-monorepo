import express from 'express'
import { verifyToken, verifyAdmin } from '../middleware/auth'
import { csrfProtectionMiddleware } from '../middleware/security'
import auditLog from '../middleware/auditMiddleware'
import productModel from '../models/productModel'
import orderModel from '../models/orderModel'
import productController from '../controllers/productController'
import orderController from '../controllers/orderController'
import dashboardController from '../controllers/dashboardController'
import adminController from '../controllers/adminController'
import reviewController from '../controllers/reviewController'
import auditController from '../controllers/auditController'
import rbacController from '../controllers/rbacController'
import sensitiveAction from '../middleware/sensitiveAction'
import { validateEntityId } from '../middleware/validateId'

const router = express.Router()

router.use(verifyToken)
router.use(verifyAdmin)
router.use(sensitiveAction.sensitiveActionMiddleware)

router.get('/products', productController.getAllProducts)
router.get('/products/:id', validateEntityId(), productController.getProductDetail)
router.post(
  '/products',
  csrfProtectionMiddleware,
  auditLog('create', 'product'),
  productController.createProduct
)
router.put(
  '/products/:id',
  validateEntityId(),
  csrfProtectionMiddleware,
  auditLog('update', 'product', {
    getBeforeData: (req) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
      return Promise.resolve(productModel.findById(id))
    },
  }),
  productController.updateProduct
)
router.delete(
  '/products/:id',
  validateEntityId(),
  csrfProtectionMiddleware,
  auditLog('delete', 'product', {
    getBeforeData: (req) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
      return Promise.resolve(productModel.findById(id))
    },
  }),
  productController.deleteProduct
)
router.patch(
  '/products/:id/status',
  validateEntityId(),
  csrfProtectionMiddleware,
  auditLog('update_status', 'product', {
    getBeforeData: (req) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
      return Promise.resolve(productModel.findById(id))
    },
  }),
  productController.updateProductStatus
)
router.post(
  '/products/batch/status',
  csrfProtectionMiddleware,
  auditLog('batch_update_status', 'product'),
  productController.batchUpdateProductStatus
)
router.post(
  '/products/batch/delete',
  csrfProtectionMiddleware,
  auditLog('batch_delete', 'product'),
  productController.batchDeleteProducts
)

router.get('/orders', orderController.getAllOrders)
router.get('/orders/statistics', orderController.getOrderStatistics)
router.get('/orders/:id', validateEntityId(), orderController.getOrderDetail)
router.get('/orders/:id/logistics', validateEntityId(), orderController.getOrderLogistics)
router.patch(
  '/orders/:id/status',
  validateEntityId(),
  csrfProtectionMiddleware,
  auditLog('update_status', 'order', {
    getBeforeData: (req) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
      return Promise.resolve(orderModel.findById(id))
    },
  }),
  orderController.updateOrderStatus
)
router.post(
  '/orders/:id/ship',
  validateEntityId(),
  csrfProtectionMiddleware,
  auditLog('ship', 'order', {
    getBeforeData: (req) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
      return Promise.resolve(orderModel.findById(id))
    },
  }),
  orderController.shipOrder
)
router.post(
  '/orders/:id/logistics',
  validateEntityId(),
  csrfProtectionMiddleware,
  auditLog('add_logistics', 'order'),
  orderController.addLogistics
)
router.post(
  '/orders/:id/refund/audit',
  validateEntityId(),
  csrfProtectionMiddleware,
  auditLog('refund_audit', 'order', {
    getBeforeData: (req) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
      return Promise.resolve(orderModel.findById(id))
    },
  }),
  orderController.auditRefund
)
router.post(
  '/orders/batch/status',
  csrfProtectionMiddleware,
  auditLog('batch_update_status', 'order'),
  orderController.batchUpdateOrderStatus
)

router.get('/dashboard/overview', dashboardController.getDashboardOverview)
router.get('/dashboard/order-trend', dashboardController.getOrderTrend)
router.get('/dashboard/product-rank', dashboardController.getProductRank)
router.get('/dashboard/user-trend', dashboardController.getUserTrend)
router.get('/dashboard/conversion', dashboardController.getConversion)
router.get('/dashboard/payment-stats', dashboardController.getPaymentStats)
router.get('/dashboard/refund-stats', dashboardController.getRefundStats)
router.get('/dashboard/coupon-stats', dashboardController.getCouponStats)

router.get('/categories', adminController.getCategories)

router.get('/reviews', reviewController.getAllReviews)
router.get('/reviews/:id', validateEntityId(), reviewController.getReviewDetail)
router.delete(
  '/reviews/:id',
  validateEntityId(),
  csrfProtectionMiddleware,
  auditLog('delete', 'review'),
  reviewController.deleteReview
)
router.patch(
  '/reviews/:id/reply',
  validateEntityId(),
  csrfProtectionMiddleware,
  auditLog('reply', 'review'),
  reviewController.replyReview
)
router.patch(
  '/reviews/:id/status',
  validateEntityId(),
  csrfProtectionMiddleware,
  auditLog('audit', 'review'),
  reviewController.updateReviewStatus
)
router.post(
  '/reviews/batch/delete',
  csrfProtectionMiddleware,
  auditLog('batch_delete', 'review'),
  reviewController.batchDeleteReviews
)

router.get('/audit/logs', auditController.getLogs)
router.get('/audit/logs/:id', validateEntityId(), auditController.getLogDetail)
router.get('/audit/stats', auditController.getStats)

router.get('/audit-logs', (req, res) => res.redirect('/api/admin/audit/logs'))
router.get('/audit-logs/:id', validateEntityId(), (req, res) => {
  res.redirect(`/api/admin/audit/logs/${req.params.id}`)
})
router.get('/audit-stats', (req, res) => res.redirect('/api/admin/audit/stats'))

router.get('/roles', rbacController.getRoles)
router.get('/roles/:id', validateEntityId(), rbacController.getRoleDetail)
router.post(
  '/roles',
  csrfProtectionMiddleware,
  auditLog('create', 'role'),
  rbacController.createRole
)
router.put(
  '/roles/:id',
  validateEntityId(),
  csrfProtectionMiddleware,
  auditLog('update', 'role'),
  rbacController.updateRole
)
router.delete(
  '/roles/:id',
  validateEntityId(),
  csrfProtectionMiddleware,
  auditLog('delete', 'role'),
  rbacController.deleteRole
)

router.get('/permissions', rbacController.getPermissions)

router.get('/users/:userId/roles', validateEntityId('userId'), rbacController.getUserRoles)
router.post(
  '/users/roles',
  csrfProtectionMiddleware,
  auditLog('assign_role', 'user'),
  rbacController.assignRoleToUser
)
router.delete(
  '/users/:userId/roles/:roleId',
  validateEntityId('userId'),
  validateEntityId('roleId'),
  csrfProtectionMiddleware,
  auditLog('remove_role', 'user'),
  rbacController.removeRoleFromUser
)

// 敏感操作验证请求需启用 CSRF 保护，防止跨站伪造
router.post('/sensitive/request-verify', csrfProtectionMiddleware, sensitiveAction.requestVerify)

export default router
