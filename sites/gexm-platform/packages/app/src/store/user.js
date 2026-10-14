import { defineStore } from 'pinia'

const TOKEN_KEY = 'gexm_access_token'
const REFRESH_TOKEN_KEY = 'gexm_refresh_token'
const USER_KEY = 'gexm_user_info'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: '',
    refreshToken: '',
    userInfo: null,
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    userId: (state) => state.userInfo?.id || '',
    username: (state) => state.userInfo?.username || '',
    nickname: (state) => state.userInfo?.nickname || '',
    avatar: (state) => state.userInfo?.avatar || '',
    role: (state) => state.userInfo?.role || 'user',
  },

  actions: {
    initFromStorage() {
      try {
        const token = uni.getStorageSync(TOKEN_KEY)
        const refreshToken = uni.getStorageSync(REFRESH_TOKEN_KEY)
        const userInfo = uni.getStorageSync(USER_KEY)

        if (token) this.token = token
        if (refreshToken) this.refreshToken = refreshToken
        if (userInfo) {
          this.userInfo = typeof userInfo === 'string' ? JSON.parse(userInfo) : userInfo
        }
      } catch (e) {
        console.error('Failed to init user from storage:', e)
      }
    },

    setToken(accessToken, refreshToken) {
      this.token = accessToken
      this.refreshToken = refreshToken

      uni.setStorageSync(TOKEN_KEY, accessToken)
      uni.setStorageSync(REFRESH_TOKEN_KEY, refreshToken)
    },

    setUserInfo(userInfo) {
      this.userInfo = userInfo
      uni.setStorageSync(USER_KEY, JSON.stringify(userInfo))
    },

    updateUserInfo(partialInfo) {
      if (this.userInfo) {
        this.userInfo = { ...this.userInfo, ...partialInfo }
        uni.setStorageSync(USER_KEY, JSON.stringify(this.userInfo))
      }
    },

    logout() {
      this.token = ''
      this.refreshToken = ''
      this.userInfo = null

      uni.removeStorageSync(TOKEN_KEY)
      uni.removeStorageSync(REFRESH_TOKEN_KEY)
      uni.removeStorageSync(USER_KEY)
    },
  },
})
