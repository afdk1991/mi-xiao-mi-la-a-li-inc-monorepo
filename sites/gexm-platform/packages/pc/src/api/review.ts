import { http } from './request'

export interface Review {
  id: string
  userId: string
  orderId: string
  productId: string
  skuId?: string
  rating: number
  content: string
  images: string[]
  status: string
  reply?: string
  createdAt: string
  updatedAt: string
}

export interface ReviewQuery {
  page?: number
  pageSize?: number
  productId?: string
  userId?: string
  status?: string
  rating?: string
  keyword?: string
}

export const reviewApi = {
  getReviews(query?: ReviewQuery): Promise<{ list: Review[]; total: number }> {
    return http.get('/admin/reviews', query)
  },

  getReviewDetail(id: string): Promise<Review> {
    return http.get(`/admin/reviews/${id}`)
  },

  deleteReview(id: string): Promise<void> {
    return http.delete(`/admin/reviews/${id}`)
  },

  replyReview(id: string, data: { reply: string }): Promise<Review> {
    return http.patch(`/admin/reviews/${id}/reply`, data)
  },

  updateReviewStatus(id: string, data: { status: string }): Promise<Review> {
    return http.patch(`/admin/reviews/${id}/status`, data)
  },

  batchDeleteReviews(ids: string[]): Promise<{ count: number }> {
    return http.post('/admin/reviews/batch/delete', { ids })
  },
}