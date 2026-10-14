import express from 'express'
import syncController from '../controllers/syncController'
import { authMiddleware } from '../middleware/auth'

const router = express.Router()

router.use(authMiddleware)

router.get('/pull', syncController.pull)
router.post('/push', syncController.push)
router.get('/status', syncController.getStatus)
router.post('/clear', syncController.clearOldRecords)

export default router
