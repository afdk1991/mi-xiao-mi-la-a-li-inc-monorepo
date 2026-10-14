/**
 * 评论状态管理
 * 管理评论列表、点赞、回复等
 */
import { defineStore } from 'pinia'
import commentApi from '../api/comment'

export const useCommentStore = defineStore('comment', {
  state: () => ({
    // 评论列表
    comments: [],
    commentsTotal: 0,
    commentsPage: 1,
  }),

  getters: {
    // 是否有评论
    hasComments: (state) => state.comments.length > 0,

    // 是否有更多评论
    hasMoreComments: (state) => state.comments.length < state.commentsTotal,
  },

  actions: {
    /**
     * 获取评论列表
     */
    async fetchComments(targetType = 'global', targetId = null, page = 1, pageSize = 20) {
      try {
        const result = await commentApi.getComments(targetType, targetId, page, pageSize)

        if (page === 1) {
          this.comments = result.comments || []
        } else {
          this.comments = [...this.comments, ...(result.comments || [])]
        }

        this.commentsTotal = result.total || 0
        this.commentsPage = page
        return result
      } catch (e) {
        console.error('Failed to fetch comments:', e)
        throw e
      }
    },

    /**
     * 发表评论
     */
    async postComment(data) {
      try {
        const comment = await commentApi.createComment(data)
        this.comments.unshift(comment)
        this.commentsTotal++
        return comment
      } catch (e) {
        console.error('Failed to post comment:', e)
        throw e
      }
    },

    /**
     * 点赞评论
     */
    async likeComment(commentId) {
      try {
        const comment = await commentApi.likeComment(commentId)
        const index = this.comments.findIndex((c) => c.id === commentId)
        if (index !== -1) {
          this.comments[index].likes = comment.likes
        }
        return comment
      } catch (e) {
        console.error('Failed to like comment:', e)
        throw e
      }
    },

    /**
     * 删除评论
     */
    async deleteComment(commentId) {
      try {
        await commentApi.deleteComment(commentId)
        const index = this.comments.findIndex((c) => c.id === commentId)
        if (index !== -1) {
          this.comments.splice(index, 1)
          this.commentsTotal--
        }
      } catch (e) {
        console.error('Failed to delete comment:', e)
        throw e
      }
    },

    /**
     * 清空评论状态
     */
    clearComments() {
      this.comments = []
      this.commentsTotal = 0
      this.commentsPage = 1
    },
  },
})
