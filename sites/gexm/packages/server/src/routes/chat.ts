import express from 'express'
import chatController from '../controllers/chatController'
import { authMiddleware } from '../middleware/auth'
import { messageLimiter } from '../middleware/rateLimiter'

const router = express.Router()

router.get('/conversations', authMiddleware, chatController.getConversations)
router.post('/conversations', authMiddleware, chatController.createConversation)
router.get('/conversations/ai', authMiddleware, chatController.getAIConversation)
router.get('/conversations/:conversationId', authMiddleware, chatController.getConversationDetail)

router.post(
  '/conversations/:conversationId/messages',
  authMiddleware,
  messageLimiter,
  chatController.sendMessage
)
router.get('/conversations/:conversationId/messages', authMiddleware, chatController.getMessages)
router.get('/unread-count', authMiddleware, chatController.getUnreadCount)

router.get('/comments', chatController.getComments)
router.post('/comments', authMiddleware, chatController.createComment)
router.get('/comments/:commentId/replies', chatController.getCommentReplies)
router.post('/comments/:commentId/like', chatController.likeComment)
router.delete('/comments/:commentId', authMiddleware, chatController.deleteComment)

export default router
