import express from 'express'
import inboxController from '../controllers/inboxController'
import { authMiddleware, verifyAdmin } from '../middleware/auth'
import { csrfProtectionMiddleware } from '../middleware/security'
import { validateUuid } from '../middleware/validateId'

const router = express.Router()

router.use(authMiddleware)

router.get('/', inboxController.getMessages)
router.get('/unread-count', inboxController.getUnreadCount)
router.get('/:id', validateUuid(), inboxController.getMessage)
router.post('/', csrfProtectionMiddleware, inboxController.sendMessage)
router.put('/:id/read', validateUuid(), csrfProtectionMiddleware, inboxController.markAsRead)
router.put('/read-all', csrfProtectionMiddleware, inboxController.markAllAsRead)
router.delete('/:id', validateUuid(), csrfProtectionMiddleware, inboxController.deleteMessage)

router.post('/admin', verifyAdmin, csrfProtectionMiddleware, inboxController.adminSendMessage)
router.get('/admin', verifyAdmin, inboxController.adminListMessages)
router.get('/admin/:id', verifyAdmin, validateUuid(), inboxController.adminGetMessage)
router.delete(
  '/admin/:id',
  verifyAdmin,
  csrfProtectionMiddleware,
  inboxController.adminDeleteMessage
)

export default router
