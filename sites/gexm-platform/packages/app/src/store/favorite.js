/**
 * 收藏状态管理
 */
import { defineStore } from 'pinia'
import favoriteApi from '../api/favorite'

export const useFavoriteStore = defineStore('favorite', {
  state: () => ({
    favorites: [],
    favoritesTotal: 0,
  }),

  getters: {
    hasFavorites: (state) => state.favorites.length > 0,
  },

  actions: {
    async fetchFavorites() {
      try {
        const result = await favoriteApi.getFavorites()
        this.favorites = result.data || result.items || result.favorites || []
        this.favoritesTotal = result.total || this.favorites.length
        return result
      } catch (e) {
        console.error('Failed to fetch favorites:', e)
        throw e
      }
    },

    async checkFavorite(productId) {
      try {
        const result = await favoriteApi.checkFavorite(productId)
        return result.isFavorited || false
      } catch (e) {
        console.error('Failed to check favorite:', e)
        return false
      }
    },

    async addFavorite(productId) {
      try {
        const result = await favoriteApi.addFavorite(productId)
        return result
      } catch (e) {
        console.error('Failed to add favorite:', e)
        throw e
      }
    },

    async removeFavorite(productId) {
      try {
        await favoriteApi.removeFavorite(productId)
        this.favorites = this.favorites.filter(
          (f) => f.product_id !== productId && f.product?.id !== productId
        )
        this.favoritesTotal--
      } catch (e) {
        console.error('Failed to remove favorite:', e)
        throw e
      }
    },

    async toggleFavorite(productId, isFavorited) {
      if (isFavorited) {
        await this.removeFavorite(productId)
      } else {
        await this.addFavorite(productId)
      }
    },

    async removeFavorites(ids) {
      try {
        await favoriteApi.removeFavorites(ids)
        this.favorites = this.favorites.filter((f) => !ids.includes(f.id))
        this.favoritesTotal = this.favorites.length
      } catch (e) {
        console.error('Failed to remove favorites:', e)
        throw e
      }
    },
  },
})
