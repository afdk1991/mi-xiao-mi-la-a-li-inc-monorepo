import { getDb } from '../models'

type Period = 'day' | 'week' | 'month'

interface DashboardOverview {
  today: {
    orderCount: number
    salesAmount: number
    userCount: number
  }
  week: {
    orderCount: number
    salesAmount: number
    avgOrderValue: number
    orderGrowth: number
    salesGrowth: number
  }
  month: {
    orderCount: number
    salesAmount: number
    avgOrderValue: number
    orderGrowth: number
    salesGrowth: number
  }
}

interface OrderTrendData {
  period: Period
  data: {
    date: string
    orderCount: number
    salesAmount: number
  }[]
}

interface ProductRankItem {
  productId: string
  productName: string
  productImage: string
  totalQuantity: number
  totalSales: number
  orderCount: number
}

interface UserTrendData {
  period: Period
  data: {
    date: string
    registerCount: number
  }[]
}

interface ConversionStats {
  visitConversion: number
  addCartConversion: number
  orderConversion: number
  payConversion: number
  metrics: {
    visitCount: number
    addCartCount: number
    addCartUserCount: number
    orderCount: number
    paidOrderCount: number
  }
}

interface PaymentStats {
  total: {
    orderCount: number
    totalAmount: number
  }
  data: {
    paymentMethod: string
    orderCount: number
    totalAmount: number
    orderPercentage: number
    amountPercentage: number
  }[]
}

interface RefundStats {
  refundOrderCount: number
  refundAmount: number
  refundRate: number
  refundAmountRate: number
  totalOrderCount: number
  totalSalesAmount: number
}

interface CouponStats {
  receivedCount: number
  usedCount: number
  usedRate: number
}

function toDateString(value: unknown): string | undefined {
  if (!value) {
    return undefined
  }
  if (typeof value === 'string') {
    return value
  }
  if (Array.isArray(value)) {
    return String(value[0])
  }
  return undefined
}

