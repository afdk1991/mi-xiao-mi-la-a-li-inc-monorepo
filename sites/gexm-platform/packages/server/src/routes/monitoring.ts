import express from 'express'
import monitoringService from '../services/monitoring'
import { authMiddleware, verifyAdmin } from '../middleware/auth'

const router = express.Router()

// 所有监控路由都需要管理员认证
router.use(authMiddleware, verifyAdmin)

router.get('/alerts', (req, res) => {
  const { severity, acknowledged } = req.query
  const filter: Record<string, unknown> = {}

  if (severity) {
    filter.severity = severity
  }

  if (acknowledged !== undefined) {
    filter.acknowledged = acknowledged === 'true'
  }

  const alerts = monitoringService.getAlerts(filter)
  res.json({
    code: 0,
    message: 'success',
    data: alerts,
  })
})

router.put('/alerts/:id/acknowledge', (req, res) => {
  const { id } = req.params
  const success = monitoringService.acknowledgeAlert(id)

  if (success) {
    res.json({
      code: 0,
      message: '告警已确认',
    })
  } else {
    res.status(404).json({
      code: 1004,
      message: '告警不存在',
    })
  }
})

router.put('/alerts/acknowledge-all', (req, res) => {
  const count = monitoringService.acknowledgeAllAlerts()
  res.json({
    code: 0,
    message: '所有告警已确认',
    data: { count },
  })
})

router.get('/alert-rules', (req, res) => {
  const rules = monitoringService.getAlertRules()
  res.json({
    code: 0,
    message: 'success',
    data: rules,
  })
})

router.put('/alert-rules/:id', (req, res) => {
  const { id } = req.params
  const updates = req.body

  const success = monitoringService.updateAlertRule(id, updates)

  if (success) {
    res.json({
      code: 0,
      message: '规则已更新',
    })
  } else {
    res.status(404).json({
      code: 1004,
      message: '规则不存在',
    })
  }
})

router.delete('/alert-rules/:id', (req, res) => {
  const { id } = req.params
  const success = monitoringService.deleteAlertRule(id)

  if (success) {
    res.json({
      code: 0,
      message: '规则已删除',
    })
  } else {
    res.status(404).json({
      code: 1004,
      message: '规则不存在',
    })
  }
})

router.post('/alert-rules', (req, res) => {
  const rule = req.body
  const newRule = monitoringService.addAlertRule(rule)

  res.json({
    code: 0,
    message: '规则已添加',
    data: newRule,
  })
})

router.post('/alerts/manual', (req, res) => {
  const { message, severity, details } = req.body
  const alert = monitoringService.triggerManualAlert(message, severity, details)

  res.json({
    code: 0,
    message: '手动告警已触发',
    data: alert,
  })
})

export default router
