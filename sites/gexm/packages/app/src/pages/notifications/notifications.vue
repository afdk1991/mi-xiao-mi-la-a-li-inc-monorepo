<template>
  <view class="notifications-page">
    <gexm-nav-bar title="消息通知" />

    <view class="notifications-tabs">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="notification-tab"
        :class="{ active: currentTab === tab.key }"
        @click="switchTab(tab.key)"
      >
        <text class="tab-text">{{ tab.label }}</text>
        <text v-if="getTabUnreadCount(tab.key) > 0" class="tab-badge">
          {{ getTabUnreadCount(tab.key) > 99 ? '99+' : getTabUnreadCount(tab.key) }}
        </text>
      </view>
    </view>

    <view class="notifications-header">
      <view class="notifications-header-left">
        <text v-if="unreadCount > 0" class="notifications-count">{{ unreadCount }}条未读</text>
      </view>
      <text v-if="unreadCount > 0" class="notifications-read-all" @click="handleMarkAllRead">
        全部已读
      </text>
    </view>

    <view v-if="loading && filteredList.length === 0" class="notifications-loading">
      <gexm-loading text="加载中..." />
    </view>

    <view v-else-if="!userStore.isLoggedIn" class="notifications-empty">
      <gexm-empty
        description="请先登录查看消息"
        show-button
        button-text="去登录"
        @click="goLogin"
      />
    </view>

    <view v-else-if="filteredList.length === 0" class="notifications-empty">
      <gexm-empty description="暂无消息通知" />
    </view>

    <view v-else class="notifications-list">
      <view
        v-for="item in filteredList"
        :key="item.id"
        class="notification-item"
        :class="{ 'is-unread': !item.read }"
        @click="handleItemClick(item)"
      >
        <view class="notification-icon" :class="`notification-icon--${item.type}`">
          <text>{{ getTypeIcon(item.type) }}</text>
        </view>
        <view class="notification-content">
          <view class="notification-header">
            <text class="notification-title">{{ item.title }}</text>
            <text class="notification-time">{{ formatTime(item.created_at) }}</text>
          </view>
          <text class="notification-desc ellipsis-2">{{ item.content }}</text>
        </view>
        <view v-if="!item.read" class="notification-dot" />
      </view>
    </view>

    <view v-if="filteredList.length > 0" class="notifications-bottom">
      <text v-if="loadingMore" class="notifications-tip">加载中...</text>
      <text v-else-if="noMore" class="notifications-tip">没有更多了</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import { notificationApi } from '../../api'
import { formatRelativeTime } from '../../utils'
import { useUserStore } from '../../store/user'

const userStore = useUserStore()

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'system', label: '系统通知' },
  { key: 'order', label: '订单通知' },
  { key: 'message', label: '消息' },
]

const list = ref([])
const loading = ref(false)
const loadingMore = ref(false)
const noMore = ref(false)
const page = ref(1)
const pageSize = 20
const unreadCount = ref(0)
const currentTab = ref('all')

const filteredList = computed(() => {
  if (currentTab.value === 'all') return list.value
  return list.value.filter((item) => item.type === currentTab.value)
})

onLoad(() => {})

onShow(() => {
  if (userStore.isLoggedIn) {
    loadData()
    loadUnreadCount()
  }
})

function switchTab(tab) {
  currentTab.value = tab
}

function getTabUnreadCount(tabKey) {
  if (tabKey === 'all') return unreadCount.value
  return list.value.filter((item) => item.type === tabKey && !item.read).length
}

async function loadData() {
  if (!userStore.isLoggedIn) return

  loading.value = true
  try {
    const res = await notificationApi.getList({
      page: page.value,
      pageSize,
    })
    list.value = res.data || res || []
    noMore.value = (res.data?.length || res?.length || 0) < pageSize
  } catch (err) {
    console.error('Failed to load notifications:', err)
  } finally {
    loading.value = false
  }
}

