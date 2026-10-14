import logger from '../utils/logger'
import { getMetrics } from '../middleware/apm'

interface AlertRule {
  id: string
  name: string
  type: 'error_rate' | 'latency' | 'memory' | 'uptime' | 'slow_request'
  threshold: number
  comparison: 'gt' | 'lt' | 'eq' | 'gte' | 'lte'
  windowMinutes: number
  alertIntervalMinutes: number
  enabled: boolean
  lastAlertTime: number
}

interface Alert {
  id: string
  ruleId: string
  ruleName: string
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  details: Record<string, unknown>
  timestamp: number
  acknowledged: boolean
}

const alertRules: AlertRule[] = [
  {
    id: 'error-rate-high',
    name: '高错误率告警',
    type: 'error_rate',
    threshold: 5,
    comparison: 'gt',
    windowMinutes: 5,
    alertIntervalMinutes: 10,
    enabled: true,
    lastAlertTime: 0,
  },
  {
    id: 'error-rate-critical',
    name: '严重错误率告警',
    type: 'error_rate',
    threshold: 10,
    comparison: 'gt',
    windowMinutes: 5,
    alertIntervalMinutes: 5,
    enabled: true,
    lastAlertTime: 0,
  },
  {
    id: 'latency-high',
    name: '高延迟告警',
    type: 'latency',
    threshold: 1000,
    comparison: 'gt',
    windowMinutes: 5,
    alertIntervalMinutes: 10,
    enabled: true,
    lastAlertTime: 0,
  },
  {
    id: 'latency-critical',
    name: '严重延迟告警',
    type: 'latency',
    threshold: 3000,
    comparison: 'gt',
    windowMinutes: 5,
    alertIntervalMinutes: 5,
    enabled: true,
    lastAlertTime: 0,
  },
  {
    id: 'memory-high',
    name: '内存使用率高',
    type: 'memory',
    threshold: 512,
    comparison: 'gt',
    windowMinutes: 5,
    alertIntervalMinutes: 15,
    enabled: true,
    lastAlertTime: 0,
  },
  {
    id: 'memory-critical',
    name: '内存严重不足',
    type: 'memory',
    threshold: 1024,
    comparison: 'gt',
    windowMinutes: 5,
    alertIntervalMinutes: 5,
    enabled: true,
    lastAlertTime: 0,
  },
  {
    id: 'slow-request',
    name: '慢请求告警',
    type: 'slow_request',
    threshold: 5,
    comparison: 'gte',
    windowMinutes: 1,
    alertIntervalMinutes: 5,
    enabled: true,
    lastAlertTime: 0,
  },
]

const alerts: Alert[] = []
const MAX_ALERTS = 100
const CHECK_INTERVAL = 60000

let alertInterval: ReturnType<typeof setInterval> | null = null
let isInitialized = false

function checkCondition(
  value: number,
  threshold: number,
  comparison: AlertRule['comparison']
): boolean {
  switch (comparison) {
    case 'gt':
      return value > threshold
    case 'lt':
      return value < threshold
    case 'eq':
      return value === threshold
    case 'gte':
      return value >= threshold
    case 'lte':
      return value <= threshold
    default:
      return false
  }
}

function getSeverity(type: AlertRule['type'], threshold: number): Alert['severity'] {
  switch (type) {
    case 'error_rate':
      return threshold >= 10 ? 'critical' : threshold >= 5 ? 'high' : 'medium'
    case 'latency':
      return threshold >= 3000 ? 'critical' : threshold >= 1000 ? 'high' : 'medium'
    case 'memory':
      return threshold >= 1024 ? 'critical' : threshold >= 512 ? 'high' : 'medium'
    case 'slow_request':
      return 'medium'
    case 'uptime':
      return 'critical'
    default:
      return 'low'
  }
}

function createAlert(rule: AlertRule, value: number, details: Record<string, unknown>): Alert {
  const alert: Alert = {
    id: `${rule.id}-${Date.now()}`,
    ruleId: rule.id,
    ruleName: rule.name,
    type: rule.type,
    severity: getSeverity(rule.type, rule.threshold),
    message: `${rule.name}: 当前值 ${value} 超过阈值 ${rule.threshold}`,
    details,
    timestamp: Date.now(),
    acknowledged: false,
  }

  alerts.unshift(alert)
  if (alerts.length > MAX_ALERTS) {
    alerts.pop()
  }

  return alert
}

function sendAlertNotification(alert: Alert): void {
  logger.error(alert.message, {
    id: alert.id,
    ruleId: alert.ruleId,
    ruleName: alert.ruleName,
    type: alert.type,
    severity: alert.severity,
    message: alert.message,
    details: alert.details,
    timestamp: alert.timestamp,
    acknowledged: alert.acknowledged,
  })
}

// Endpoints whose specific status codes are expected and should NOT count
// toward the error-rate alert. Raw APM metrics stay intact; this only
// adjusts the value used by the error_rate alert rule in checkAlerts().
const ERROR_RATE_EXCLUDE_PATTERNS: Array<{ pattern: string | RegExp; statusCodes: number[] }> = [
  { pattern: '/api/nonexistent', statusCodes: [404] }, // test probe
  { pattern: '/api/health', statusCodes: [200, 503] }, // health check
  { pattern: '/health', statusCodes: [200, 503] },
  { pattern: '/api/coupons/mine', statusCodes: [401] }, // expects auth
  { pattern: /\/api\/.*\/mine$/, statusCodes: [401] }, // any /mine endpoint when unauthenticated
]

