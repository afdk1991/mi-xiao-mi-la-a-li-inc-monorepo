import { defineStore } from 'pinia'
import couponApi from '../api/coupon'

export const useCouponStore = defineStore('coupon', {
  state: () => ({
    coupons: [],
    myCoupons: [],
    selectedCoupon: null,
  }),

  getters: {
    availableCoupons: (state) => {
      return state.myCoupons.filter((coupon) => coupon.status === 'unused')
    },
  },

  actions: {
    async fetchCoupons(params = {}) {
      try {
        const result = await couponApi.getList(params)
        this.coupons = result.data || result || []
        return result
      } catch (e) {
        console.error('Failed to fetch coupons:', e)
        throw e
      }
    },

    async fetchMyCoupons(params = {}) {
      try {
        const result = await couponApi.getMine(params)
        this.myCoupons = result.data || result || []
        return result
      } catch (e) {
        console.error('Failed to fetch my coupons:', e)
        throw e
      }
    },

    async claimCoupon(couponId) {
      try {
        const result = await couponApi.claimCoupon(couponId)
        await this.fetchMyCoupons()
        return result
      } catch (e) {
        console.error('Failed to claim coupon:', e)
        throw e
      }
    },

    selectCoupon(coupon) {
      this.selectedCoupon = coupon
    },

    clearSelectedCoupon() {
      this.selectedCoupon = null
    },
  },
})