class StatisticsService {
  async getDashboardOverview(): Promise<DashboardOverview> {
    const db = getDb()
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()

    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const weekStartStr = new Date(
      weekStart.getFullYear(),
      weekStart.getMonth(),
      weekStart.getDate()
    ).toISOString()

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const lastWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    const lastWeekEnd = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const lastWeekStartStr = new Date(
      lastWeekStart.getFullYear(),
      lastWeekStart.getMonth(),
      lastWeekStart.getDate()
    ).toISOString()
    const lastWeekEndStr = new Date(
      lastWeekEnd.getFullYear(),
      lastWeekEnd.getMonth(),
      lastWeekEnd.getDate()
    ).toISOString()

    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const todayOrders = Number(
      (
        db
          .prepare('SELECT COUNT(*) as count FROM orders WHERE created_at >= ? AND created_at < ?')
          .get(todayStart, todayEnd) as { count: number }
      ).count
    )

    const todaySales = Number(
      (
        db
          .prepare(
            'SELECT COALESCE(SUM(pay_amount), 0) as amount FROM orders WHERE status IN (?, ?, ?) AND created_at >= ? AND created_at < ?'
          )
          .get('paid', 'shipped', 'completed', todayStart, todayEnd) as { amount: number }
      ).amount
    )

    const todayUsers = Number(
      (
        db
          .prepare('SELECT COUNT(*) as count FROM users WHERE created_at >= ? AND created_at < ?')
          .get(todayStart, todayEnd) as { count: number }
      ).count
    )

    const weekOrders = Number(
      (
        db
          .prepare('SELECT COUNT(*) as count FROM orders WHERE created_at >= ?')
          .get(weekStartStr) as { count: number }
      ).count
    )

    const weekSales = Number(
      (
        db
          .prepare(
            'SELECT COALESCE(SUM(pay_amount), 0) as amount FROM orders WHERE status IN (?, ?, ?) AND created_at >= ?'
          )
          .get('paid', 'shipped', 'completed', weekStartStr) as { amount: number }
      ).amount
    )

    const monthOrders = Number(
      (
        db
          .prepare('SELECT COUNT(*) as count FROM orders WHERE created_at >= ?')
          .get(monthStart) as { count: number }
      ).count
    )

    const monthSales = Number(
      (
        db
          .prepare(
            'SELECT COALESCE(SUM(pay_amount), 0) as amount FROM orders WHERE status IN (?, ?, ?) AND created_at >= ?'
          )
          .get('paid', 'shipped', 'completed', monthStart) as { amount: number }
      ).amount
    )

    const lastWeekOrders = Number(
      (
        db
          .prepare('SELECT COUNT(*) as count FROM orders WHERE created_at >= ? AND created_at < ?')
          .get(lastWeekStartStr, lastWeekEndStr) as { count: number }
      ).count
    )

    const lastWeekSales = Number(
      (
        db
          .prepare(
            'SELECT COALESCE(SUM(pay_amount), 0) as amount FROM orders WHERE status IN (?, ?, ?) AND created_at >= ? AND created_at < ?'
          )
          .get('paid', 'shipped', 'completed', lastWeekStartStr, lastWeekEndStr) as {
          amount: number
        }
      ).amount
    )

    const lastMonthOrders = Number(
      (
        db
          .prepare('SELECT COUNT(*) as count FROM orders WHERE created_at >= ? AND created_at < ?')
          .get(lastMonthStart, lastMonthEnd) as { count: number }
      ).count
    )

    const lastMonthSales = Number(
      (
        db
          .prepare(
            'SELECT COALESCE(SUM(pay_amount), 0) as amount FROM orders WHERE status IN (?, ?, ?) AND created_at >= ? AND created_at < ?'
          )
          .get('paid', 'shipped', 'completed', lastMonthStart, lastMonthEnd) as { amount: number }
      ).amount
    )

    const weekOrderGrowth =
      lastWeekOrders > 0 ? (((weekOrders - lastWeekOrders) / lastWeekOrders) * 100).toFixed(2) : '0'
    const weekSalesGrowth =
      lastWeekSales > 0 ? (((weekSales - lastWeekSales) / lastWeekSales) * 100).toFixed(2) : '0'
    const monthOrderGrowth =
      lastMonthOrders > 0
        ? (((monthOrders - lastMonthOrders) / lastMonthOrders) * 100).toFixed(2)
        : '0'
    const monthSalesGrowth =
      lastMonthSales > 0 ? (((monthSales - lastMonthSales) / lastMonthSales) * 100).toFixed(2) : '0'

    const avgOrderValue = weekOrders > 0 ? (weekSales / weekOrders).toFixed(2) : '0'

    return {
      today: {
        orderCount: todayOrders,
        salesAmount: parseFloat(String(todaySales)),
        userCount: todayUsers,
      },
      week: {
        orderCount: weekOrders,
        salesAmount: parseFloat(String(weekSales)),
        avgOrderValue: parseFloat(avgOrderValue),
        orderGrowth: parseFloat(weekOrderGrowth),
        salesGrowth: parseFloat(weekSalesGrowth),
      },
      month: {
        orderCount: monthOrders,
        salesAmount: parseFloat(String(monthSales)),
        avgOrderValue: monthOrders > 0 ? parseFloat((monthSales / monthOrders).toFixed(2)) : 0,
        orderGrowth: parseFloat(monthOrderGrowth),
        salesGrowth: parseFloat(monthSalesGrowth),
      },
    }
  }

  async getOrderTrend(
    period: string = 'day',
    startDate?: string,
    endDate?: string
  ): Promise<OrderTrendData> {
    const db = getDb()
    const startDateStr = toDateString(startDate)
    const endDateStr = toDateString(endDate)

    let whereClause = ''
    const params: (string | number)[] = []

    if (startDateStr) {
      whereClause = 'WHERE o.created_at >= ?'
      params.push(startDateStr)
    }
    if (endDateStr) {
      whereClause += (startDateStr ? ' AND' : 'WHERE') + ' o.created_at <= ?'
      params.push(endDateStr)
    }

    let dateFormat: string, groupBy: string
    switch (period) {
      case 'week':
        dateFormat = "strftime('%Y-%W', o.created_at)"
        groupBy = "strftime('%Y-%W', o.created_at)"
        break
      case 'month':
        dateFormat = "strftime('%Y-%m', o.created_at)"
        groupBy = "strftime('%Y-%m', o.created_at)"
        break
      case 'day':
      default:
        dateFormat = "strftime('%Y-%m-%d', o.created_at)"
        groupBy = "strftime('%Y-%m-%d', o.created_at)"
        break
    }

    const trendData = db
      .prepare(
        `
        SELECT
          ${dateFormat} as date,
          COUNT(o.id) as orderCount,
          COALESCE(SUM(CASE WHEN o.status IN ('paid', 'shipped', 'completed') THEN o.pay_amount ELSE 0 END), 0) as salesAmount
        FROM orders o
        ${whereClause}
        GROUP BY ${groupBy}
        ORDER BY date ASC
      `
      )
      .all(...params) as Record<string, unknown>[]

    return {
      period: period as Period,
      data: trendData.map((item) => ({
        date: String(item.date),
        orderCount: Number(item.orderCount),
        salesAmount: parseFloat(String(item.salesAmount)),
      })),
    }
  }