function isExcludedError(path: string, statusCode: number): boolean {
  return ERROR_RATE_EXCLUDE_PATTERNS.some(({ pattern, statusCodes }) => {
    const matchesPath = typeof pattern === 'string' ? path === pattern : pattern.test(path)
    return matchesPath && statusCodes.includes(statusCode)
  })
}

function checkAlerts(): void {
  const metrics = getMetrics()
  const now = Date.now()

  for (const rule of alertRules) {
    if (!rule.enabled) {
      continue
    }

    if (now - rule.lastAlertTime < rule.alertIntervalMinutes * 60 * 1000) {
      continue
    }

    let currentValue: number

    switch (rule.type) {
      case 'error_rate': {
        // Filter out whitelisted endpoint+status combinations (test probes,
        // expected 401s on /mine endpoints, health checks) so they don't
        // inflate the error rate and trigger false alerts. Only the
        // numerator is adjusted; the request total (denominator) is kept
        // intact for throughput visibility. metrics.errors.recent is the
        // only structure carrying both path and statusCode, so it drives
        // the exclusion count.
        const totalErrors = metrics.errors.total
        const excludedErrors = metrics.errors.recent.reduce(
          (sum, entry) => sum + (isExcludedError(entry.path, entry.statusCode) ? 1 : 0),
          0
        )
        const adjustedErrors = Math.max(0, totalErrors - excludedErrors)
        currentValue =
          metrics.requests.total > 0 ? (adjustedErrors / metrics.requests.total) * 100 : 0
        break
      }
      case 'latency':
        currentValue = metrics.latency.p95
        break
      case 'memory':
        currentValue = metrics.memory.current
        break
      case 'slow_request':
        currentValue = metrics.slowRequests.count
        break
      case 'uptime':
        currentValue = metrics.uptime
        break
      default:
        continue
    }

    if (checkCondition(currentValue, rule.threshold, rule.comparison)) {
      const alert = createAlert(rule, currentValue, {
        metrics,
        threshold: rule.threshold,
        comparison: rule.comparison,
        windowMinutes: rule.windowMinutes,
      })

      sendAlertNotification(alert)
      rule.lastAlertTime = now
    }
  }
}

const monitoringService = {
  init(): void {
    if (isInitialized) {
      logger.warn('Monitoring already initialized')
      return
    }

    const env = process.env.NODE_ENV || 'development'
    if (env === 'test') {
      logger.info('Skipping monitoring initialization in test environment')
      return
    }

    alertInterval = setInterval(checkAlerts, CHECK_INTERVAL)
    isInitialized = true

    checkAlerts()

    logger.info('Monitoring service initialized')
  },

  shutdown(): void {
    if (alertInterval) {
      clearInterval(alertInterval)
      alertInterval = null
    }
    isInitialized = false
    logger.info('Monitoring service shutdown')
  },

  getAlerts(filter?: { severity?: Alert['severity']; acknowledged?: boolean }): Alert[] {
    let result = [...alerts]

    if (filter?.severity) {
      result = result.filter((a) => a.severity === filter.severity)
    }

    if (filter?.acknowledged !== undefined) {
      result = result.filter((a) => a.acknowledged === filter.acknowledged)
    }

    return result
  },

  acknowledgeAlert(alertId: string): boolean {
    const alert = alerts.find((a) => a.id === alertId)
    if (alert) {
      alert.acknowledged = true
      logger.info('Alert acknowledged', { alertId })
      return true
    }
    return false
  },

  acknowledgeAllAlerts(): number {
    const count = alerts.filter((a) => !a.acknowledged).length
    alerts.forEach((a) => {
      a.acknowledged = true
    })
    logger.info('All alerts acknowledged', { count })
    return count
  },

  getAlertRules(): AlertRule[] {
    return alertRules.map((rule) => ({ ...rule }))
  },

  updateAlertRule(
    ruleId: string,
    updates: Partial<
      Pick<
        AlertRule,
        'threshold' | 'comparison' | 'windowMinutes' | 'alertIntervalMinutes' | 'enabled'
      >
    >
  ): boolean {
    const rule = alertRules.find((r) => r.id === ruleId)
    if (rule) {
      Object.assign(rule, updates)
      logger.info('Alert rule updated', { ruleId, updates })
      return true
    }
    return false
  },

  deleteAlertRule(ruleId: string): boolean {
    const index = alertRules.findIndex((r) => r.id === ruleId)
    if (index !== -1) {
      alertRules.splice(index, 1)
      logger.info('Alert rule deleted', { ruleId })
      return true
    }
    return false
  },

  addAlertRule(rule: Omit<AlertRule, 'id' | 'lastAlertTime'>): AlertRule {
    const newRule: AlertRule = {
      ...rule,
      id: `custom-${Date.now()}`,
      lastAlertTime: 0,
    }
    alertRules.push(newRule)
    logger.info('Alert rule added', { ruleId: newRule.id })
    return newRule
  },

  triggerManualAlert(
    message: string,
    severity: Alert['severity'] = 'medium',
    details?: Record<string, unknown>
  ): Alert {
    const alert: Alert = {
      id: `manual-${Date.now()}`,
      ruleId: 'manual',
      ruleName: '手动告警',
      type: 'manual',
      severity,
      message,
      details: details || {},
      timestamp: Date.now(),
      acknowledged: false,
    }

    alerts.unshift(alert)
    if (alerts.length > MAX_ALERTS) {
      alerts.pop()
    }

    sendAlertNotification(alert)
    return alert
  },
}

export default monitoringService
