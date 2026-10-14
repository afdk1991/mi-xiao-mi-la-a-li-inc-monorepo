<script>
import { ref, onMounted } from 'vue'
import { useAppStore } from './store/app'
import { useUserStore } from './store/user'
import { errorMonitor } from './utils/errorMonitor'
import { globalErrorHandler } from './utils/errorHandler'
import { isWhiteList, getLoginRedirect, isAuthPage } from './utils/routerGuard'

function checkRouteAuth(url) {
  const userStore = useUserStore()

  if (isWhiteList(url)) {
    return
  }

  if (url.startsWith('/pages/admin')) {
    if (!userStore.isLoggedIn) {
      uni.redirectTo({ url: getLoginRedirect(url) })
      return
    }
    if (userStore.role !== 'admin') {
      uni.showToast({ title: '需要管理员权限', icon: 'none' })
      return
    }
    return
  }

  if (isAuthPage(url) && !userStore.isLoggedIn) {
    uni.redirectTo({ url: getLoginRedirect(url) })
  }
}

function initRouterGuard() {
  const userStore = useUserStore()

  uni.addInterceptor('navigateTo', {
    invoke: (options) => {
      if (!options.url) return
      checkRouteAuth(options.url)
    },
  })

  uni.addInterceptor('redirectTo', {
    invoke: (options) => {
      if (!options.url) return
      checkRouteAuth(options.url)
    },
  })

  uni.addInterceptor('reLaunch', {
    invoke: (options) => {
      if (!options.url) return
      checkRouteAuth(options.url)
    },
  })

  uni.addInterceptor('switchTab', {
    invoke: (options) => {
      if (!options.url) return
      if (options.url === '/pages/profile/profile' && !userStore.isLoggedIn) {
        uni.redirectTo({ url: '/pages/login/login' })
        return false
      }
      if (options.url === '/pages/cart/cart' && !userStore.isLoggedIn) {
        uni.redirectTo({ url: '/pages/login/login' })
        return false
      }
    },
  })
}

function initHarmonyOS() {
  // #ifdef MP-HARMONY || APP-HARMONY
  const sysInfo = uni.getSystemInfoSync()
  console.log('[HarmonyOS] Device Info:', {
    platform: sysInfo.platform,
    system: sysInfo.system,
    model: sysInfo.model,
    SDKVersion: sysInfo.SDKVersion,
  })
  // #endif
}

export default {
  setup() {
    const globalError = ref(null)

    function onError(error) {
      globalError.value = error
    }

    function onErrorAction(action) {
      console.log('Error action:', action)
      if (action.type === 'primary') {
        globalError.value = null
      }
    }

    onMounted(() => {
      globalErrorHandler.addListener(onError)
    })

    return {
      globalError,
      onErrorAction,
    }
  },

  onLaunch() {
    console.log('App Launch')

    const appStore = useAppStore()
    const userStore = useUserStore()

    appStore.initApp()
    userStore.initFromStorage()

    errorMonitor.init()

    initRouterGuard()

    // #ifdef MP-HARMONY || APP-HARMONY
    console.log('[HarmonyOS] App Launch')
    initHarmonyOS()
    // #endif
  },
  onShow() {
    console.log('App Show')

    // #ifdef MP-HARMONY || APP-HARMONY
    console.log('[HarmonyOS] App Show')
    // #endif
  },
  onHide() {
    console.log('App Hide')

    // #ifdef MP-HARMONY || APP-HARMONY
    console.log('[HarmonyOS] App Hide')
    // #endif
  },
}
</script>

<template>
  <view class= app-container>
    <slot></slot>
  </view>
</template>

<style lang=scss>
.app-container {
  min-height: 100vh;
  padding-bottom: calc(30px + constant(safe-area-inset-bottom));
  padding-bottom: calc(30px + env(safe-area-inset-bottom));
}
</style>