  async getProductRank(
    topN: number = 10,
    startDate?: string,
    endDate?: string
  ): Promise<{ topN: number; data: ProductRankItem[] }> {
    const db = getDb()
    const startDateStr = toDateString(startDate)
    const endDateStr = toDateString(endDate)

    let whereClause = ''
    const params: (string | number)[] = []

    if (startDateStr) {
      whereClause = 'WHERE o.created_at >= ?'
      params.push(startDateStr)
    }
    if (endDateStr) {
      whereClause += (startDateStr ? ' AND' : 'WHERE') + ' o.created_at <= ?'
      params.push(endDateStr)
    }

    const productRank = db
      .prepare(
        `
        SELECT
          oi.product_id,
          p.name as productName,
          p.main_image as productImage,
          SUM(oi.quantity) as totalQuantity,
          SUM(oi.total_price) as totalSales,
          COUNT(DISTINCT o.id) as orderCount
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN products p ON oi.product_id = p.id
        ${whereClause}
        GROUP BY oi.product_id, p.name, p.main_image
        ORDER BY totalQuantity DESC
        LIMIT ?
      `
      )
      .all(...params, topN) as Record<string, unknown>[]

    return {
      topN,
      data: productRank.map((item) => ({
        productId: String(item.product_id),
        productName: String(item.productName),
        productImage: String(item.productImage),
        totalQuantity: Number(item.totalQuantity),
        totalSales: parseFloat(String(item.totalSales)),
        orderCount: Number(item.orderCount),
      })),
    }
  }

  async getUserTrend(
    period: string = 'day',
    startDate?: string,
    endDate?: string
  ): Promise<UserTrendData> {
    const db = getDb()
    const startDateStr = toDateString(startDate)
    const endDateStr = toDateString(endDate)

    let whereClause = ''
    const params: (string | number)[] = []

    if (startDateStr) {
      whereClause = 'WHERE u.created_at >= ?'
      params.push(startDateStr)
    }
    if (endDateStr) {
      whereClause += (startDateStr ? ' AND' : 'WHERE') + ' u.created_at <= ?'
      params.push(endDateStr)
    }

    let dateFormat: string, groupBy: string
    switch (period) {
      case 'week':
        dateFormat = "strftime('%Y-%W', u.created_at)"
        groupBy = "strftime('%Y-%W', u.created_at)"
        break
      case 'month':
        dateFormat = "strftime('%Y-%m', u.created_at)"
        groupBy = "strftime('%Y-%m', u.created_at)"
        break
      case 'day':
      default:
        dateFormat = "strftime('%Y-%m-%d', u.created_at)"
        groupBy = "strftime('%Y-%m-%d', u.created_at)"
        break
    }

    const trendData = db
      .prepare(
        `
        SELECT
          ${dateFormat} as date,
          COUNT(u.id) as registerCount
        FROM users u
        ${whereClause}
        GROUP BY ${groupBy}
        ORDER BY date ASC
      `
      )
      .all(...params) as Record<string, unknown>[]

    return {
      period: period as Period,
      data: trendData.map((item) => ({
        date: String(item.date),
        registerCount: Number(item.registerCount),
      })),
    }
  }

