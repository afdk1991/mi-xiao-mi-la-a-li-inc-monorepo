import { getDb } from '../models'
import { generateId } from '../utils/response'

type PaymentMethod = 'wechat' | 'alipay' | 'balance' | 'mock'
type PaymentStatus = 'pending' | 'success' | 'failed' | 'cancelled' | 'refunded'

const PAYMENT_METHODS: PaymentMethod[] = ['wechat', 'alipay', 'balance', 'mock']
const PAYMENT_STATUSES: PaymentStatus[] = ['pending', 'success', 'failed', 'cancelled', 'refunded']

interface Payment {
  id: string
  order_id: string
  user_id: string
  payment_no: string
  pay_method: PaymentMethod
  amount: number
  status: PaymentStatus
  third_party_no?: string | null
  paid_at?: string | null
  refunded_at?: string | null
  closed_at?: string | null
  failure_reason?: string | null
  callback_data?: string | null
  created_at: string
  updated_at: string
}

interface CreatePaymentData {
  order_id: string
  user_id: string
  pay_method: PaymentMethod
  amount: number
}

interface UpdateStatusData {
  third_party_no?: string
  paid_at?: string
  refunded_at?: string
  closed_at?: string
  failure_reason?: string
  callback_data?: string | Record<string, unknown>
}

interface UpdatePaymentData {
  amount?: number
  failure_reason?: string
  callback_data?: string | Record<string, unknown>
}

interface FindByUserIdOptions {
  page?: number
  pageSize?: number
  status?: string
  payMethod?: string
}

interface FindAllOptions {
  page?: number
  pageSize?: number
  status?: string
  payMethod?: string
  userId?: string
  orderId?: string
  startTime?: string
  endTime?: string
}

interface PaymentStatistics {
  totalCount: number
  totalAmount: number
  pendingCount: number
  successCount: number
  failedCount: number
  refundedCount: number
}

function generatePaymentNo(): string {
  const now = new Date()
  const timestamp =
    now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0') +
    now.getHours().toString().padStart(2, '0') +
    now.getMinutes().toString().padStart(2, '0') +
    now.getSeconds().toString().padStart(2, '0')
  const random = Math.floor(100000 + Math.random() * 900000).toString()
  return 'PAY' + timestamp + random
}

