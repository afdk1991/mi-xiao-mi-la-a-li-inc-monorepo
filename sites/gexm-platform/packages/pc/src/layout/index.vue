<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/store/user'
import { authApi } from '@/api'
import { ElMenu, ElMenuItem, ElHeader, ElAside, ElMain, ElDropdown, ElDropdownMenu, ElDropdownItem, ElBreadcrumb, ElBreadcrumbItem, ElButton } from 'element-plus'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const collapsed = ref(false)
const userMenuVisible = ref(false)

const menuItems = [
  { path: '/dashboard', title: '数据看板', icon: '📊' },
  { path: '/products', title: '商品管理', icon: '🛒' },
  { path: '/orders', title: '订单管理', icon: '📋' },
  { path: '/flash-sales', title: '秒杀管理', icon: '⚡' },
  { path: '/users', title: '用户管理', icon: '👥' },
  { path: '/reviews', title: '评论管理', icon: '💬' },
  { path: '/categories', title: '分类管理', icon: '📁' },
  { path: '/roles', title: '角色管理', icon: '🔑' },
  { path: '/permissions', title: '权限管理', icon: '🔐' },
  { path: '/audit', title: '审计日志', icon: '📝' },
]

const bottomMenuItems = [
  { path: '/profile', title: '个人中心', icon: '👤' },
  { path: '/settings', title: '系统设置', icon: '⚙️' },
]

const currentPath = computed(() => route.path)

const breadcrumbs = computed(() => {
  const matched = route.matched
  const crumbs = matched.filter((item) => item.meta.title).map((item) => ({
    title: item.meta.title as string,
    path: item.path,
  }))
  return crumbs
})

onMounted(() => {
  userStore.initFromStorage()
  if (userStore.isLoggedIn && !userStore.userInfo) {
    authApi.getProfile().then((userInfo) => {
      userStore.setUserInfo(userInfo)
    }).catch(() => {
      userStore.logout()
      router.push('/login')
    })
  }
})

function handleMenuSelect(index: string) {
  router.push(index)
}

async function handleLogout() {
  try {
    await authApi.logout({ refreshToken: userStore.refreshToken })
  } catch {
    console.error('Logout API failed')
  }
  userStore.logout()
  router.push('/login')
}

function toggleCollapse() {
  collapsed.value = !collapsed.value
}
</script>

<template>
  <div class="gexm-layout">
    <ElAside :width="collapsed ? '64px' : '220px'" class="gexm-sidebar">
      <div class="gexm-sidebar-logo">
        <span v-if="!collapsed" class="gexm-logo-text">Gexm</span>
        <span v-else class="gexm-logo-icon">G</span>
      </div>
      <ElMenu
        :default-active="currentPath"
        class="gexm-menu"
        :collapse="collapsed"
        @select="handleMenuSelect"
        :unique-opened="true"
      >
        <ElMenuItem v-for="item in menuItems" :key="item.path" :index="item.path">
          <span>{{ item.icon }}</span>
          <span>{{ item.title }}</span>
        </ElMenuItem>
        <div class="gexm-menu-divider"></div>
        <ElMenuItem v-for="item in bottomMenuItems" :key="item.path" :index="item.path">
          <span>{{ item.icon }}</span>
          <span>{{ item.title }}</span>
        </ElMenuItem>
      </ElMenu>
    </ElAside>

    <div class="gexm-main-wrap">
      <ElHeader class="gexm-header">
        <div class="gexm-header-left">
          <ElButton icon="Menu" @click="toggleCollapse" class="gexm-toggle-btn" />
          <span class="gexm-header-title">{{ route.meta.title || 'Gexm' }}</span>
        </div>
        <div class="gexm-header-right">
          <ElBreadcrumb separator="/" class="gexm-breadcrumb">
            <ElBreadcrumbItem v-for="crumb in breadcrumbs" :key="crumb.path">
              {{ crumb.title }}
            </ElBreadcrumbItem>
          </ElBreadcrumb>
          <ElDropdown trigger="click" @visible-change="(v: boolean) => (userMenuVisible = v)">
            <div class="gexm-user-menu">
              <span class="gexm-user-avatar">{{ (userStore.nickname || userStore.username || 'U').charAt(0) }}</span>
              <span v-if="!collapsed" class="gexm-user-name">{{ userStore.nickname || userStore.username }}</span>
              <span class="gexm-user-arrow">▼</span>
            </div>
            <template #dropdown>
              <ElDropdownMenu>
                <ElDropdownItem @click="router.push('/profile')">个人设置</ElDropdownItem>
                <ElDropdownItem divided @click="handleLogout">退出登录</ElDropdownItem>
              </ElDropdownMenu>
            </template>
          </ElDropdown>
        </div>
      </ElHeader>

      <ElMain class="gexm-content">
        <router-view />
      </ElMain>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.gexm-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.gexm-sidebar {
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  color: #fff;
  border-right: none;
  transition: width 0.3s ease;
}

.gexm-sidebar-logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.gexm-logo-text {
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.gexm-logo-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #fff;
}

.gexm-menu {
  border-right: none;
  background: transparent;
  padding-top: 20px;
}

.gexm-menu :deep(.el-menu-item) {
  color: rgba(255, 255, 255, 0.8);
  margin: 4px 12px;
  border-radius: 8px;
  height: 44px;
  line-height: 44px;
}

.gexm-menu :deep(.el-menu-item:hover) {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.gexm-menu :deep(.el-menu-item.is-active) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.gexm-menu-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 20px 12px;
}

.gexm-main-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

.gexm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  height: 60px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.gexm-header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.gexm-toggle-btn {
  font-size: 18px;
}

.gexm-header-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.gexm-header-right {
  display: flex;
  align-items: center;
  gap: 24px;
}

.gexm-breadcrumb {
  font-size: 14px;
}

.gexm-breadcrumb :deep(.el-breadcrumb__item:last-child .el-breadcrumb__inner) {
  color: #606266;
}

.gexm-user-menu {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 8px;
  transition: background 0.2s;
}

.gexm-user-menu:hover {
  background: #f5f7fa;
}

.gexm-user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
}

.gexm-user-name {
  font-size: 14px;
  color: #303133;
}

.gexm-user-arrow {
  font-size: 12px;
  color: #909399;
}

.gexm-content {
  flex: 1;
  padding: 24px;
  overflow: auto;
}
</style>
