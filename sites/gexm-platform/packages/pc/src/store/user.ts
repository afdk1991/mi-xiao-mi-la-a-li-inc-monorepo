import { defineStore } from 'pinia'

const TOKEN_KEY = 'gexm_pc_access_token'
const REFRESH_TOKEN_KEY = 'gexm_pc_refresh_token'
const USER_KEY = 'gexm_pc_user_info'

export interface UserInfo {
  id: string
  username: string
  nickname: string
  email: string
  phone?: string
  avatar?: string
  role: string
  status: string
  createdAt: string
  updatedAt: string
  lastLoginAt?: string
  balance?: number
}

export const useUserStore = defineStore('user', {
  state: () => ({
    token: '',
    refreshToken: '',
    userInfo: null as UserInfo | null,
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
        const token = localStorage.getItem(TOKEN_KEY)
        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
        const userInfo = localStorage.getItem(USER_KEY)

        if (token && token !== 'undefined') this.token = token
        if (refreshToken && refreshToken !== 'undefined') this.refreshToken = refreshToken
        if (userInfo && userInfo !== 'undefined') {
          try {
            const parsed = JSON.parse(userInfo)
            if (parsed && typeof parsed === 'object') {
              this.userInfo = parsed
            }
          } catch (parseError) {
            console.error('Failed to parse user info from storage:', parseError)
            localStorage.removeItem(USER_KEY)
          }
        }
      } catch (e) {
        console.error('Failed to init user from storage:', e)
        this.clearStorage()
      }
    },

    clearStorage() {
      this.token = ''
      this.refreshToken = ''
      this.userInfo = null
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    },

    setToken(accessToken: string, refreshToken: string) {
      this.token = accessToken
      this.refreshToken = refreshToken

      localStorage.setItem(TOKEN_KEY, accessToken)
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    },

    setUserInfo(userInfo: UserInfo) {
      this.userInfo = userInfo
      localStorage.setItem(USER_KEY, JSON.stringify(userInfo))
    },

    updateUserInfo(partialInfo: Partial<UserInfo>) {
      if (this.userInfo) {
        this.userInfo = { ...this.userInfo, ...partialInfo }
        localStorage.setItem(USER_KEY, JSON.stringify(this.userInfo))
      }
    },

    logout() {
      this.token = ''
      this.refreshToken = ''
      this.userInfo = null

      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    },
  },
})
