import express from 'express'
import favoriteController from '../controllers/favoriteController'
import { authMiddleware } from '../middleware/auth'
import { validateUuid } from '../middleware/validateId'

const router = express.Router()

router.use(authMiddleware)

router.get('/', favoriteController.getFavorites)
router.get('/check/:productId', validateUuid('productId'), favoriteController.checkFavorite)
router.post('/', favoriteController.addFavorite)
router.delete('/:productId', validateUuid('productId'), favoriteController.removeFavorite)
router.delete('/', favoriteController.batchRemove)

export default router
