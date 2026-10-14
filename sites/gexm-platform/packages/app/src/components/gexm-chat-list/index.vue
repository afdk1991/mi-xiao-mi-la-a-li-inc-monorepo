/** * 消息列表组件 * 展示对话消息列表，支持滚动加载更多 */
<template>
  <scroll-view
    class="message-list"
    scroll-y
    :scroll-top="scrollTop"
    @scrolltoupper="handleScrollToUpper"
  >
    <!-- 加载更多指示器 -->
    <view v-if="hasMore && isLoading" class="load-more">
      <text class="load-more-text">加载更多...</text>
    </view>

    <!-- 无消息提示 -->
    <view v-if="messages.length === 0 && !isLoading" class="empty-messages">
      <text class="empty-icon">💬</text>
      <text class="empty-text">暂无消息</text>
      <text class="empty-tip">发送消息开始对话吧</text>
    </view>

    <!-- 消息列表 -->
    <view v-for="(message, index) in messages" :key="message.id" class="message-wrapper">
      <gexm-message-item
        :message="message"
        :showSenderName="shouldShowSenderName(index)"
        :otherNickname="getOtherNickname(message)"
        :otherAvatar="getOtherAvatar(message)"
      />
    </view>

    <!-- 底部安全区域 -->
    <view class="safe-area-bottom" />
  </scroll-view>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import GexmMessageItem from '../gexm-message-item/index.vue'

const props = defineProps({
  messages: {
    type: Array,
    default: () => [],
  },
  hasMore: {
    type: Boolean,
    default: false,
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
  conversationType: {
    type: String,
    default: 'private',
  },
  otherNickname: {
    type: String,
    default: '',
  },
  otherAvatar: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['load-more'])

// 滚动位置
const scrollTop = ref(99999)

// 监听消息变化，自动滚动到底部
watch(
  () => props.messages.length,
  async (newLen, oldLen) => {
    if (newLen > oldLen) {
      await nextTick()
      scrollToBottom()
    }
  }
)

// 判断是否需要显示发送者名称（只在消息发送者变化时显示）
function shouldShowSenderName(index) {
  if (props.conversationType === 'ai') return false
  if (index === 0) return true

  const current = props.messages[index]
  const prev = props.messages[index - 1]

  return current.sender_id !== prev.sender_id
}

// 获取其他用户的昵称
function getOtherNickname(message) {
  if (message.sender_id === 'ai_assistant') return 'AI助手'
  if (message.sender_id === 'system') return ''
  return props.otherNickname || '用户'
}

// 获取其他用户的头像
function getOtherAvatar(message) {
  if (message.sender_id === 'ai_assistant' || message.sender_id === 'system') return ''
  return props.otherAvatar
}

// 滚动到底部
function scrollToBottom() {
  scrollTop.value = scrollTop.value + 100
}

// 处理滚动到顶部（加载更多）
function handleScrollToUpper() {
  if (props.hasMore && !props.isLoading) {
    emit('load-more')
  }
}

// 暴露方法给父组件
defineExpose({
  scrollToBottom,
})
</script>

<style lang="scss" scoped>
.message-list {
  flex: 1;
  height: 100%;
  background: #fff;
}

.load-more {
  padding: 24rpx;
  text-align: center;

  .load-more-text {
    font-size: 26rpx;
    color: #909399;
  }
}

.empty-messages {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 24rpx;

  .empty-icon {
    font-size: 80rpx;
    opacity: 0.5;
  }

  .empty-text {
    font-size: 32rpx;
    color: #606266;
    margin-top: 24rpx;
  }

  .empty-tip {
    font-size: 26rpx;
    color: #909399;
    margin-top: 16rpx;
  }
}

.message-wrapper {
  // 消息包装器样式
}

.safe-area-bottom {
  height: 32rpx;
}
</style>
