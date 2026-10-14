import { http } from './request'

export interface OrderItem {
  id: string
  productId: string
  productName: string
  productImage: string
  skuId?: string
  skuName?: string
  quantity: number
  price: number
  totalPrice: number
}

export interface OrderAddress {
  id: string
  name: string
  phone: string
  province: string
  city: string
  district: string
  detail: string
}

export interface Order {
  id: string
  orderNo: string
  userId: string
  items: OrderItem[]
  address: OrderAddress
  status: OrderStatus
  totalAmount: number
  discountAmount: number
  payAmount: number
  couponId?: string
  pointsUsed: number
  paymentMethod?: string
  paymentStatus: string
  paymentTime?: string
  shippingMethod?: string
  trackingNo?: string
  shippingTime?: string
  deliveryTime?: string
  completedTime?: string
  remark?: string
  createdAt: string
  updatedAt: string
}

export type OrderStatus =
  | 'pending_payment'
  | 'pending_shipment'
  | 'shipped'
  | 'completed'
  | 'refund'
  | 'cancelled'

export interface OrderQuery {
  page?: number
  pageSize?: number
  status?: OrderStatus
  keyword?: string
  startTime?: string
  endTime?: string
}

export const orderApi = {
  getOrders(query?: OrderQuery): Promise<{ list: Order[]; total: number }> {
    return http.get('/orders', query)
  },

  getOrderDetail(id: string): Promise<Order> {
    return http.get(`/orders/${id}`)
  },

  createOrder(data: {
    items: { productId: string; skuId?: string; quantity: number }[]
    addressId: string
    couponId?: string
    pointsUsed?: number
    remark?: string
  }): Promise<Order> {
    return http.post('/orders', data)
  },

  updateOrder(id: string, data: { status?: OrderStatus; trackingNo?: string }): Promise<Order> {
    return http.put(`/orders/${id}`, data)
  },

  deleteOrder(id: string): Promise<void> {
    return http.delete(`/orders/${id}`)
  },

  cancelOrder(id: string): Promise<Order> {
    return http.put(`/orders/${id}/cancel`)
  },

  payOrder(id: string, data: { paymentMethod: string }): Promise<Order> {
    return http.post(`/orders/${id}/pay`, data)
  },

  shipOrder(id: string, data: { trackingNo: string; shippingMethod: string }): Promise<Order> {
    return http.put(`/orders/${id}/ship`, data)
  },

  completeOrder(id: string): Promise<Order> {
    return http.put(`/orders/${id}/complete`)
  },

  getStatistics(): Promise<{
    totalOrders: number
    totalAmount: number
    pendingPayment: number
    pendingShipment: number
    shipped: number
    completed: number
  }> {
    return http.get('/orders/statistics')
  },
}
