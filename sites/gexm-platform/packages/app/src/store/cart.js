/**
 * 购物车状态管理
 */
import { defineStore } from 'pinia'
import cartApi from '../api/cart'

export const useCartStore = defineStore('cart', {
  state: () => ({
    cartItems: [],
    cartCount: 0,
  }),

  getters: {
    hasItems: (state) => state.cartItems.length > 0,

    selectedItems: (state) => state.cartItems.filter((item) => item.selected),

    selectedCount: (state) => {
      return state.cartItems
        .filter((item) => item.selected)
        .reduce((sum, item) => sum + item.quantity, 0)
    },

    totalPrice: (state) => {
      const total = state.cartItems
        .filter((item) => item.selected)
        .reduce(
          (sum, item) =>
            sum + (item.sku_price || item.product_price || item.price || 0) * item.quantity,
          0
        )
      return Number(total.toFixed(2))
    },

    isAllSelected: (state) => {
      return state.cartItems.length > 0 && state.cartItems.every((item) => item.selected)
    },
  },

  actions: {
    async fetchCart() {
      try {
        const result = await cartApi.getCart()
        this.cartItems = result || []
        this.updateCartCount()
        return result
      } catch (e) {
        console.error('Failed to fetch cart:', e)
        throw e
      }
    },

    async fetchCartCount() {
      try {
        const result = await cartApi.getCartCount()
        this.cartCount = result.count || 0
        return result
      } catch (e) {
        console.error('Failed to fetch cart count:', e)
        return 0
      }
    },

    async addToCart(productId, skuId, quantity = 1) {
      try {
        const result = await cartApi.addToCart({ productId, skuId, quantity })
        await this.fetchCart()
        return result
      } catch (e) {
        console.error('Failed to add to cart:', e)
        throw e
      }
    },

    async updateQuantity(cartId, quantity) {
      try {
        const result = await cartApi.updateCartItem(cartId, quantity)
        const item = this.cartItems.find((i) => i.id === cartId)
        if (item) {
          item.quantity = quantity
        }
        this.updateCartCount()
        return result
      } catch (e) {
        console.error('Failed to update quantity:', e)
        throw e
      }
    },

    async removeItem(cartId) {
      try {
        await cartApi.deleteCartItem(cartId)
        this.cartItems = this.cartItems.filter((i) => i.id !== cartId)
        this.updateCartCount()
      } catch (e) {
        console.error('Failed to remove item:', e)
        throw e
      }
    },

    async removeSelected() {
      try {
        const selectedIds = this.selectedItems.map((item) => item.id)
        if (selectedIds.length === 0) return
        await cartApi.deleteCartItems(selectedIds)
        this.cartItems = this.cartItems.filter((i) => !i.selected)
        this.updateCartCount()
      } catch (e) {
        console.error('Failed to remove selected:', e)
        throw e
      }
    },

    async toggleSelect(cartId, selected) {
      try {
        await cartApi.toggleSelect({ id: cartId, selected: selected ? 1 : 0 })
        const item = this.cartItems.find((i) => i.id === cartId)
        if (item) {
          item.selected = selected ? 1 : 0
        }
      } catch (e) {
        console.error('Failed to toggle select:', e)
        throw e
      }
    },

    async toggleSelectAll(selected) {
      try {
        await cartApi.toggleSelect({ allSelected: selected ? 1 : 0 })
        this.cartItems.forEach((item) => {
          item.selected = selected ? 1 : 0
        })
      } catch (e) {
        console.error('Failed to toggle select all:', e)
        throw e
      }
    },

    updateCartCount() {
      this.cartCount = this.cartItems.reduce((sum, item) => sum + item.quantity, 0)
    },

    clearCart() {
      this.cartItems = []
      this.cartCount = 0
    },
  },
})
