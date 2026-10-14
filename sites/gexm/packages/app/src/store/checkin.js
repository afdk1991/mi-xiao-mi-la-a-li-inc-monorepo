import { defineStore } from 'pinia'
import checkinApi from '../api/checkin'

export const useCheckinStore = defineStore('checkin', {
  state: () => ({
    checkinStatus: null,
    checkinHistory: [],
    checkinReward: null,
    checkinCalendar: [],
    consecutiveDays: 0,
    todayChecked: false,
  }),

  getters: {
    streakBonus: (state) => {
      const bonuses = [0, 0, 3, 5, 10, 15, 20]
      const index = Math.min(state.consecutiveDays, bonuses.length - 1)
      return bonuses[index]
    },
  },

  actions: {
    async fetchCheckinStatus() {
      try {
        const result = await checkinApi.getCheckinStatus()
        const data = result.data || result
        this.checkinStatus = data
        this.consecutiveDays = data.consecutive_days || 0
        this.todayChecked = data.today_checked || false
        return result
      } catch (e) {
        console.error('Failed to fetch checkin status:', e)
        throw e
      }
    },

    async fetchCheckinHistory(params = {}) {
      try {
        const result = await checkinApi.getCheckinHistory(params)
        this.checkinHistory = result.data || result || []
        return result
      } catch (e) {
        console.error('Failed to fetch checkin history:', e)
        throw e
      }
    },

    async doCheckin() {
      try {
        const result = await checkinApi.doCheckin()
        await this.fetchCheckinStatus()
        return result
      } catch (e) {
        console.error('Failed to do checkin:', e)
        throw e
      }
    },

    async fetchCheckinReward() {
      try {
        const result = await checkinApi.getCheckinReward()
        this.checkinReward = result.data || result
        return result
      } catch (e) {
        console.error('Failed to fetch checkin reward:', e)
        throw e
      }
    },

    async fetchCheckinCalendar(year, month) {
      try {
        const result = await checkinApi.getCheckinCalendar(year, month)
        this.checkinCalendar = result.data || result || []
        return result
      } catch (e) {
        console.error('Failed to fetch checkin calendar:', e)
        throw e
      }
    },
  },
})