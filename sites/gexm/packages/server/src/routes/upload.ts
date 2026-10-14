import express from 'express'
import uploadController from '../controllers/uploadController'
import { authMiddleware } from '../middleware/auth'
import { uploadLimiter } from '../middleware/rateLimiter'

const router = express.Router()

router.use(authMiddleware)

router.post('/file', uploadLimiter, uploadController.uploadFile, uploadController.handleUpload)

router.post(
  '/image',
  uploadLimiter,
  uploadController.uploadImage,
  uploadController.handleImageUpload
)

export default router