async function loadUnreadCount() {
  if (!userStore.isLoggedIn) return

  try {
    const res = await notificationApi.getUnreadCount()
    unreadCount.value = res.count || 0
  } catch (err) {
    console.error('Failed to load unread count:', err)
  }
}

function formatTime(time) {
  return formatRelativeTime(time)
}

function getTypeIcon(type) {
  const icons = {
    system: '🔔',
    order: '📦',
    message: '💬',
    notice: '📢',
  }
  return icons[type] || '📋'
}

function goLogin() {
  uni.navigateTo({ url: '/pages/login/login' })
}

async function handleItemClick(item) {
  if (!userStore.isLoggedIn) {
    goLogin()
    return
  }

  if (!item.read) {
    try {
      await notificationApi.markAsRead(item.id)
      item.read = 1
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    } catch (err) {
      console.error('Failed to mark as read:', err)
    }
  }

  uni.showToast({ title: '查看详情功能开发中', icon: 'none' })
}

async function handleMarkAllRead() {
  if (!userStore.isLoggedIn) return

  try {
    await notificationApi.markAllAsRead()
    list.value.forEach((item) => (item.read = 1))
    unreadCount.value = 0
    uni.showToast({ title: '已全部标记为已读', icon: 'success' })
  } catch (err) {
    console.error('Failed to mark all as read:', err)
  }
}

onPullDownRefresh(() => {
  page.value = 1
  loadData().finally(() => {
    uni.stopPullDownRefresh()
  })
})
</script>

<style lang="scss" scoped>
.notifications-page {
  min-height: 100vh;
  background: $bg-color-page;
}

.notifications-tabs {
  display: flex;
  background: #fff;
  padding: 0 16rpx;
  border-bottom: 1rpx solid $border-color-lighter;
}

.notification-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24rpx 0;
  position: relative;

  &.active {
    .tab-text {
      color: $primary-color;
      font-weight: 600;
    }

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 48rpx;
      height: 4rpx;
      background: $primary-color;
      border-radius: 2rpx;
    }
  }
}

.tab-text {
  font-size: 28rpx;
  color: $text-color-secondary;
}

.tab-badge {
  font-size: 20rpx;
  color: #fff;
  background: $danger-color;
  padding: 2rpx 12rpx;
  border-radius: 20rpx;
  margin-left: 8rpx;
  min-width: 32rpx;
  text-align: center;
}

.notifications-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 32rpx;
  background: #fff;
  border-bottom: 1rpx solid $border-color-lighter;

  &-left {
    display: flex;
    align-items: center;
  }
}

.notifications-title {
  font-size: 32rpx;
  font-weight: bold;
  color: $text-color;
}

.notifications-count {
  font-size: 24rpx;
  color: $danger-color;
  margin-left: 16rpx;
  background: rgba(245, 108, 108, 0.1);
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
}

.notifications-read-all {
  font-size: 26rpx;
  color: $primary-color;
}

.notifications-list {
  padding: 16rpx 24rpx;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  position: relative;

  &.is-unread {
    background: rgba(64, 158, 255, 0.05);
  }
}

.notification-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  margin-right: 20rpx;
  flex-shrink: 0;

  &--system {
    background: rgba(64, 158, 255, 0.15);
  }

  &--message {
    background: rgba(103, 194, 58, 0.15);
  }

  &--notice {
    background: rgba(230, 162, 60, 0.15);
  }
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}

.notification-title {
  font-size: 28rpx;
  font-weight: 500;
  color: $text-color;
}

.notification-time {
  font-size: 22rpx;
  color: $text-color-placeholder;
  flex-shrink: 0;
  margin-left: 16rpx;
}

.notification-desc {
  font-size: 26rpx;
  color: $text-color-secondary;
  line-height: 1.5;
}

.notification-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: $danger-color;
  position: absolute;
  top: 28rpx;
  right: 28rpx;
}

.notifications-loading,
.notifications-empty {
  padding: 120rpx 0;
}

.notifications-bottom {
  padding: 32rpx;
  text-align: center;
}

.notifications-tip {
  font-size: 24rpx;
  color: $text-color-placeholder;
}
</style>
