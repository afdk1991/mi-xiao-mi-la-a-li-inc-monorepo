import { useUserStore } from '../store/user'

const AUTH_PAGES = [
  '/pages/profile/profile',
  '/pages/cart/cart',
  '/pages/order/order-list',
  '/pages/order/order-detail',
  '/pages/order/order-confirm',
  '/pages/order/logistics-detail',
  '/pages/address/address-list',
  '/pages/address/address-edit',
  '/pages/favorites/favorites',
  '/pages/coupon/coupon-mine',
  '/pages/coupon/coupon-select',
  '/pages/checkin/checkin',
  '/pages/inbox/inbox-list',
  '/pages/inbox/inbox-detail',
  '/pages/member/member-center',
  '/pages/member/points-logs',
  '/pages/edit-profile/edit-profile',
  '/pages/review/review-list',
  '/pages/review/review-publish',
  '/pages/payment/payment',
  '/pages/admin/dashboard',
  '/pages/admin/order-list',
  '/pages/admin/order-detail',
  '/pages/admin/product-list',
  '/pages/admin/product-edit',
  '/pages/admin/order-statistics',
]

const WHITE_LIST = [
  '/pages/login/login',
  '/pages/register/register',
  '/pages/index/index',
  '/pages/category/category',
  '/pages/product/list',
  '/pages/product/detail',
  '/pages/search/search',
  '/pages/flash-sale/flash-sale',
  '/pages/about/about',
  '/pages/mine/about',
  '/pages/mine/privacy',
  '/pages/test/test',
]

export function isAuthPage(url) {
  return AUTH_PAGES.some((page) => url.startsWith(page))
}

export function isWhiteList(url) {
  return WHITE_LIST.some((page) => url.startsWith(page))
}

export function getLoginRedirect(url) {
  const loginUrl = '/pages/login/login'
  if (!url || url === '/pages/login/login' || url === '/pages/register/register') {
    return loginUrl
  }
  return `${loginUrl}?redirect=${encodeURIComponent(url)}`
}

export function checkAuth(url) {
  const userStore = useUserStore()

  if (isWhiteList(url)) {
    return true
  }

  if (!userStore.isLoggedIn) {
    uni.redirectTo({ url: getLoginRedirect(url) })
    return false
  }

  return true
}

export function checkAdmin(url) {
  const userStore = useUserStore()

  if (!userStore.isLoggedIn) {
    uni.redirectTo({ url: getLoginRedirect(url) })
    return false
  }

  if (userStore.role !== 'admin') {
    uni.showToast({ title: '需要管理员权限', icon: 'none' })
    uni.navigateBack()
    return false
  }

  return true
}

export function navigateTo(url) {
  const userStore = useUserStore()

  if (url.startsWith('/pages/admin')) {
    if (!userStore.isLoggedIn) {
      uni.redirectTo({ url: getLoginRedirect(url) })
      return
    }
    if (userStore.role !== 'admin') {
      uni.showToast({ title: '需要管理员权限', icon: 'none' })
      return
    }
  }

  const authPages = AUTH_PAGES.filter((page) => page.startsWith('/pages/admin') === false)
  if (authPages.some((page) => url.startsWith(page)) && !userStore.isLoggedIn) {
    uni.redirectTo({ url: getLoginRedirect(url) })
    return
  }

  uni.navigateTo({ url })
}

export function redirectTo(url) {
  const userStore = useUserStore()

  if (url.startsWith('/pages/admin')) {
    if (!userStore.isLoggedIn) {
      uni.redirectTo({ url: getLoginRedirect(url) })
      return
    }
    if (userStore.role !== 'admin') {
      uni.showToast({ title: '需要管理员权限', icon: 'none' })
      return
    }
  }

  const authPages = AUTH_PAGES.filter((page) => page.startsWith('/pages/admin') === false)
  if (authPages.some((page) => url.startsWith(page)) && !userStore.isLoggedIn) {
    uni.redirectTo({ url: getLoginRedirect(url) })
    return
  }

  uni.redirectTo({ url })
}

export function switchTab(url) {
  const userStore = useUserStore()

  if (url === '/pages/profile/profile' && !userStore.isLoggedIn) {
    uni.redirectTo({ url: getLoginRedirect(url) })
    return
  }

  if (url === '/pages/cart/cart' && !userStore.isLoggedIn) {
    uni.redirectTo({ url: getLoginRedirect(url) })
    return
  }

  uni.switchTab({ url })
}