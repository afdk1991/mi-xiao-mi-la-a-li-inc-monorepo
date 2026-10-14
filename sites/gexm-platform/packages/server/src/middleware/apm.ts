import logger from '../utils/logger'
import type { Request, Response, NextFunction } from 'express'
import { getCurrentTraceId } from '../utils/tracing'

interface MemorySample {
  timestamp: number
  rss: number
  heapUsed: number
  heapTotal: number
  external: number
}

interface EndpointLatencyStats {
  total: number
  count: number
  max: number
  min: number
}

interface ErrorEntry {
  timestamp: number
  method: string
  path: string
  statusCode: number
  latency: number
  userAgent?: string
}

interface SlowRequestEntry {
  timestamp: number
  method: string
  path: string
  latency: number
  statusCode: number
}

interface Metrics {
  requests: {
    total: number
    byStatus: Record<number, number>
    byMethod: Record<string, number>
    byEndpoint: Record<string, number>
  }
  latency: {
    total: number
    count: number
    max: number
    min: number
    byEndpoint: Record<string, EndpointLatencyStats>
    values: number[]
  }
  errors: {
    total: number
    byCode: Record<number, number>
    byEndpoint: Record<string, number>
    recent: ErrorEntry[]
  }
  uptime: number
  memoryUsage: {
    samples: MemorySample[]
  }
  slowRequests: SlowRequestEntry[]
}

const metrics: Metrics = {
  requests: {
    total: 0,
    byStatus: {},
    byMethod: {},
    byEndpoint: {},
  },
  latency: {
    total: 0,
    count: 0,
    max: 0,
    min: Infinity,
    byEndpoint: {},
    values: [],
  },
  errors: {
    total: 0,
    byCode: {},
    byEndpoint: {},
    recent: [],
  },
  uptime: Date.now(),
  memoryUsage: {
    samples: [],
  },
  slowRequests: [],
}

const MAX_RECENT_ERRORS = 50
const MAX_MEMORY_SAMPLES = 60
const MAX_LATENCY_SAMPLES = 1000
const METRICS_LOG_INTERVAL = 300000
const SLOW_REQUEST_THRESHOLD = 3000

function recordMemoryUsage(): void {
  const usage = process.memoryUsage()
  metrics.memoryUsage.samples.push({
    timestamp: Date.now(),
    rss: usage.rss,
    heapUsed: usage.heapUsed,
    heapTotal: usage.heapTotal,
    external: usage.external,
  })

  if (metrics.memoryUsage.samples.length > MAX_MEMORY_SAMPLES) {
    metrics.memoryUsage.samples.shift()
  }
}

function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) {
    return 0
  }
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.ceil((percentile / 100) * sorted.length) - 1
  return sorted[Math.max(0, index)]
}

function logMetrics(): void {
  const avgLatency =
    metrics.latency.count > 0 ? Math.round(metrics.latency.total / metrics.latency.count) : 0

  const p50 = calculatePercentile(metrics.latency.values, 50)
  const p90 = calculatePercentile(metrics.latency.values, 90)
  const p95 = calculatePercentile(metrics.latency.values, 95)
  const p99 = calculatePercentile(metrics.latency.values, 99)

  const errorRate =
    metrics.requests.total > 0
      ? ((metrics.errors.total / metrics.requests.total) * 100).toFixed(2)
      : 0

  const avgMemory =
    metrics.memoryUsage.samples.length > 0
      ? Math.round(
          metrics.memoryUsage.samples.reduce((sum, s) => sum + s.heapUsed, 0) /
            metrics.memoryUsage.samples.length /
            1024 /
            1024
        )
      : 0

  logger.info('APM Metrics Summary', {
    uptime: Math.round((Date.now() - metrics.uptime) / 1000 / 60) + 'm',
    requests: {
      total: metrics.requests.total,
      byMethod: metrics.requests.byMethod,
    },
    latency: {
      average: avgLatency + 'ms',
      max: metrics.latency.max + 'ms',
      min: metrics.latency.min === Infinity ? 'N/A' : metrics.latency.min + 'ms',
      p50: p50 + 'ms',
      p90: p90 + 'ms',
      p95: p95 + 'ms',
      p99: p99 + 'ms',
    },
    errors: {
      total: metrics.errors.total,
      rate: errorRate + '%',
    },
    memory: {
      average: avgMemory + 'MB',
      current: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
    },
  })

  if (metrics.slowRequests.length > 0) {
    logger.warn('Slow requests detected', {
      count: metrics.slowRequests.length,
      threshold: SLOW_REQUEST_THRESHOLD + 'ms',
      slowest: metrics.slowRequests.slice(0, 5),
    })
    metrics.slowRequests = []
  }
}

setInterval(recordMemoryUsage, 5000)
setInterval(logMetrics, METRICS_LOG_INTERVAL)

export function apmMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now()
  const { method, path } = req

  metrics.requests.total++
  metrics.requests.byMethod[method] = (metrics.requests.byMethod[method] || 0) + 1
  metrics.requests.byEndpoint[path] = (metrics.requests.byEndpoint[path] || 0) + 1

  const originalSend = res.send
  const originalJson = res.json

  res.send = function (this: Response, body: unknown) {
    recordMetrics(startTime, this.statusCode, path, method)
    return originalSend.call(this, body)
  }

  res.json = function (this: Response, body: unknown) {
    recordMetrics(startTime, this.statusCode, path, method)
    return originalJson.call(this, body)
  }

  res.on('finish', () => {
    const statusCode = res.statusCode
    const traceId = getCurrentTraceId()
    if (traceId) {
      res.setHeader('X-Trace-Id', traceId)
    }
    metrics.requests.byStatus[statusCode] = (metrics.requests.byStatus[statusCode] || 0) + 1

    if (statusCode >= 400) {
      metrics.errors.total++
      metrics.errors.byCode[statusCode] = (metrics.errors.byCode[statusCode] || 0) + 1
      metrics.errors.byEndpoint[path] = (metrics.errors.byEndpoint[path] || 0) + 1

      const errorEntry: ErrorEntry = {
        timestamp: Date.now(),
        method,
        path,
        statusCode,
        latency: Date.now() - startTime,
        userAgent: req.get('User-Agent'),
      }

      metrics.errors.recent.push(errorEntry)
      if (metrics.errors.recent.length > MAX_RECENT_ERRORS) {
        metrics.errors.recent.shift()
      }

      if (statusCode >= 500) {
        logger.warn('Server error detected', { ...errorEntry, traceId })
      }
    }
  })

  next()
}

