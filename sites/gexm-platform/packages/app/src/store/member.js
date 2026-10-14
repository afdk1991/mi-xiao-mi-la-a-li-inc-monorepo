import { defineStore } from 'pinia'
import memberApi from '../api/member'

export const useMemberStore = defineStore('member', {
  state: () => ({
    memberInfo: null,
    pointsBalance: 0,
    growthValue: 0,
    currentLevel: null,
    nextLevel: null,
    benefits: [],
    pointsLogs: [],
  }),

  getters: {
    progressToNextLevel: (state) => {
      if (!state.currentLevel || !state.nextLevel) return 0
      const diff = state.nextLevel.min_points - state.currentLevel.min_points
      const current = state.pointsBalance - state.currentLevel.min_points
      return diff > 0 ? Math.min(100, (current / diff) * 100) : 100
    },
  },

  actions: {
    async fetchMemberInfo() {
      try {
        const result = await memberApi.getMemberInfo()
        this.memberInfo = result.data || result
        return result
      } catch (e) {
        console.error('Failed to fetch member info:', e)
        throw e
      }
    },

    async fetchPointsBalance() {
      try {
        const result = await memberApi.getPointsBalance()
        this.pointsBalance = result.data?.balance || result?.balance || 0
        return result
      } catch (e) {
        console.error('Failed to fetch points balance:', e)
        throw e
      }
    },

    async fetchGrowthValue() {
      try {
        const result = await memberApi.getGrowthValue()
        this.growthValue = result.data?.growth || result?.growth || 0
        return result
      } catch (e) {
        console.error('Failed to fetch growth value:', e)
        throw e
      }
    },

    async fetchMemberLevel() {
      try {
        const result = await memberApi.getMemberLevel()
        this.currentLevel = result.data || result
        return result
      } catch (e) {
        console.error('Failed to fetch member level:', e)
        throw e
      }
    },

    async fetchMemberBenefits() {
      try {
        const result = await memberApi.getMemberBenefits()
        this.benefits = result.data || result || []
        return result
      } catch (e) {
        console.error('Failed to fetch member benefits:', e)
        throw e
      }
    },

    async fetchNextLevelInfo() {
      try {
        const result = await memberApi.getNextLevelInfo()
        this.nextLevel = result.data || result
        return result
      } catch (e) {
        console.error('Failed to fetch next level info:', e)
        throw e
      }
    },

    async fetchPointsLogs(params = {}) {
      try {
        const result = await memberApi.getPointsLogs(params)
        this.pointsLogs = result.data || result || []
        return result
      } catch (e) {
        console.error('Failed to fetch points logs:', e)
        throw e
      }
    },

    async refreshMemberData() {
      await Promise.all([
        this.fetchMemberInfo(),
        this.fetchPointsBalance(),
        this.fetchMemberLevel(),
        this.fetchNextLevelInfo(),
      ])
    },
  },
})