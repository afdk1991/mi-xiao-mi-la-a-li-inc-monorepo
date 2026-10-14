<template>
  <view class="inbox-detail-page">
    <gexm-nav-bar title="消息详情" />
    <gexm-loading v-if="loading" />
    <view v-else class="message-detail">
      <view class="message-header">
        <text class="message-header__icon">{{ getCategoryIcon(message.category) }}</text>
        <view class="message-header__info">
          <text class="message-header__title">{{ message.title }}</text>
          <text class="message-header__time">{{ message.createdAt }}</text>
        </view>
      </view>
      <view class="message-content">
        <text class="message-content__text">{{ message.content }}</text>
      </view>
      <view v-if="message.replies && message.replies.length > 0" class="replies-section">
        <text class="replies-section__title">回复记录</text>
        <view v-for="reply in message.replies" :key="reply.id" class="reply-item">
          <text class="reply-item__name">{{ reply.sender }}</text>
          <text class="reply-item__content">{{ reply.content }}</text>
          <text class="reply-item__time">{{ reply.createdAt }}</text>
        </view>
      </view>
    </view>
    <view v-if="!loading" class="reply-input">
      <gexm-input v-model="replyContent" placeholder="输入回复内容..." class="reply-input__field" />
      <gexm-button
        type="primary"
        size="small"
        class="reply-input__btn"
        :loading="replying"
        @click="handleReply"
      >
        回复
      </gexm-button>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { inboxApi } from '@/api'

const userStore = useUserStore()
const loading = ref(true)
const message = ref({ title: '', content: '', category: 'system', createdAt: '', replies: [] })
const replyContent = ref('')
const replying = ref(false)

onMounted(() => {
  if (!userStore.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }
})

onShow(() => {
  if (userStore.isLoggedIn) {
    fetchMessage()
  }
})

async function fetchMessage() {
  loading.value = true
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = currentPage.options || {}
  const messageId = options.id

  if (!messageId) {
    loading.value = false
    return
  }

  try {
    const data = await inboxApi.getDetail(messageId)
    message.value = data || message.value
    await inboxApi.markAsRead(messageId)
  } catch (e) {
    console.error('Fetch message detail error:', e)
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

async function handleReply() {
  if (!replyContent.value.trim()) {
    uni.showToast({ title: '请输入回复内容', icon: 'none' })
    return
  }
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = currentPage.options || {}
  const messageId = options.id

  replying.value = true
  try {
    await inboxApi.replyMessage(messageId, replyContent.value)
    uni.showToast({ title: '回复成功', icon: 'success' })
    replyContent.value = ''
    await fetchMessage()
  } catch (e) {
    console.error('Reply error:', e)
  } finally {
    replying.value = false
  }
}
</script>

<style lang="scss" scoped>
.inbox-detail-page {
  min-height: 100vh;
  background: $bg-color-page;
  padding-bottom: 160rpx;
}

.message-detail {
  padding: $spacing-base;
}

.message-header {
  display: flex;
  align-items: flex-start;
  background: #fff;
  padding: $spacing-md;
  border-radius: $border-radius-md;
  margin-bottom: $spacing-base;
  box-shadow: $shadow-sm;

  &__icon {
    font-size: 64rpx;
    margin-right: $spacing-base;
    flex-shrink: 0;
  }

  &__info {
    flex: 1;
  }

  &__title {
    font-size: $font-size-lg;
    font-weight: bold;
    color: $text-color;
    display: block;
    margin-bottom: $spacing-sm;
  }

  &__time {
    font-size: $font-size-xs;
    color: $text-color-placeholder;
  }
}

.message-content {
  background: #fff;
  padding: $spacing-md;
  border-radius: $border-radius-md;
  margin-bottom: $spacing-base;
  box-shadow: $shadow-sm;

  &__text {
    font-size: $font-size-base;
    color: $text-color-secondary;
    line-height: 1.8;
  }
}

.replies-section {
  background: #fff;
  padding: $spacing-md;
  border-radius: $border-radius-md;
  box-shadow: $shadow-sm;

  &__title {
    font-size: $font-size-md;
    font-weight: 600;
    color: $text-color;
    margin-bottom: $spacing-md;
    display: block;
  }
}

.reply-item {
  padding: $spacing-sm 0;
  border-bottom: 1rpx solid $border-color-lighter;

  &:last-child {
    border-bottom: none;
  }

  &__name {
    font-size: $font-size-sm;
    font-weight: 600;
    color: $primary-color;
    display: block;
    margin-bottom: $spacing-xs;
  }

  &__content {
    font-size: $font-size-base;
    color: $text-color-secondary;
    display: block;
    margin-bottom: $spacing-xs;
  }

  &__time {
    font-size: $font-size-xs;
    color: $text-color-placeholder;
  }
}

.reply-input {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  background: #fff;
  padding: $spacing-sm $spacing-base;
  padding-bottom: calc($spacing-sm + env(safe-area-inset-bottom));
  border-top: 1rpx solid $border-color-lighter;

  &__field {
    flex: 1;
    margin-right: $spacing-sm;
  }

  &__btn {
    flex-shrink: 0;
  }
}
</style>