const paymentModel = {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,

  findById(id: string): Payment | null {
    const db = getDb()
    const result = db.prepare('SELECT * FROM payments WHERE id = ?').get(id) as Payment | undefined
    return result || null
  },

  findByPaymentNo(paymentNo: string): Payment | null {
    const db = getDb()
    const result = db.prepare('SELECT * FROM payments WHERE payment_no = ?').get(paymentNo) as
      Payment | undefined
    return result || null
  },

  findByOrderId(orderId: string): Payment[] {
    const db = getDb()
    return db
      .prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC')
      .all(orderId) as Payment[]
  },

  findLatestByOrderId(orderId: string): Payment | null {
    const db = getDb()
    const result = db
      .prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1')
      .get(orderId) as Payment | undefined
    return result || null
  },

  findByUserId(
    userId: string,
    options: FindByUserIdOptions = {}
  ): { payments: Payment[]; total: number } {
    const db = getDb()
    const { page = 1, pageSize = 20, status = '', payMethod = '' } = options
    const offset = (page - 1) * pageSize

    let whereClause = 'WHERE user_id = ?'
    const params: (string | number)[] = [userId]

    if (status) {
      whereClause += ' AND status = ?'
      params.push(status)
    }
    if (payMethod) {
      whereClause += ' AND pay_method = ?'
      params.push(payMethod)
    }

    const countResult = db
      .prepare(`SELECT COUNT(*) as count FROM payments ${whereClause}`)
      .get(...params) as { count: number }

    const payments = db
      .prepare(
        `
        SELECT * FROM payments
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `
      )
      .all(...params, pageSize, offset) as Payment[]

    return { payments, total: countResult.count }
  },

  findAll(options: FindAllOptions = {}): { payments: Payment[]; total: number } {
    const db = getDb()
    const {
      page = 1,
      pageSize = 20,
      status = '',
      payMethod = '',
      userId = '',
      orderId = '',
      startTime = '',
      endTime = '',
    } = options
    const offset = (page - 1) * pageSize

    let whereClause = 'WHERE 1=1'
    const params: (string | number)[] = []

    if (status) {
      whereClause += ' AND status = ?'
      params.push(status)
    }
    if (payMethod) {
      whereClause += ' AND pay_method = ?'
      params.push(payMethod)
    }
    if (userId) {
      whereClause += ' AND user_id = ?'
      params.push(userId)
    }
    if (orderId) {
      whereClause += ' AND order_id = ?'
      params.push(orderId)
    }
    if (startTime) {
      whereClause += ' AND created_at >= ?'
      params.push(startTime)
    }
    if (endTime) {
      whereClause += ' AND created_at <= ?'
      params.push(endTime)
    }

    const countResult = db
      .prepare(`SELECT COUNT(*) as count FROM payments ${whereClause}`)
      .get(...params) as { count: number }

    const payments = db
      .prepare(
        `
        SELECT * FROM payments
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `
      )
      .all(...params, pageSize, offset) as Payment[]

    return { payments, total: countResult.count }
  },

  create(paymentData: CreatePaymentData): Payment | null {
    const db = getDb()
    const now = new Date().toISOString()
    const id = generateId()
    const paymentNo = generatePaymentNo()

    db.prepare(
      `
      INSERT INTO payments (
        id, order_id, user_id, payment_no, pay_method, amount,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      id,
      paymentData.order_id,
      paymentData.user_id,
      paymentNo,
      paymentData.pay_method,
      paymentData.amount,
      'pending',
      now,
      now
    )

    return this.findById(id)
  },

  updateStatus(
    id: string,
    status: PaymentStatus,
    extraData: UpdateStatusData = {}
  ): Payment | null {
    const db = getDb()
    const now = new Date().toISOString()

    const fields: string[] = ['status = ?', 'updated_at = ?']
    const values: (string | number)[] = [status, now]

    if (extraData.third_party_no !== undefined) {
      fields.push('third_party_no = ?')
      values.push(extraData.third_party_no)
    }
    if (extraData.paid_at !== undefined) {
      fields.push('paid_at = ?')
      values.push(extraData.paid_at)
    }
    if (extraData.refunded_at !== undefined) {
      fields.push('refunded_at = ?')
      values.push(extraData.refunded_at)
    }
    if (extraData.closed_at !== undefined) {
      fields.push('closed_at = ?')
      values.push(extraData.closed_at)
    }
    if (extraData.failure_reason !== undefined) {
      fields.push('failure_reason = ?')
      values.push(extraData.failure_reason)
    }
    if (extraData.callback_data !== undefined) {
      fields.push('callback_data = ?')
      values.push(
        typeof extraData.callback_data === 'string'
          ? extraData.callback_data
          : JSON.stringify(extraData.callback_data)
      )
    }

    values.push(id)

    db.prepare(`UPDATE payments SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    return this.findById(id)
  },

  update(id: string, data: UpdatePaymentData): Payment | null {
    const db = getDb()
    const now = new Date().toISOString()

    const fields: string[] = []
    const values: (string | number)[] = []

    const allowedFields: (keyof UpdatePaymentData)[] = ['amount', 'failure_reason', 'callback_data']
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        let value = data[field]
        if (field === 'callback_data' && typeof value !== 'string') {
          value = JSON.stringify(value) as string
        }
        fields.push(`${field} = ?`)
        values.push(value as string | number)
      }
    }

    if (fields.length === 0) {
      return this.findById(id)
    }

    fields.push('updated_at = ?')
    values.push(now)
    values.push(id)

    db.prepare(`UPDATE payments SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    return this.findById(id)
  },

  delete(id: string): boolean {
    const db = getDb()
    const result = db.prepare('DELETE FROM payments WHERE id = ?').run(id)
    return result.changes > 0
  },

  getStatistics(startTime: string = '', endTime: string = ''): PaymentStatistics {
    const db = getDb()

    let whereClause = ''
    const params: string[] = []

    if (startTime) {
      whereClause = 'WHERE created_at >= ?'
      params.push(startTime)
    }
    if (endTime) {
      whereClause += (startTime ? ' AND' : 'WHERE') + ' created_at <= ?'
      params.push(endTime)
    }

    const totalCount = db
      .prepare(`SELECT COUNT(*) as count FROM payments ${whereClause}`)
      .get(...params) as { count: number }

    const totalAmount = db
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) as amount FROM payments WHERE status = 'success' ${whereClause ? 'AND ' + whereClause.slice(6) : ''}`
      )
      .get(...params) as { amount: number }

    const pendingCount = db
      .prepare(
        `SELECT COUNT(*) as count FROM payments WHERE status = 'pending' ${whereClause ? 'AND ' + whereClause.slice(6) : ''}`
      )
      .get(...params) as { count: number }

    const successCount = db
      .prepare(
        `SELECT COUNT(*) as count FROM payments WHERE status = 'success' ${whereClause ? 'AND ' + whereClause.slice(6) : ''}`
      )
      .get(...params) as { count: number }

    const failedCount = db
      .prepare(
        `SELECT COUNT(*) as count FROM payments WHERE status = 'failed' ${whereClause ? 'AND ' + whereClause.slice(6) : ''}`
      )
      .get(...params) as { count: number }

    const refundedCount = db
      .prepare(
        `SELECT COUNT(*) as count FROM payments WHERE status = 'refunded' ${whereClause ? 'AND ' + whereClause.slice(6) : ''}`
      )
      .get(...params) as { count: number }

    return {
      totalCount: totalCount.count,
      totalAmount: parseFloat(String(totalAmount.amount)),
      pendingCount: pendingCount.count,
      successCount: successCount.count,
      failedCount: failedCount.count,
      refundedCount: refundedCount.count,
    }
  },

  getSuccessPaymentsByDate(date: string): Payment[] {
    const db = getDb()
    const startOfDay = date + ' 00:00:00'
    const endOfDay = date + ' 23:59:59'

    return db
      .prepare(
        `
      SELECT * FROM payments
      WHERE status = 'success'
        AND paid_at >= ?
        AND paid_at <= ?
      ORDER BY paid_at ASC
      `
      )
      .all(startOfDay, endOfDay) as Payment[]
  },
}

export type { PaymentMethod }
export { PAYMENT_METHODS }

export default paymentModel
