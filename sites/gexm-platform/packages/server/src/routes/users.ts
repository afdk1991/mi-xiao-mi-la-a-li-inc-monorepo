import express from 'express'
import userController from '../controllers/userController'
import { authMiddleware, adminMiddleware } from '../middleware/auth'
import { csrfProtectionMiddleware } from '../middleware/security'
import auditLog from '../middleware/auditMiddleware'
import userModel from '../models/userModel'
import { validateUuid } from '../middleware/validateId'

const router = express.Router()

router.use(authMiddleware, adminMiddleware)

router.get('/', userController.getUsers)
router.get('/:id', validateUuid(), userController.getUser)
router.post('/', csrfProtectionMiddleware, auditLog('create', 'user'), userController.createUser)
router.put(
  '/:id',
  validateUuid(),
  csrfProtectionMiddleware,
  auditLog('update', 'user', {
    getBeforeData: (req) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
      const user = userModel.findById(id)
      return Promise.resolve(user ? userModel.sanitizeUser(user) : null)
    },
  }),
  userController.updateUser
)
router.delete(
  '/:id',
  validateUuid(),
  csrfProtectionMiddleware,
  auditLog('delete', 'user', {
    getBeforeData: (req) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
      const user = userModel.findById(id)
      return Promise.resolve(user ? userModel.sanitizeUser(user) : null)
    },
  }),
  userController.deleteUser
)

export default router
