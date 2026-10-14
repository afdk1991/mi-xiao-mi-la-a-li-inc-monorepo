/**
 * 商品状态管理
 */
import { defineStore } from 'pinia'
import productApi from '../api/product'

export const useProductStore = defineStore('product', {
  state: () => ({
    products: [],
    productsTotal: 0,
    currentProduct: null,
    skus: [],
  }),

  getters: {
    hasProducts: (state) => state.products.length > 0,
  },

  actions: {
    async fetchProducts(params = {}) {
      try {
        const result = await productApi.getProducts(params)
        this.products = [...(result.data || [])]
        this.productsTotal = result.total || 0
        return result
      } catch (e) {
        console.error('Failed to fetch products:', e)
        throw e
      }
    },

    addProducts(list) {
      this.products = [...this.products, ...list]
    },

    async fetchProductDetail(productId) {
      try {
        const result = await productApi.getProductDetail(productId)
        this.currentProduct = { ...result }
        this.skus = [...(result.skus || [])]
        return result
      } catch (e) {
        console.error('Failed to fetch product detail:', e)
        throw e
      }
    },

    async fetchProductSkus(productId) {
      try {
        const result = await productApi.getProductSkus(productId)
        this.skus = [...(result || [])]
        return result
      } catch (e) {
        console.error('Failed to fetch skus:', e)
        throw e
      }
    },

    clearCurrentProduct() {
      this.currentProduct = null
      this.skus = []
    },
  },
})
