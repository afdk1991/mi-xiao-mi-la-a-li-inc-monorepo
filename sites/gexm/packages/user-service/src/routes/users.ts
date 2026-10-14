import express from 'express'
import userController from '../controllers/userController'
import { authMiddleware, adminMiddleware } from '../middleware/auth'
import { validateInput, sanitizeInput } from '../middleware/security'

const router = express.Router()

router.use(authMiddleware, adminMiddleware)

router.get('/', userController.getUsers)
router.get('/:id', userController.getUser)
router.post('/', validateInput, sanitizeInput, userController.createUser)
router.put('/:id', validateInput, sanitizeInput, userController.updateUser)
router.delete('/:id', userController.deleteUser)

export default router