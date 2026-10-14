// @ts-nocheck
import type { Request, Response } from 'express'
import reviewModel from '../models/reviewModel'
import { successResponse, errorResponse, paginate, getParamStr } from '../utils/response'
import logger from '../utils/logger'

type ReviewStatus = 'active' | 'hidden' | 'deleted'

interface GetProductReviewsOptions {
  page: number
  pageSize: number
  filter: 'all' | 'good' | 'neutral' | 'bad' | 'with_images'
}

interface GetUserReviewsOptions {
  page: number
  pageSize: number
}

interface FindAllOptions {
  page: number
  pageSize: number
  productId?: string
  userId?: string
  status?: string
  rating?: string
  keyword?: string
}

interface ReviewCreateData {
  user_id: string
  order_id: string
  product_id: string
  sku_id?: string
  rating: number
  content: string
  images: string[]
}

const reviewController = {
  async getProductReviews(req: Request, res: Response): Promise<Response> {
    const id = getParamStr(req.params.id)
    const { page = 1, pageSize = 10, filter = 'all' } = req.query

    const { reviews, total } = reviewModel.getProductReviews(id, {
      page: parseInt(String(page), 10),
      pageSize: parseInt(String(pageSize), 10),
      filter,
    } as GetProductReviewsOptions)

    return successResponse(
      res,
      paginate(reviews, total, parseInt(String(page), 10), parseInt(String(pageSize), 10)),
      '获取成功'
    )
  },

  async getProductReviewStats(req: Request, res: Response): Promise<Response> {
    const id = getParamStr(req.params.id)
    const stats = reviewModel.getProductReviewStats(id)
    return successResponse(res, stats, '获取成功')
  },

  async createReview(req: Request, res: Response): Promise<Response> {
    const { orderId, productId, skuId, rating, content, images } = req.body
    const userId = (req as Request & { user?: { id: string } }).user?.id || ''

    if (!orderId || !productId || !rating || !content) {
      return errorResponse(res, '订单ID、商品ID、评分和评价内容不能为空', 1001, 400)
    }

    const ratingNum = parseInt(String(rating), 10)
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return errorResponse(res, '评分必须在1-5之间', 1001, 400)
    }

    if (reviewModel.hasUserReviewedOrder(userId, orderId, productId)) {
      return errorResponse(res, '您已对该商品进行过评价', 1001, 400)
    }

    const review = reviewModel.create({
      user_id: userId,
      order_id: orderId,
      product_id: productId,
      sku_id: skuId,
      rating: ratingNum,
      content,
      images: images || [],
    } as ReviewCreateData)

    logger.info('Review created: %s', review.id, { userId, productId })

    return successResponse(res, review, '评价成功', 0, 201)
  },

  async getMyReviews(req: Request, res: Response): Promise<Response> {
    const { page = 1, pageSize = 10 } = req.query
    const userId = (req as Request & { user?: { id: string } }).user?.id || ''

    const { reviews, total } = reviewModel.getUserReviews(userId, {
      page: parseInt(String(page), 10),
      pageSize: parseInt(String(pageSize), 10),
    } as GetUserReviewsOptions)

    return successResponse(
      res,
      paginate(reviews, total, parseInt(String(page), 10), parseInt(String(pageSize), 10)),
      '获取成功'
    )
  },

  async getAllReviews(req: Request, res: Response): Promise<Response> {
    const { page = 1, pageSize = 20, productId, userId, status, rating, keyword } = req.query

    const { reviews, total } = reviewModel.findAll({
      page: parseInt(String(page), 10),
      pageSize: parseInt(String(pageSize), 10),
      productId,
      userId,
      status,
      rating,
      keyword,
    } as FindAllOptions)

    return successResponse(
      res,
      paginate(reviews, total, parseInt(String(page), 10), parseInt(String(pageSize), 10)),
      '获取成功'
    )
  },

  async getReviewDetail(req: Request, res: Response): Promise<Response> {
    const id = getParamStr(req.params.id)
    const review = reviewModel.findById(id)

    if (!review) {
      return errorResponse(res, '评论不存在', 1004, 404)
    }

    if (review.images) {
      review.images = JSON.parse(String(review.images))
    }

    return successResponse(res, review, '获取成功')
  },

  async deleteReview(req: Request, res: Response): Promise<Response> {
    const id = getParamStr(req.params.id)

    const review = reviewModel.findById(id)
    if (!review) {
      return errorResponse(res, '评论不存在', 1004, 404)
    }

    reviewModel.delete(id)

    return successResponse(res, null, '删除成功')
  },

  async replyReview(req: Request, res: Response): Promise<Response> {
    const id = getParamStr(req.params.id)
    const { reply } = req.body

    if (!reply || !reply.trim()) {
      return errorResponse(res, '回复内容不能为空', 1001, 400)
    }

    const review = reviewModel.findById(id)
    if (!review) {
      return errorResponse(res, '评论不存在', 1004, 404)
    }

    const updatedReview = reviewModel.addSellerReply(id, reply.trim())

    return successResponse(res, updatedReview, '回复成功')
  },

  async updateReviewStatus(req: Request, res: Response): Promise<Response> {
    const id = getParamStr(req.params.id)
    const { status } = req.body

    const validStatuses: ReviewStatus[] = ['active', 'hidden', 'deleted']
    if (!validStatuses.includes(status as ReviewStatus)) {
      return errorResponse(res, '无效的状态值', 1001, 400)
    }

    const review = reviewModel.findById(id)
    if (!review) {
      return errorResponse(res, '评论不存在', 1004, 404)
    }

    const updatedReview = reviewModel.updateStatus(id, status)

    return successResponse(res, updatedReview, '更新成功')
  },

  async batchDeleteReviews(req: Request, res: Response): Promise<Response> {
    const { ids } = req.body

    if (!Array.isArray(ids) || ids.length === 0) {
      return errorResponse(res, '请选择要删除的评论', 1001, 400)
    }

    const count = reviewModel.batchDelete(ids)

    return successResponse(res, { count }, '批量删除成功')
  },
}

export default reviewController
