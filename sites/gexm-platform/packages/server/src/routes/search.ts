import express from 'express'
import searchController from '../controllers/searchController'
import { authMiddleware } from '../middleware/auth'

const router = express.Router()

router.get('/', searchController.searchProducts)
router.get('/hot', searchController.getHotKeywords)
router.get('/suggest', searchController.getSuggestions)

router.use(authMiddleware)

router.get('/history', searchController.getSearchHistory)
router.delete('/history', searchController.clearSearchHistory)
router.delete('/history/item', searchController.deleteSearchHistoryItem)

export default router