function recordMetrics(startTime: number, statusCode: number, path: string, method: string): void {
  const latency = Date.now() - startTime

  metrics.latency.total += latency
  metrics.latency.count++
  metrics.latency.max = Math.max(metrics.latency.max, latency)
  metrics.latency.min = Math.min(metrics.latency.min, latency)

  metrics.latency.values.push(latency)
  if (metrics.latency.values.length > MAX_LATENCY_SAMPLES) {
    metrics.latency.values.shift()
  }

  if (!metrics.latency.byEndpoint[path]) {
    metrics.latency.byEndpoint[path] = { total: 0, count: 0, max: 0, min: Infinity }
  }

  const endpointStats = metrics.latency.byEndpoint[path]
  endpointStats.total += latency
  endpointStats.count++
  endpointStats.max = Math.max(endpointStats.max, latency)
  endpointStats.min = Math.min(endpointStats.min, latency)

  if (latency > SLOW_REQUEST_THRESHOLD) {
    metrics.slowRequests.push({
      timestamp: Date.now(),
      method,
      path,
      latency,
      statusCode,
    })
  }
}

export interface MetricsSummary {
  uptime: number
  requests: {
    total: number
    byMethod: Record<string, number>
    byStatus: Record<number, number>
    byEndpoint: Record<string, number>
  }
  latency: {
    average: number
    max: number
    min: number
    p50: number
    p90: number
    p95: number
    p99: number
    byEndpoint: Record<string, { average: number; max: number; min: number; count: number }>
  }
  errors: {
    total: number
    rate: number
    byCode: Record<number, number>
    byEndpoint: Record<string, number>
    recent: ErrorEntry[]
  }
  memory: {
    average: number
    current: number
    peak: number
  }
  slowRequests: {
    threshold: number
    count: number
    recent: SlowRequestEntry[]
  }
  timestamp: number
}

export function getMetrics(): MetricsSummary {
  const avgLatency =
    metrics.latency.count > 0 ? Math.round(metrics.latency.total / metrics.latency.count) : 0

  const p50 = calculatePercentile(metrics.latency.values, 50)
  const p90 = calculatePercentile(metrics.latency.values, 90)
  const p95 = calculatePercentile(metrics.latency.values, 95)
  const p99 = calculatePercentile(metrics.latency.values, 99)

  const errorRate =
    metrics.requests.total > 0
      ? ((metrics.errors.total / metrics.requests.total) * 100).toFixed(2)
      : '0.00'

  const avgMemory =
    metrics.memoryUsage.samples.length > 0
      ? Math.round(
          metrics.memoryUsage.samples.reduce((sum, s) => sum + s.heapUsed, 0) /
            metrics.memoryUsage.samples.length /
            1024 /
            1024
        )
      : 0

  return {
    uptime: Math.round((Date.now() - metrics.uptime) / 1000),
    requests: {
      total: metrics.requests.total,
      byMethod: { ...metrics.requests.byMethod },
      byStatus: { ...metrics.requests.byStatus },
      byEndpoint: { ...metrics.requests.byEndpoint },
    },
    latency: {
      average: avgLatency,
      max: metrics.latency.max,
      min: metrics.latency.min === Infinity ? 0 : metrics.latency.min,
      p50,
      p90,
      p95,
      p99,
      byEndpoint: Object.fromEntries(
        Object.entries(metrics.latency.byEndpoint).map(([path, stats]) => [
          path,
          {
            average: stats.count > 0 ? Math.round(stats.total / stats.count) : 0,
            max: stats.max,
            min: stats.min === Infinity ? 0 : stats.min,
            count: stats.count,
          },
        ])
      ),
    },
    errors: {
      total: metrics.errors.total,
      rate: parseFloat(errorRate),
      byCode: { ...metrics.errors.byCode },
      byEndpoint: { ...metrics.errors.byEndpoint },
      recent: [...metrics.errors.recent],
    },
    memory: {
      average: avgMemory,
      current: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      peak: Math.round(
        (metrics.memoryUsage.samples.length > 0
          ? Math.max(...metrics.memoryUsage.samples.map((s) => s.heapUsed))
          : process.memoryUsage().heapUsed) /
          1024 /
          1024
      ),
    },
    slowRequests: {
      threshold: SLOW_REQUEST_THRESHOLD,
      count: metrics.slowRequests.length,
      recent: metrics.slowRequests.slice(-10),
    },
    timestamp: Date.now(),
  }
}

export function resetMetrics(): void {
  metrics.requests = {
    total: 0,
    byStatus: {},
    byMethod: {},
    byEndpoint: {},
  }
  metrics.latency = {
    total: 0,
    count: 0,
    max: 0,
    min: Infinity,
    byEndpoint: {},
    values: [],
  }
  metrics.errors = {
    total: 0,
    byCode: {},
    byEndpoint: {},
    recent: [],
  }
  metrics.uptime = Date.now()
  metrics.memoryUsage = { samples: [] }
  metrics.slowRequests = []
}

export { metrics }