  async getConversion(startDate?: string, endDate?: string): Promise<ConversionStats> {
    const db = getDb()
    const startDateStr = toDateString(startDate)
    const endDateStr = toDateString(endDate)

    let orderWhereClause = ''
    let userWhereClause = ''
    let cartWhereClause = ''
    const orderParams: (string | number)[] = []
    const userParams: (string | number)[] = []
    const cartParams: (string | number)[] = []

    if (startDateStr) {
      orderWhereClause = 'WHERE o.created_at >= ?'
      orderParams.push(startDateStr)
      userWhereClause = 'WHERE u.created_at >= ?'
      userParams.push(startDateStr)
      cartWhereClause = 'WHERE c.created_at >= ?'
      cartParams.push(startDateStr)
    }
    if (endDateStr) {
      orderWhereClause += (startDateStr ? ' AND' : 'WHERE') + ' o.created_at <= ?'
      orderParams.push(endDateStr)
      userWhereClause += (startDateStr ? ' AND' : 'WHERE') + ' u.created_at <= ?'
      userParams.push(endDateStr)
      cartWhereClause += (startDateStr ? ' AND' : 'WHERE') + ' c.created_at <= ?'
      cartParams.push(endDateStr)
    }

    const orderCount = Number(
      (
        db
          .prepare(`SELECT COUNT(*) as count FROM orders o ${orderWhereClause}`)
          .get(...orderParams) as { count: number }
      ).count
    )

    const paidOrderCount = Number(
      (
        db
          .prepare(
            `SELECT COUNT(*) as count FROM orders o ${orderWhereClause ? orderWhereClause + ' AND' : 'WHERE'} o.status IN ('paid', 'shipped', 'completed')`
          )
          .get(...orderParams) as { count: number }
      ).count
    )

    const userCount = Number(
      (
        db
          .prepare(`SELECT COUNT(*) as count FROM users u ${userWhereClause}`)
          .get(...userParams) as { count: number }
      ).count
    )

    const cartCount = Number(
      (
        db
          .prepare(`SELECT COUNT(DISTINCT user_id) as count FROM carts c ${cartWhereClause}`)
          .get(...cartParams) as { count: number }
      ).count
    )

    const cartAddCount = Number(
      (
        db
          .prepare(`SELECT COUNT(*) as count FROM carts c ${cartWhereClause}`)
          .get(...cartParams) as { count: number }
      ).count
    )

    const addOrderUserCount = Number(
      (
        db
          .prepare(
            `
        SELECT COUNT(DISTINCT o.user_id) as count
        FROM orders o
        JOIN carts c ON o.user_id = c.user_id
        ${orderWhereClause}
      `
          )
          .get(...orderParams) as { count: number }
      ).count
    )

    const visitConversion = userCount > 0 ? ((orderCount / userCount) * 100).toFixed(2) : '0'
    const addCartConversion = userCount > 0 ? ((cartCount / userCount) * 100).toFixed(2) : '0'
    const orderConversion = cartCount > 0 ? ((addOrderUserCount / cartCount) * 100).toFixed(2) : '0'
    const payConversion = orderCount > 0 ? ((paidOrderCount / orderCount) * 100).toFixed(2) : '0'

    return {
      visitConversion: parseFloat(visitConversion),
      addCartConversion: parseFloat(addCartConversion),
      orderConversion: parseFloat(orderConversion),
      payConversion: parseFloat(payConversion),
      metrics: {
        visitCount: userCount,
        addCartCount: cartAddCount,
        addCartUserCount: cartCount,
        orderCount,
        paidOrderCount,
      },
    }
  }

  async getPaymentStats(startDate?: string, endDate?: string): Promise<PaymentStats> {
    const db = getDb()
    const startDateStr = toDateString(startDate)
    const endDateStr = toDateString(endDate)

    let whereClause = ''
    const params: (string | number)[] = []

    if (startDateStr) {
      whereClause = 'WHERE o.created_at >= ?'
      params.push(startDateStr)
    }
    if (endDateStr) {
      whereClause += (startDateStr ? ' AND' : 'WHERE') + ' o.created_at <= ?'
      params.push(endDateStr)
    }

    const paymentWhereClause = whereClause
      ? `${whereClause} AND o.status IN ('paid', 'shipped', 'completed') AND o.pay_method IS NOT NULL`
      : "WHERE o.status IN ('paid', 'shipped', 'completed') AND o.pay_method IS NOT NULL"

    const paymentStats = db
      .prepare(
        `
        SELECT
          o.pay_method as paymentMethod,
          COUNT(o.id) as orderCount,
          COALESCE(SUM(o.pay_amount), 0) as totalAmount
        FROM orders o
        ${paymentWhereClause}
        GROUP BY o.pay_method
        ORDER BY totalAmount DESC
      `
      )
      .all(...params) as Record<string, unknown>[]

    const totalOrderCount = paymentStats.reduce((sum, item) => sum + Number(item.orderCount), 0)
    const totalAmount = paymentStats.reduce(
      (sum, item) => sum + parseFloat(String(item.totalAmount)),
      0
    )

    return {
      total: {
        orderCount: totalOrderCount,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
      },
      data: paymentStats.map((item) => ({
        paymentMethod: String(item.paymentMethod),
        orderCount: Number(item.orderCount),
        totalAmount: parseFloat(String(item.totalAmount)),
        orderPercentage:
          totalOrderCount > 0
            ? parseFloat(((Number(item.orderCount) / totalOrderCount) * 100).toFixed(2))
            : 0,
        amountPercentage:
          totalAmount > 0
            ? parseFloat(((parseFloat(String(item.totalAmount)) / totalAmount) * 100).toFixed(2))
            : 0,
      })),
    }
  }

