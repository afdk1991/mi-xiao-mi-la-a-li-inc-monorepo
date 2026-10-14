import { http } from './request'

export interface AuditLog {
  id: string
  adminId: string
  adminName?: string
  action: string
  resourceType: string
  resourceId?: string
  resourceName?: string
  beforeData?: string
  afterData?: string
  ip?: string
  userAgent?: string
  createdAt: string
}

export interface AuditQuery {
  page?: number
  pageSize?: number
  adminId?: string
  action?: string
  resourceType?: string
  startDate?: string
  endDate?: string
}

export interface AuditStats {
  totalCount: number
  actionDistribution: { action: string; count: number }[]
  resourceDistribution: { resourceType: string; count: number }[]
  dailyTrend: { date: string; count: number }[]
}

export const auditApi = {
  getLogs(query?: AuditQuery): Promise<{ list: AuditLog[]; total: number }> {
    return http.get('/admin/audit/logs', query)
  },

  getLogDetail(id: string): Promise<AuditLog> {
    return http.get(`/admin/audit/logs/${id}`)
  },

  getStats(query?: { startDate?: string; endDate?: string }): Promise<AuditStats> {
    return http.get('/admin/audit/stats', query)
  },
}