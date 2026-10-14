import type { Request, Response } from 'express'
import { getDb } from '../models'
import paymentModel from '../models/paymentModel'
import { generateId, successResponse, errorResponse } from '../utils/response'

interface Order {
  id: string
  order_no: string
  pay_amount: number
  pay_time: string
  pay_method: string
  status: string
}

interface Payment {
  id: string
  payment_no: string
  order_id: string
  amount: number
  pay_method: string
  paid_at: string
  third_party_no: string
}

interface DiffRecord {
  type: 'order_without_payment' | 'amount_mismatch' | 'payment_without_order'
  orderId?: string
  orderNo?: string
  paymentId?: string
  paymentNo?: string
  orderAmount: number
  paymentAmount: number
  diffAmount: number
  description: string
}

const reconciliationController = {
  async getReconciliation(req: Request, res: Response): Promise<Response> {
    try {
      const { date } = req.query

      if (!date) {
        return errorResponse(res, '请指定对账日期', 1001, 400)
      }

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(String(date))) {
        return errorResponse(res, '日期格式不正确，应为 YYYY-MM-DD', 1001, 400)
      }

      const startOfDay = `${date} 00:00:00`
      const endOfDay = `${date} 23:59:59`

      const db = getDb()

      const paidOrders = db
        .prepare(
          `
        SELECT * FROM orders
        WHERE status IN ('paid', 'shipped', 'completed')
          AND pay_time >= ?
          AND pay_time <= ?
        ORDER BY pay_time ASC
        `
        )
        .all(startOfDay, endOfDay) as Order[]

      const successPayments = paymentModel.getSuccessPaymentsByDate(String(date)) as Payment[]

      const orderMap = new Map<string, Order>()
      for (const order of paidOrders) {
        orderMap.set(order.id, order)
      }

      const paymentMap = new Map<string, Payment>()
      for (const payment of successPayments) {
        paymentMap.set(payment.order_id, payment)
      }

      const diffs: DiffRecord[] = []

      for (const order of paidOrders) {
        const payment = paymentMap.get(order.id)
        if (!payment) {
          diffs.push({
            type: 'order_without_payment',
            orderId: order.id,
            orderNo: order.order_no,
            orderAmount: order.pay_amount,
            paymentAmount: 0,
            diffAmount: order.pay_amount,
            description: '订单已支付但无对应支付记录',
          })
        } else if (Math.abs(order.pay_amount - payment.amount) > 0.01) {
          diffs.push({
            type: 'amount_mismatch',
            orderId: order.id,
            orderNo: order.order_no,
            paymentId: payment.id,
            paymentNo: payment.payment_no,
            orderAmount: order.pay_amount,
            paymentAmount: payment.amount,
            diffAmount: parseFloat((order.pay_amount - payment.amount).toFixed(2)),
            description: '订单金额与支付记录金额不一致',
          })
        }
      }

      for (const payment of successPayments) {
        if (!orderMap.has(payment.order_id)) {
          diffs.push({
            type: 'payment_without_order',
            orderId: payment.order_id,
            paymentId: payment.id,
            paymentNo: payment.payment_no,
            orderAmount: 0,
            paymentAmount: payment.amount,
            diffAmount: -payment.amount,
            description: '有支付记录但无对应订单',
          })
        }
      }

      const orderTotalAmount = paidOrders.reduce((sum, o) => sum + o.pay_amount, 0)
      const paymentTotalAmount = successPayments.reduce((sum, p) => sum + p.amount, 0)
      const diffAmount = parseFloat((orderTotalAmount - paymentTotalAmount).toFixed(2))

      const result = {
        date,
        orderCount: paidOrders.length,
        paymentCount: successPayments.length,
        orderTotalAmount: parseFloat(orderTotalAmount.toFixed(2)),
        paymentTotalAmount: parseFloat(paymentTotalAmount.toFixed(2)),
        diffAmount,
        diffCount: diffs.length,
        diffs,
        orders: paidOrders.map((o) => ({
          id: o.id,
          orderNo: o.order_no,
          payAmount: o.pay_amount,
          payTime: o.pay_time,
          payMethod: o.pay_method,
          status: o.status,
        })),
        payments: successPayments.map((p) => ({
          id: p.id,
          paymentNo: p.payment_no,
          orderId: p.order_id,
          amount: p.amount,
          payMethod: p.pay_method,
          paidAt: p.paid_at,
          thirdPartyNo: p.third_party_no,
        })),
      }

      const reconRecord = db
        .prepare('SELECT * FROM reconciliation_records WHERE recon_date = ?')
        .get(date)
      if (reconRecord) {
        db.prepare(
          `
          UPDATE reconciliation_records
          SET order_count = ?, payment_count = ?, order_total_amount = ?,
              payment_total_amount = ?, diff_amount = ?, diff_count = ?,
              details = ?, status = ?, updated_at = ?
          WHERE recon_date = ?
          `
        ).run(
          paidOrders.length,
          successPayments.length,
          orderTotalAmount,
          paymentTotalAmount,
          diffAmount,
          diffs.length,
          JSON.stringify(diffs),
          diffs.length === 0 ? 'matched' : 'mismatch',
          new Date().toISOString(),
          date
        )
      } else {
        db.prepare(
          `
          INSERT INTO reconciliation_records
          (id, recon_date, order_count, payment_count, order_total_amount,
           payment_total_amount, diff_amount, diff_count, details, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `
        ).run(
          generateId(),
          date,
          paidOrders.length,
          successPayments.length,
          orderTotalAmount,
          paymentTotalAmount,
          diffAmount,
          diffs.length,
          JSON.stringify(diffs),
          diffs.length === 0 ? 'matched' : 'mismatch',
          new Date().toISOString(),
          new Date().toISOString()
        )
      }

      return successResponse(res, result, '对账完成')
    } catch (error) {
      return errorResponse(res, (error as Error).message || '对账失败', 1001, 400)
    }
  },

  async getReconciliationHistory(req: Request, res: Response): Promise<Response> {
    try {
      const { page = 1, pageSize = 20, status, startDate, endDate } = req.query
      const statusStr = String(status)
      const startDateStr = String(startDate)
      const endDateStr = String(endDate)

      const db = getDb()
      const offset = (parseInt(String(page), 10) - 1) * parseInt(String(pageSize), 10)

      let whereClause = 'WHERE 1=1'
      const params: (string | number)[] = []

      if (statusStr) {
        whereClause += ' AND status = ?'
        params.push(statusStr)
      }
      if (startDateStr) {
        whereClause += ' AND recon_date >= ?'
        params.push(startDateStr)
      }
      if (endDateStr) {
        whereClause += ' AND recon_date <= ?'
        params.push(endDateStr)
      }

      const total = db
        .prepare(`SELECT COUNT(*) as count FROM reconciliation_records ${whereClause}`)
        .get(...params).count

      const records = db
        .prepare(
          `
          SELECT * FROM reconciliation_records
          ${whereClause}
          ORDER BY recon_date DESC
          LIMIT ? OFFSET ?
        `
        )
        .all(...params, parseInt(String(pageSize), 10), offset)

      return successResponse(
        res,
        {
          list: records,
          total,
          page: parseInt(String(page), 10),
          pageSize: parseInt(String(pageSize), 10),
          totalPages: Math.ceil(total / parseInt(String(pageSize), 10)) || 0,
        },
        '获取成功'
      )
    } catch (error) {
      return errorResponse(res, (error as Error).message || '获取对账历史失败', 1001, 400)
    }
  },
}

export default reconciliationController
