import { defineStore } from 'pinia'
import flashSaleApi from '../api/flash-sale'

export const useFlashSaleStore = defineStore('flashSale', {
  state: () => ({
    activeSales: [],
    currentSale: null,
    saleProducts: [],
    currentProduct: null,
    isJoining: false,
  }),

  getters: {
    upcomingSales: (state) => {
      return state.activeSales.filter((sale) => sale.status === 'upcoming')
    },
    ongoingSales: (state) => {
      return state.activeSales.filter((sale) => sale.status === 'active')
    },
  },

  actions: {
    async fetchActiveSales() {
      try {
        const result = await flashSaleApi.getActiveSales()
        this.activeSales = result.data || result || []
        return result
      } catch (e) {
        console.error('Failed to fetch active flash sales:', e)
        throw e
      }
    },

    async fetchSaleDetail(id) {
      try {
        const result = await flashSaleApi.getSaleDetail(id)
        this.currentSale = result.data || result
        return result
      } catch (e) {
        console.error('Failed to fetch flash sale detail:', e)
        throw e
      }
    },

    async fetchSaleProducts(id, params = {}) {
      try {
        const result = await flashSaleApi.getSaleProducts(id, params)
        this.saleProducts = result.data || result || []
        return result
      } catch (e) {
        console.error('Failed to fetch flash sale products:', e)
        throw e
      }
    },

    async fetchProductDetail(id) {
      try {
        const result = await flashSaleApi.getProductDetail(id)
        this.currentProduct = result.data || result
        return result
      } catch (e) {
        console.error('Failed to fetch flash sale product detail:', e)
        throw e
      }
    },

    async joinFlashSale(productId, quantity = 1) {
      try {
        this.isJoining = true
        const result = await flashSaleApi.joinFlashSale(productId, quantity)
        await this.fetchSaleProducts(this.currentSale?.id)
        return result
      } catch (e) {
        console.error('Failed to join flash sale:', e)
        throw e
      } finally {
        this.isJoining = false
      }
    },

    async fetchSaleStatus(id) {
      try {
        const result = await flashSaleApi.getFlashSaleStatus(id)
        const sale = this.activeSales.find((s) => s.id === id)
        if (sale) {
          sale.status = result.data?.status || result?.status
        }
        return result
      } catch (e) {
        console.error('Failed to fetch flash sale status:', e)
        throw e
      }
    },

    clearCurrentSale() {
      this.currentSale = null
      this.saleProducts = []
      this.currentProduct = null
    },
  },
})