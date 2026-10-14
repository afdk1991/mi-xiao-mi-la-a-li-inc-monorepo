import express from 'express'
import notificationController from '../controllers/notificationController'
import { authMiddleware } from '../middleware/auth'
import { validateUuid } from '../middleware/validateId'

const router = express.Router()

router.use(authMiddleware)

router.get('/', notificationController.getNotifications)
router.get('/unread-count', notificationController.getUnreadCount)
router.put('/:id/read', validateUuid(), notificationController.markAsRead)
router.put('/read-all', notificationController.markAllAsRead)

export default router
