/**
 * 地址状态管理
 */
import { defineStore } from 'pinia'
import addressApi from '../api/address'

export const useAddressStore = defineStore('address', {
  state: () => ({
    addresses: [],
    currentAddress: null,
    defaultAddress: null,
  }),

  getters: {
    hasAddresses: (state) => state.addresses.length > 0,
  },

  actions: {
    async fetchAddresses() {
      try {
        const result = await addressApi.getAddresses()
        this.addresses = result || []
        this.defaultAddress = this.addresses.find((a) => a.is_default) || null
        return result
      } catch (e) {
        console.error('Failed to fetch addresses:', e)
        throw e
      }
    },

    async fetchDefaultAddress() {
      try {
        const result = await addressApi.getDefaultAddress()
        this.defaultAddress = result.address || result
        return result
      } catch (e) {
        console.error('Failed to fetch default address:', e)
        return null
      }
    },

    async fetchAddressDetail(addressId) {
      try {
        const result = await addressApi.getAddressDetail(addressId)
        this.currentAddress = result
        return result
      } catch (e) {
        console.error('Failed to fetch address detail:', e)
        throw e
      }
    },

    async createAddress(data) {
      try {
        const result = await addressApi.createAddress(data)
        await this.fetchAddresses()
        return result
      } catch (e) {
        console.error('Failed to create address:', e)
        throw e
      }
    },

    async updateAddress(addressId, data) {
      try {
        const result = await addressApi.updateAddress(addressId, data)
        await this.fetchAddresses()
        return result
      } catch (e) {
        console.error('Failed to update address:', e)
        throw e
      }
    },

    async deleteAddress(addressId) {
      try {
        await addressApi.deleteAddress(addressId)
        this.addresses = this.addresses.filter((a) => a.id !== addressId)
        if (this.defaultAddress?.id === addressId) {
          this.defaultAddress = this.addresses.find((a) => a.is_default) || null
        }
      } catch (e) {
        console.error('Failed to delete address:', e)
        throw e
      }
    },

    async setDefault(addressId) {
      try {
        await addressApi.setDefaultAddress(addressId)
        this.addresses.forEach((a) => {
          a.is_default = a.id === addressId ? 1 : 0
        })
        this.defaultAddress = this.addresses.find((a) => a.is_default) || null
      } catch (e) {
        console.error('Failed to set default address:', e)
        throw e
      }
    },

    setCurrentAddress(address) {
      this.currentAddress = address
    },
  },
})
