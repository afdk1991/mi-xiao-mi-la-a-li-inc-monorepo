import { defineStore } from 'pinia'
import searchApi from '../api/search'

const SEARCH_HISTORY_KEY = 'gexm_search_history'
const MAX_HISTORY_COUNT = 10

export const useSearchStore = defineStore('search', {
  state: () => ({
    searchResults: [],
    hotKeywords: [],
    suggestions: [],
    searchHistory: [],
    currentKeyword: '',
    loading: false,
  }),

  getters: {
    sortedHistory: (state) => {
      return [...state.searchHistory].reverse()
    },
  },

  actions: {
    initHistory() {
      try {
        const history = uni.getStorageSync(SEARCH_HISTORY_KEY)
        if (history) {
          this.searchHistory = typeof history === 'string' ? JSON.parse(history) : history
        }
      } catch (e) {
        console.error('Failed to init search history:', e)
        this.searchHistory = []
      }
    },

    async searchProducts(params = {}) {
      try {
        this.loading = true
        const result = await searchApi.searchProducts(params)
        this.searchResults = result.data || result || []
        if (params.keyword) {
          this.addToHistory(params.keyword)
          this.currentKeyword = params.keyword
        }
        return result
      } catch (e) {
        console.error('Failed to search products:', e)
        throw e
      } finally {
        this.loading = false
      }
    },

    async fetchHotKeywords() {
      try {
        const result = await searchApi.getHotKeywords()
        this.hotKeywords = result.data || result || []
        return result
      } catch (e) {
        console.error('Failed to fetch hot keywords:', e)
        throw e
      }
    },

    async fetchSuggestions(keyword) {
      try {
        const result = await searchApi.getSuggestions(keyword)
        this.suggestions = result.data || result || []
        return result
      } catch (e) {
        console.error('Failed to fetch suggestions:', e)
        throw e
      }
    },

    addToHistory(keyword) {
      if (!keyword.trim()) return
      const index = this.searchHistory.indexOf(keyword)
      if (index > -1) {
        this.searchHistory.splice(index, 1)
      }
      this.searchHistory.push(keyword)
      if (this.searchHistory.length > MAX_HISTORY_COUNT) {
        this.searchHistory.shift()
      }
      uni.setStorageSync(SEARCH_HISTORY_KEY, JSON.stringify(this.searchHistory))
    },

    removeFromHistory(keyword) {
      const index = this.searchHistory.indexOf(keyword)
      if (index > -1) {
        this.searchHistory.splice(index, 1)
        uni.setStorageSync(SEARCH_HISTORY_KEY, JSON.stringify(this.searchHistory))
      }
    },

    clearHistory() {
      this.searchHistory = []
      uni.removeStorageSync(SEARCH_HISTORY_KEY)
    },

    setCurrentKeyword(keyword) {
      this.currentKeyword = keyword
    },

    clearSuggestions() {
      this.suggestions = []
    },
  },
})