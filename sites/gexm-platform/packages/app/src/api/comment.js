/**
 * 评论相关API
 */
import http from './request'

const commentApi = {
  /**
   * 获取评论列表
   */
  getComments(targetType = 'global', targetId = null, page = 1, pageSize = 20) {
    const params = { targetType, page, pageSize }
    if (targetId) params.targetId = targetId
    return http.get('/chat/comments', params)
  },

  /**
   * 发表评论
   */
  createComment(data) {
    return http.post('/chat/comments', data)
  },

  /**
   * 获取评论回复
   */
  getCommentReplies(commentId, page = 1, pageSize = 10) {
    return http.get(`/chat/comments/${commentId}/replies`, { page, pageSize })
  },

  /**
   * 点赞评论
   */
  likeComment(commentId) {
    return http.post(`/chat/comments/${commentId}/like`)
  },

  /**
   * 删除评论
   */
  deleteComment(commentId) {
    return http.delete(`/chat/comments/${commentId}`)
  },
}

export default commentApi
