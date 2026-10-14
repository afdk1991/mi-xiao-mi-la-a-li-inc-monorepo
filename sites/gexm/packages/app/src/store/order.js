/**
 * 订单状态管理
 */
import { defineStore } from 'pinia'
import orderApi from '../api/order'

export const useOrderStore = defineStore('order', {
  state: () => ({
    orders: [],
    ordersTotal: 0,
    currentOrder: null,
    orderItems: [],
    previewData: null,
    logistics: null,
    refundInfo: null,
  }),

  getters: {
    hasOrders: (state) => state.orders.length > 0,
  },

  actions: {
    async fetchOrders(params = {}) {
      try {
        const result = await orderApi.getOrders(params)
        this.orders = result.data || []
        this.ordersTotal = result.total || 0
        return result
      } catch (e) {
        console.error('Failed to fetch orders:', e)
        throw e
      }
    },

    async fetchOrderDetail(orderId) {
      try {
        const result = await orderApi.getOrderDetail(orderId)
        this.currentOrder = result
        this.orderItems = result.items || result.orderItems || []
        return result
      } catch (e) {
        console.error('Failed to fetch order detail:', e)
        throw e
      }
    },

    async previewOrder(data) {
      try {
        const result = await orderApi.previewOrder(data)
        this.previewData = result
        return result
      } catch (e) {
        console.error('Failed to preview order:', e)
        throw e
      }
    },

    async createOrder(data) {
      try {
        const result = await orderApi.createOrder(data)
        return result
      } catch (e) {
        console.error('Failed to create order:', e)
        throw e
      }
    },

    async cancelOrder(orderId) {
      try {
        const result = await orderApi.cancelOrder(orderId)
        const order = this.orders.find((o) => o.id === orderId)
        if (order) {
          order.status = 'cancelled'
        }
        if (this.currentOrder && this.currentOrder.id === orderId) {
          this.currentOrder.status = 'cancelled'
        }
        return result
      } catch (e) {
        console.error('Failed to cancel order:', e)
        throw e
      }
    },

    async confirmOrder(orderId) {
      try {
        const result = await orderApi.confirmOrder(orderId)
        const order = this.orders.find((o) => o.id === orderId)
        if (order) {
          order.status = 'completed'
        }
        if (this.currentOrder && this.currentOrder.id === orderId) {
          this.currentOrder.status = 'completed'
        }
        return result
      } catch (e) {
        console.error('Failed to confirm order:', e)
        throw e
      }
    },

    async fetchLogistics(orderId) {
      try {
        const result = await orderApi.getLogistics(orderId)
        this.logistics = result
        return result
      } catch (e) {
        console.error('Failed to fetch logistics:', e)
        throw e
      }
    },

    async applyRefund(orderId, data) {
      try {
        const result = await orderApi.applyRefund(orderId, data)
        this.refundInfo = result
        if (this.currentOrder && this.currentOrder.id === orderId) {
          this.currentOrder.status = 'refunding'
          this.currentOrder.refundStatus = result.status || 'pending'
        }
        const order = this.orders.find((o) => o.id === orderId)
        if (order) {
          order.status = 'refunding'
          order.refundStatus = result.status || 'pending'
        }
        return result
      } catch (e) {
        console.error('Failed to apply refund:', e)
        throw e
      }
    },

    async buyAgain(orderId) {
      try {
        const result = await orderApi.buyAgain(orderId)
        return result
      } catch (e) {
        console.error('Failed to buy again:', e)
        throw e
      }
    },

    clearCurrentOrder() {
      this.currentOrder = null
      this.orderItems = []
      this.previewData = null
      this.logistics = null
      this.refundInfo = null
    },
  },
})
