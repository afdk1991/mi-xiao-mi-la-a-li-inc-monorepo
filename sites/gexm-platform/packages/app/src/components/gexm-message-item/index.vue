/** * 消息项组件 * 用于展示单条消息，支持不同类型（文本、图片、系统消息等） */
<template>
  <view class="message-item" :class="messageClass">
    <!-- 系统消息 -->
    <view v-if="message.type === 'system'" class="message-system">
      <text class="system-text">{{ message.content }}</text>
    </view>

    <!-- AI助手消息 -->
    <view v-else-if="message.sender_id === 'ai_assistant'" class="message-ai">
      <view class="message-avatar ai-avatar">
        <text>🤖</text>
      </view>
      <view class="message-content-wrapper">
        <view class="message-sender-name">
          <text>AI助手</text>
        </view>
        <view class="message-content">
          <text class="message-text">{{ message.content }}</text>
          <text class="message-time">{{ formatTime(message.created_at) }}</text>
        </view>
      </view>
    </view>

    <!-- 用户自己的消息（右侧） -->
    <view v-else-if="isSelf" class="message-self">
      <view class="message-content-wrapper">
        <view class="message-content self-content">
          <text class="message-text">{{ message.content }}</text>
          <view class="message-meta">
            <text class="message-time">{{ formatTime(message.created_at) }}</text>
            <view class="message-status">
              <text v-if="message.status === 'sent'">✓</text>
              <text v-else-if="message.status === 'read'" style="color: #409eff">✓✓</text>
            </view>
          </view>
        </view>
      </view>
      <view class="message-avatar">
        <image v-if="userAvatar" :src="userAvatar" class="avatar-image" />
        <text v-else>{{ userNickname?.charAt(0) || 'G' }}</text>
      </view>
    </view>

    <!-- 其他用户消息（左侧） -->
    <view v-else class="message-other">
      <view class="message-avatar">
        <image v-if="otherAvatar" :src="otherAvatar" class="avatar-image" />
        <text v-else>{{ otherNickname?.charAt(0) || 'U' }}</text>
      </view>
      <view class="message-content-wrapper">
        <view v-if="showSenderName" class="message-sender-name">
          <text>{{ otherNickname || '用户' }}</text>
        </view>
        <view class="message-content">
          <text class="message-text">{{ message.content }}</text>
          <text class="message-time">{{ formatTime(message.created_at) }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { useUserStore } from '../../store/user'

const props = defineProps({
  message: {
    type: Object,
    required: true,
  },
  showSenderName: {
    type: Boolean,
    default: true,
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

const userStore = useUserStore()

// 是否为自己发送的消息
const isSelf = computed(() => {
  return props.message.sender_id === userStore.userId
})

// 用户头像
const userAvatar = computed(() => userStore.avatar)

// 用户昵称
const userNickname = computed(() => userStore.nickname || userStore.username)

// 消息样式类
const messageClass = computed(() => {
  if (props.message.type === 'system') return 'is-system'
  if (props.message.sender_id === 'ai_assistant') return 'is-ai'
  return isSelf.value ? 'is-self' : 'is-other'
})

// 格式化时间
function formatTime(dateStr) {
  if (!dateStr) return ''

  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date

  // 一天内显示时间
  if (diff < 24 * 60 * 60 * 1000) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  // 一周内显示日期时间
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return `${weekdays[date.getDay()]} ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
  }

  // 超过一周显示完整日期
  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<style lang="scss" scoped>
.message-item {
  padding: 16rpx 24rpx;
  margin-bottom: 8rpx;
}

// 系统消息
.message-system {
  text-align: center;
  padding: 24rpx;

  .system-text {
    font-size: 24rpx;
    color: #909399;
    background: #f5f7fa;
    padding: 8rpx 24rpx;
    border-radius: 8rpx;
  }
}

// AI消息
.message-ai {
  display: flex;
  align-items: flex-start;

  .message-avatar {
    margin-right: 16rpx;
  }

  .ai-avatar {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
  }

  .message-content-wrapper {
    flex: 1;
    max-width: 70%;
  }

  .message-sender-name {
    font-size: 24rpx;
    color: #667eea;
    margin-bottom: 8rpx;
  }

  .message-content {
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
    border-radius: 16rpx 16rpx 16rpx 4rpx;
    padding: 20rpx 24rpx;
  }
}

// 自己的消息
.message-self {
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;

  .message-content-wrapper {
    flex: 1;
    display: flex;
    justify-content: flex-end;
    max-width: 70%;
  }

  .message-avatar {
    margin-left: 16rpx;
    background: $uni-color-primary;
    color: #fff;
  }

  .self-content {
    background: $uni-color-primary;
    color: #fff;
    border-radius: 16rpx 16rpx 4rpx 16rpx;

    .message-text {
      color: #fff;
    }

    .message-time {
      color: rgba(255, 255, 255, 0.8);
    }

    .message-meta {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      margin-top: 8rpx;

      .message-status {
        margin-left: 8rpx;
        font-size: 20rpx;
      }
    }
  }
}

// 其他用户消息
.message-other {
  display: flex;
  align-items: flex-start;

  .message-avatar {
    margin-right: 16rpx;
    background: #f5f7fa;
    color: #606266;
  }

  .message-content-wrapper {
    flex: 1;
    max-width: 70%;
  }

  .message-sender-name {
    font-size: 24rpx;
    color: #606266;
    margin-bottom: 8rpx;
  }

  .message-content {
    background: #f5f7fa;
    border-radius: 16rpx 16rpx 16rpx 4rpx;
  }
}

// 公共样式
.message-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: bold;
  flex-shrink: 0;

  .avatar-image {
    width: 100%;
    height: 100%;
    border-radius: 12rpx;
  }
}

.message-content {
  padding: 20rpx 24rpx;
}

.message-text {
  font-size: 30rpx;
  line-height: 1.5;
  color: #303133;
  word-break: break-all;
}

.message-time {
  font-size: 22rpx;
  color: #909399;
  margin-top: 8rpx;
}
</style>
