import express from 'express'
import shippingController from '../controllers/shippingController'
import { authMiddleware, verifyAdmin } from '../middleware/auth'
import { csrfProtectionMiddleware } from '../middleware/security'
import { validateUuid } from '../middleware/validateId'

const router = express.Router()

router.use(authMiddleware)

router.post('/calculate', shippingController.calculate)
router.get('/templates', shippingController.getTemplates)
router.get('/templates/:id', validateUuid(), shippingController.getTemplate)

router.post(
  '/admin/templates',
  verifyAdmin,
  csrfProtectionMiddleware,
  shippingController.adminCreate
)
router.put(
  '/admin/templates/:id',
  verifyAdmin,
  csrfProtectionMiddleware,
  shippingController.adminUpdate
)
router.delete(
  '/admin/templates/:id',
  verifyAdmin,
  csrfProtectionMiddleware,
  shippingController.adminDelete
)

export default router
