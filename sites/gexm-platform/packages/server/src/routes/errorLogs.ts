import express from 'express'
import errorLogController from '../controllers/errorLogController'
import { authMiddleware, adminMiddleware, optionalAuthMiddleware } from '../middleware/auth'

const router = express.Router()

router.post('/report', optionalAuthMiddleware, errorLogController.report)

router.use(authMiddleware, adminMiddleware)
router.get('/', errorLogController.getLogs)
router.get('/stats', errorLogController.getStats)

export default router
