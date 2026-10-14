/**
 * 分类状态管理
 */
import { defineStore } from 'pinia'
import categoryApi from '../api/category'

export const useCategoryStore = defineStore('category', {
  state: () => ({
    categories: [],
    currentCategory: null,
    categoryProducts: [],
    categoryProductsTotal: 0,
  }),

  getters: {
    hasCategories: (state) => state.categories.length > 0,
  },

  actions: {
    async fetchCategories() {
      try {
        const result = await categoryApi.getCategoryTree()
        this.categories = result || []
        return result
      } catch (e) {
        console.error('Failed to fetch categories:', e)
        throw e
      }
    },

    async fetchCategoryProducts(categoryId, params = {}) {
      try {
        const result = await categoryApi.getCategoryProducts(categoryId, params)
        this.categoryProducts = result.data || []
        this.categoryProductsTotal = result.total || 0
        this.currentCategory = categoryId
        return result
      } catch (e) {
        console.error('Failed to fetch category products:', e)
        throw e
      }
    },

    setCurrentCategory(categoryId) {
      this.currentCategory = categoryId
    },
  },
})
