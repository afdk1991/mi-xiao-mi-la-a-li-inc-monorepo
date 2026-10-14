import { defineStore } from 'pinia'
import reviewApi from '../api/review'

export const useReviewStore = defineStore('review', {
  state: () => ({
    productReviews: [],
    productReviewStats: null,
    myReviews: [],
    submitting: false,
  }),

  getters: {
    averageRating: (state) => {
      if (!state.productReviewStats) return 0
      return state.productReviewStats.average_rating || 0
    },

    fiveStarCount: (state) => {
      if (!state.productReviewStats) return 0
      return state.productReviewStats.five_star_count || 0
    },
  },

  actions: {
    async fetchProductReviews(productId, params = {}) {
      try {
        const result = await reviewApi.getProductReviews(productId, params)
        this.productReviews = result.data || result || []
        return result
      } catch (e) {
        console.error('Failed to fetch product reviews:', e)
        throw e
      }
    },

    async fetchProductReviewStats(productId) {
      try {
        const result = await reviewApi.getProductReviewStats(productId)
        this.productReviewStats = result.data || result
        return result
      } catch (e) {
        console.error('Failed to fetch product review stats:', e)
        throw e
      }
    },

    async createReview(data) {
      try {
        this.submitting = true
        const result = await reviewApi.createReview(data)
        return result
      } catch (e) {
        console.error('Failed to create review:', e)
        throw e
      } finally {
        this.submitting = false
      }
    },

    async fetchMyReviews(params = {}) {
      try {
        const result = await reviewApi.getMyReviews(params)
        this.myReviews = result.data || result || []
        return result
      } catch (e) {
        console.error('Failed to fetch my reviews:', e)
        throw e
      }
    },

    async refreshProductReviews(productId) {
      await Promise.all([
        this.fetchProductReviews(productId),
        this.fetchProductReviewStats(productId),
      ])
    },

    clearProductReviews() {
      this.productReviews = []
      this.productReviewStats = null
    },
  },
})