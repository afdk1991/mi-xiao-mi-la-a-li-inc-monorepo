import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import { useUserStore } from '@/store/user'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/Login.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('@/views/login/ForgotPassword.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    name: 'Layout',
    component: () => import('@/layout/index.vue'),
    redirect: '/dashboard',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/Dashboard.vue'),
        meta: { title: '数据看板', icon: 'Dashboard' },
      },
      {
        path: 'products',
        name: 'Products',
        component: () => import('@/views/products/Products.vue'),
        meta: { title: '商品管理', icon: 'ShoppingBag' },
      },
      {
        path: 'orders',
        name: 'Orders',
        component: () => import('@/views/orders/Orders.vue'),
        meta: { title: '订单管理', icon: 'List' },
      },
      {
        path: 'chat',
        name: 'Chat',
        component: () => import('@/views/chat/Chat.vue'),
        meta: { title: '消息中心', icon: 'Message' },
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/profile/Profile.vue'),
        meta: { title: '个人中心', icon: 'User' },
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/views/settings/Settings.vue'),
        meta: { title: '系统设置', icon: 'Setting' },
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('@/views/users/Users.vue'),
        meta: { title: '用户管理', icon: 'Users' },
      },
      {
        path: 'reviews',
        name: 'Reviews',
        component: () => import('@/views/reviews/Reviews.vue'),
        meta: { title: '评论管理', icon: 'MessageSquare' },
      },
      {
        path: 'roles',
        name: 'Roles',
        component: () => import('@/views/roles/Roles.vue'),
        meta: { title: '角色管理', icon: 'Lock' },
      },
      {
        path: 'permissions',
        name: 'Permissions',
        component: () => import('@/views/permissions/Permissions.vue'),
        meta: { title: '权限管理', icon: 'Key' },
      },
      {
        path: 'audit',
        name: 'Audit',
        component: () => import('@/views/audit/Audit.vue'),
        meta: { title: '审计日志', icon: 'FileText' },
      },
      {
        path: 'categories',
        name: 'Categories',
        component: () => import('@/views/categories/Categories.vue'),
        meta: { title: '分类管理', icon: 'Folder' },
      },
      {
        path: 'flash-sales',
        name: 'FlashSales',
        component: () => import('@/views/flash-sales/FlashSales.vue'),
        meta: { title: '秒杀管理', icon: 'Clock' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
    meta: { requiresAuth: false },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, _from, next) => {
  const userStore = useUserStore()
  const requiresAuth = to.meta.requiresAuth !== false

  if (requiresAuth && !userStore.isLoggedIn) {
    next('/login')
    return
  }

  if (to.path === '/login' && userStore.isLoggedIn) {
    next('/dashboard')
    return
  }

  if (requiresAuth && userStore.isLoggedIn) {
    const userRole = userStore.userInfo?.role || ''
    const adminPaths = ['/users', '/roles', '/permissions', '/audit']
    const isAdmin = userRole === 'admin'

    if (adminPaths.some((path) => to.path.startsWith(path)) && !isAdmin) {
      next('/dashboard')
      return
    }
  }

  next()
})

export default router