  async getRefundStats(startDate?: string, endDate?: string): Promise<RefundStats> {
    const db = getDb()
    const startDateStr = toDateString(startDate)
    const endDateStr = toDateString(endDate)

    let whereClause = ''
    const params: (string | number)[] = []

    if (startDateStr) {
      whereClause = 'WHERE o.created_at >= ?'
      params.push(startDateStr)
    }
    if (endDateStr) {
      whereClause += (startDateStr ? ' AND' : 'WHERE') + ' o.created_at <= ?'
      params.push(endDateStr)
    }

    const totalOrders = Number(
      (
        db.prepare(`SELECT COUNT(*) as count FROM orders o ${whereClause}`).get(...params) as {
          count: number
        }
      ).count
    )

    const refundOrders = Number(
      (
        db
          .prepare(
            `SELECT COUNT(*) as count FROM orders o ${whereClause ? whereClause + ' AND' : 'WHERE'} o.status IN ('refunding', 'refunded')`
          )
          .get(...params) as { count: number }
      ).count
    )

    const refundAmount = Number(
      (
        db
          .prepare(
            `SELECT COALESCE(SUM(o.refund_amount), 0) as amount FROM orders o ${whereClause ? whereClause + ' AND' : 'WHERE'} o.status = 'refunded'`
          )
          .get(...params) as { amount: number }
      ).amount
    )

    const totalSales = Number(
      (
        db
          .prepare(
            `SELECT COALESCE(SUM(o.pay_amount), 0) as amount FROM orders o ${whereClause ? whereClause + ' AND' : 'WHERE'} o.status IN ('paid', 'shipped', 'completed', 'refunded')`
          )
          .get(...params) as { amount: number }
      ).amount
    )

    const refundRate = totalOrders > 0 ? ((refundOrders / totalOrders) * 100).toFixed(2) : '0'
    const refundAmountRate =
      totalSales > 0 ? ((parseFloat(String(refundAmount)) / totalSales) * 100).toFixed(2) : '0'

    return {
      refundOrderCount: refundOrders,
      refundAmount: parseFloat(String(refundAmount)),
      refundRate: parseFloat(refundRate),
      refundAmountRate: parseFloat(refundAmountRate),
      totalOrderCount: totalOrders,
      totalSalesAmount: parseFloat(String(totalSales)),
    }
  }

  async getCouponStats(startDate?: string, endDate?: string): Promise<CouponStats> {
    const db = getDb()
    const startDateStr = toDateString(startDate)
    const endDateStr = toDateString(endDate)

    let whereClause = ''
    const params: (string | number)[] = []

    if (startDateStr) {
      whereClause = 'WHERE uc.created_at >= ?'
      params.push(startDateStr)
    }
    if (endDateStr) {
      whereClause += (startDateStr ? ' AND' : 'WHERE') + ' uc.created_at <= ?'
      params.push(endDateStr)
    }

    const receivedCount = Number(
      (
        db
          .prepare(`SELECT COUNT(*) as count FROM user_coupons uc ${whereClause}`)
          .get(...params) as { count: number }
      ).count
    )

    const usedCount = Number(
      (
        db
          .prepare(
            `SELECT COUNT(*) as count FROM user_coupons uc ${whereClause ? whereClause + ' AND' : 'WHERE'} uc.status = 'used'`
          )
          .get(...params) as { count: number }
      ).count
    )

    const usedRate = receivedCount > 0 ? ((usedCount / receivedCount) * 100).toFixed(2) : '0'

    return {
      receivedCount,
      usedCount,
      usedRate: parseFloat(usedRate),
    }
  }
}

export default new StatisticsService()
