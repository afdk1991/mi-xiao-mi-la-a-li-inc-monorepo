import express from 'express'
import internalController from '../controllers/internalController'
import { serviceAuthMiddleware } from '../middleware/serviceAuth'

const router = express.Router()

router.use(serviceAuthMiddleware)

router.get('/users/:id', internalController.getUserById)
router.post('/users/batch', internalController.batchGetUsers)
router.get('/users/:id/points', internalController.getUserPoints)
router.post('/users/:id/points/deduct', internalController.deductPoints)
router.post('/users/:id/points/add', internalController.addPoints)
router.get('/users/:userId/addresses', internalController.getUserAddresses)
router.get('/users/:userId/addresses/default', internalController.getDefaultAddress)

export default router
