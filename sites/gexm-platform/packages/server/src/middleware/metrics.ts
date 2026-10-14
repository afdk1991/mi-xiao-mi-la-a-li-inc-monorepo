import { Request, Response, NextFunction } from 'express'

let requestCount = 0
let responseTimeSum = 0
let responseTimeCount = 0
const requestCountsByStatus: Record<string, number> = {}
const requestCountsByPath: Record<string, number> = {}

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - startTime
    const status = res.statusCode.toString()
    const path = `${req.method} ${req.path}`

    requestCount++
    responseTimeSum += duration
    responseTimeCount++

    requestCountsByStatus[status] = (requestCountsByStatus[status] || 0) + 1
    requestCountsByPath[path] = (requestCountsByPath[path] || 0) + 1
  })

  next()
}

export function metricsEndpoint(req: Request, res: Response) {
  let metrics = '# HELP http_requests_total Total number of HTTP requests\n'
  metrics += '# TYPE http_requests_total counter\n'
  metrics += `http_requests_total ${requestCount}\n\n`

  metrics += '# HELP http_requests_by_status HTTP requests by status code\n'
  metrics += '# TYPE http_requests_by_status counter\n'
  Object.entries(requestCountsByStatus).forEach(([status, count]) => {
    metrics += `http_requests_by_status{status="${status}"} ${count}\n`
  })
  metrics += '\n'

  metrics += '# HELP http_requests_by_path HTTP requests by path\n'
  metrics += '# TYPE http_requests_by_path counter\n'
  Object.entries(requestCountsByPath).forEach(([path, count]) => {
    const escapedPath = path.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    metrics += `http_requests_by_path{path="${escapedPath}"} ${count}\n`
  })
  metrics += '\n'

  const avgResponseTime = responseTimeCount > 0 ? responseTimeSum / responseTimeCount : 0
  metrics += '# HELP http_request_duration_seconds Average HTTP request duration\n'
  metrics += '# TYPE http_request_duration_seconds gauge\n'
  metrics += `http_request_duration_seconds ${avgResponseTime / 1000}\n\n`

  metrics += '# HELP nodejs_version Node.js version\n'
  metrics += '# TYPE nodejs_version gauge\n'
  metrics += `nodejs_version{version="${process.version}"} 1\n\n`

  const memoryUsage = process.memoryUsage()
  metrics += '# HELP nodejs_memory_usage_bytes Node.js memory usage\n'
  metrics += '# TYPE nodejs_memory_usage_bytes gauge\n'
  metrics += `nodejs_memory_usage_bytes{type="rss"} ${memoryUsage.rss}\n`
  metrics += `nodejs_memory_usage_bytes{type="heapUsed"} ${memoryUsage.heapUsed}\n`
  metrics += `nodejs_memory_usage_bytes{type="heapTotal"} ${memoryUsage.heapTotal}\n`
  metrics += `nodejs_memory_usage_bytes{type="external"} ${memoryUsage.external}\n\n`

  metrics += '# HELP gexm_service_up Service health status\n'
  metrics += '# TYPE gexm_service_up gauge\n'
  metrics += 'gexm_service_up 1\n'

  res.set('Content-Type', 'text/plain')
  res.send(metrics)
}
