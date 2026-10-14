import express from 'express'
import addressController from '../controllers/addressController'
import { authMiddleware } from '../middleware/auth'
import { validateInput, sanitizeInput } from '../middleware/security'

const router = express.Router()

router.use(authMiddleware)

router.get('/', addressController.list)
router.get('/:id', addressController.get)
router.post('/', validateInput, sanitizeInput, addressController.create)
router.put('/:id', validateInput, sanitizeInput, addressController.update)
router.put('/:id/default', addressController.setDefault)
router.delete('/:id', addressController.remove)

export default router
