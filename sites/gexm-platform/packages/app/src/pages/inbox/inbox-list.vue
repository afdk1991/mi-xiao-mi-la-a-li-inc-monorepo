<template>
  <view class="inbox-list-page">
    <gexm-nav-bar title="站内信">
      <template #right>
        <text v-if="unreadCount > 0" class="nav-action" @click="handleMarkAllRead">全部已读</text>
      </template>
    </gexm-nav-bar>
    <view class="inbox-tabs">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="inbox-tab"
        :class="{ 'is-active': activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        <text class="inbox-tab__text">{{ tab.label }}</text>
        <text v-if="tab.key === 'unread' && unreadCount > 0" class="inbox-tab__badge">
          {{ unreadCount }}
        </text>
      </view>
    </view>
    <gexm-loading v-if="loading" />
    <gexm-empty v-else-if="messageList.length === 0" description="暂无消息" />
    <scroll-view v-else class="message-list" scroll-y>
      <view
        v-for="msg in messageList"
        :key="msg.id"
        class="message-item"
        :class="{ 'is-unread': !msg.isRead }"
        @click="handleMessageClick(msg)"
      >
        <view class="message-item__icon">{{ getCategoryIcon(msg.category) }}</view>
        <view class="message-item__content">
          <view class="message-item__header">
            <text class="message-item__title">{{ msg.title }}</text>
            <text class="message-item__time">{{ msg.createdAt }}</text>
          </view>
          <text class="message-item__desc">{{ msg.content }}</text>
        </view>
        <view v-if="!msg.isRead" class="message-item__dot" />
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { inboxApi } from '@/api'

const userStore = useUserStore()
const loading = ref(true)
const messages = ref([])
const activeTab = ref('all')
const unreadCount = ref(0)

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'unread', label: '未读' },
  { key: 'system', label: '系统通知' },
  { key: 'order', label: '订单消息' },
]

const messageList = computed(() => {
  if (activeTab.value === 'all') return messages.value
  if (activeTab.value === 'unread') return messages.value.filter((m) => !m.isRead)
  return messages.value.filter((m) => m.category === activeTab.value)
})

onMounted(() => {
  if (!userStore.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }
})

onShow(() => {
  if (userStore.isLoggedIn) {
    fetchMessages()
  }
})

async function fetchMessages() {
  loading.value = true
  try {
    const [data, count] = await Promise.all([inboxApi.getList(), inboxApi.getUnreadCount()])
    messages.value = data || []
    unreadCount.value = count || 0
  } catch (e) {
    console.error('Fetch messages error:', e)
    messages.value = []
  } finally {
    loading.value = false
  }
}

function getCategoryIcon(category) {
  const icons = {
    system: '📢',
    order: '📦',
    coupon: '🎫',
    activity: '🎉',
    message: '💬',
  }
  return icons[category] || '📩'
}

function handleMessageClick(msg) {
  uni.navigateTo({ url: `/pages/inbox/inbox-detail?id=${msg.id}` })
}

async function handleMarkAllRead() {
  try {
    await inboxApi.markAllAsRead()
    unreadCount.value = 0
    messages.value.forEach((m) => (m.isRead = true))
    uni.showToast({ title: '已全部标记为已读', icon: 'success' })
  } catch (e) {
    console.error('Mark all read error:', e)
  }
}
</script>

<style lang="scss" scoped>
.inbox-list-page {
  min-height: 100vh;
  background: $bg-color-page;
}

.nav-action {
  font-size: $font-size-base;
  color: $primary-color;
}

.inbox-tabs {
  display: flex;
  background: #fff;
  padding: $spacing-sm 0;
  border-bottom: 1rpx solid $border-color-lighter;
}

.inbox-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $spacing-sm 0;
  position: relative;

  &__text {
    font-size: $font-size-base;
    color: $text-color-secondary;
  }

  &__badge {
    background: $danger-color;
    color: #fff;
    font-size: $font-size-xs;
    padding: 2rpx 12rpx;
    border-radius: 20rpx;
    margin-left: $spacing-xs;
  }

  &.is-active {
    .inbox-tab__text {
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
      height: 6rpx;
      background: $primary-color;
      border-radius: 3rpx;
    }
  }
}

.message-list {
  padding: $spacing-base;
  height: calc(100vh - 300rpx);
}

.message-item {
  display: flex;
  align-items: center;
  background: #fff;
  padding: $spacing-base;
  border-radius: $border-radius-md;
  margin-bottom: $spacing-sm;
  box-shadow: $shadow-sm;

  &__icon {
    font-size: 56rpx;
    margin-right: $spacing-base;
    flex-shrink: 0;
  }

  &__content {
    flex: 1;
    min-width: 0;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $spacing-xs;
  }

  &__title {
    font-size: $font-size-base;
    font-weight: 600;
    color: $text-color;
  }

  &__time {
    font-size: $font-size-xs;
    color: $text-color-placeholder;
    flex-shrink: 0;
    margin-left: $spacing-sm;
  }

  &__desc {
    font-size: $font-size-sm;
    color: $text-color-secondary;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  &__dot {
    width: 16rpx;
    height: 16rpx;
    background: $danger-color;
    border-radius: 50%;
    margin-left: $spacing-sm;
  }

  &.is-unread {
    background: rgba(64, 158, 255, 0.03);
    border: 1rpx solid rgba(64, 158, 255, 0.2);

    .message-item__title {
      font-weight: bold;
    }
  }
}
</style>
