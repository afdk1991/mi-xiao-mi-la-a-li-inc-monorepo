import express from 'express'
import { getMetrics, resetMetrics } from '../middleware/apm'
import authMiddleware from '../middleware/auth'
import { successResponse } from '../utils/response'

const router = express.Router()

router.get('/health', (req, res) => {
  const metrics = getMetrics()
  successResponse(
    res,
    {
      status: 'healthy',
      uptime: metrics.uptime,
      timestamp: metrics.timestamp,
      memory: metrics.memory,
    },
    '服务运行正常'
  )
})

router.get('/metrics', authMiddleware.verifyToken, authMiddleware.verifyAdmin, (req, res) => {
  const metrics = getMetrics()
  successResponse(res, metrics, '获取监控数据成功')
})

router.get(
  '/metrics/summary',
  authMiddleware.verifyToken,
  authMiddleware.verifyAdmin,
  (req, res) => {
    const metrics = getMetrics()
    const summary = {
      uptime: metrics.uptime,
      requests: {
        total: metrics.requests.total,
        byMethod: metrics.requests.byMethod,
        byStatus: metrics.requests.byStatus,
      },
      latency: {
        average: metrics.latency.average,
        p50: metrics.latency.p50,
        p90: metrics.latency.p90,
        p95: metrics.latency.p95,
        p99: metrics.latency.p99,
      },
      errors: {
        total: metrics.errors.total,
        rate: metrics.errors.rate,
      },
      memory: metrics.memory,
      slowRequests: metrics.slowRequests,
      timestamp: metrics.timestamp,
    }
    successResponse(res, summary, '获取监控摘要成功')
  }
)

router.get(
  '/metrics/endpoints',
  authMiddleware.verifyToken,
  authMiddleware.verifyAdmin,
  (req, res) => {
    const metrics = getMetrics()
    const endpoints = Object.entries(metrics.requests.byEndpoint)
      .map(([path, count]) => ({
        path,
        requestCount: count,
        latency: metrics.latency.byEndpoint[path] || null,
        errors: metrics.errors.byEndpoint[path] || 0,
      }))
      .sort((a, b) => b.requestCount - a.requestCount)

    successResponse(
      res,
      {
        endpoints,
        total: endpoints.length,
        timestamp: metrics.timestamp,
      },
      '获取端点统计成功'
    )
  }
)

router.get(
  '/metrics/errors',
  authMiddleware.verifyToken,
  authMiddleware.verifyAdmin,
  (req, res) => {
    const metrics = getMetrics()
    successResponse(
      res,
      {
        total: metrics.errors.total,
        rate: metrics.errors.rate,
        byCode: metrics.errors.byCode,
        byEndpoint: metrics.errors.byEndpoint,
        recent: metrics.errors.recent.slice(-20),
        timestamp: metrics.timestamp,
      },
      '获取错误统计成功'
    )
  }
)

router.post(
  '/metrics/reset',
  authMiddleware.verifyToken,
  authMiddleware.verifyAdmin,
  (req, res) => {
    resetMetrics()
    successResponse(res, null, '监控数据已重置')
  }
)

export default router
