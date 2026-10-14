/** * 会话列表页面 * 展示用户的所有对话会话，包括AI助手、其他用户对话等 */
<template>
  <view class="conversations-page">
    <gexm-nav-bar title="消息">
      <template #right>
        <text class="nav-icon" @click="createNewConversation">✏️</text>
      </template>
    </gexm-nav-bar>

    <scroll-view class="conversations-list" scroll-y @scrolltolower="loadMore">
      <!-- 无会话提示 -->
      <view v-if="!chatStore.hasConversations && !isLoading" class="empty-conversations">
        <text class="empty-icon">💬</text>
        <text class="empty-text">暂无对话</text>
        <text class="empty-tip">点击右上角发起新对话</text>

        <!-- 快捷入口 -->
        <view class="quick-actions">
          <gexm-button type="primary" @click="startAIChat">与AI助手对话</gexm-button>
        </view>
      </view>

      <!-- 会话列表 -->
      <view
        v-for="conversation in conversations"
        :key="conversation.id"
        class="conversation-item"
        @click="openConversation(conversation)"
      >
        <!-- AI会话 -->
        <view v-if="conversation.type === 'ai'" class="conversation-avatar ai-avatar">
          <text>🤖</text>
        </view>
        <!-- 系统会话 -->
        <view v-else-if="conversation.type === 'system'" class="conversation-avatar system-avatar">
          <text>📢</text>
        </view>
        <!-- 普通用户会话 -->
        <view v-else class="conversation-avatar user-avatar">
          <image
            v-if="conversation.participant_avatar"
            :src="conversation.participant_avatar"
            class="avatar-image"
          />
          <text v-else>{{ getDisplayName(conversation).charAt(0) }}</text>
        </view>

        <view class="conversation-content">
          <view class="conversation-header">
            <text class="conversation-name">{{ getDisplayName(conversation) }}</text>
            <text class="conversation-time">{{ formatTime(conversation.last_message_at) }}</text>
          </view>
          <view class="conversation-footer">
            <text class="conversation-message">{{ conversation.last_message || '暂无消息' }}</text>
          </view>
        </view>
      </view>

      <!-- 加载更多 -->
      <view v-if="isLoading" class="loading-indicator">
        <text>加载中...</text>
      </view>
      <view v-if="!hasMore && chatStore.hasConversations" class="no-more">
        <text>没有更多了</text>
      </view>
    </scroll-view>

    <!-- 底部固定对话入口 -->
    <view class="fixed-chat-actions">
      <view class="chat-action-btn" @click="startAIChat">
        <view class="action-icon ai-icon">🤖</view>
        <text class="action-text">AI助手</text>
      </view>
      <view class="chat-action-btn" @click="createNewConversation">
        <view class="action-icon new-icon">✏️</view>
        <text class="action-text">新对话</text>
      </view>
      <view class="chat-action-btn" @click="goComments">
        <view class="action-icon comment-icon">💬</view>
        <text class="action-text">留言板</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useChatStore } from '../../store/chat'
import GexmNavBar from '../../components/gexm-nav-bar/index.vue'
import GexmButton from '../../components/gexm-button/index.vue'

const chatStore = useChatStore()

// 加载状态
const isLoading = ref(false)
const hasMore = computed(() => {
  return chatStore.conversations.length < chatStore.conversationsTotal
})

// 会话列表
const conversations = computed(() => chatStore.conversations)

// 初始化
onMounted(async () => {
  await loadConversations()
})

// 加载会话列表
async function loadConversations() {
  if (isLoading.value) return
  isLoading.value = true

  try {
    await chatStore.fetchConversations()
  } catch (e) {
    console.error('加载会话失败:', e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    isLoading.value = false
  }
}

// 加载更多
async function loadMore() {
  if (!hasMore.value || isLoading.value) return
  isLoading.value = true

  try {
    await chatStore.fetchConversations(chatStore.conversationsPage + 1)
  } catch (e) {
    console.error('加载更多失败:', e)
  } finally {
    isLoading.value = false
  }
}

// 获取会话显示名称
function getDisplayName(conversation) {
  if (conversation.type === 'ai') return 'AI智能助手'
  if (conversation.type === 'system') return '系统通知'
  return conversation.title || conversation.participant_nickname || '匿名用户'
}

// 格式化时间
function formatTime(dateStr) {
  if (!dateStr) return ''

  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date

  // 一小时内
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000))
    return minutes <= 1 ? '刚刚' : `${minutes}分钟前`
  }

  // 一天内
  if (diff < 24 * 60 * 60 * 1000) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  // 一周内
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return weekdays[date.getDay()]
  }

  // 超过一周
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

// 打开会话
function openConversation(conversation) {
  chatStore.setCurrentConversation(conversation)

  // 根据会话类型跳转不同页面
  if (conversation.type === 'ai') {
    uni.navigateTo({ url: '/pages/chat/ai-chat' })
  } else {
    uni.navigateTo({ url: `/pages/chat/chat?id=${conversation.id}` })
  }
}

// 创建新对话
function createNewConversation() {
  uni.showToast({ title: '功能开发中', icon: 'none' })
}

// 开始AI对话
async function startAIChat() {
  try {
    const conversation = await chatStore.getOrCreateAIConversation()
    chatStore.setCurrentConversation(conversation)
    uni.navigateTo({ url: '/pages/chat/ai-chat' })
  } catch (e) {
    console.error('创建AI对话失败:', e)
    uni.showToast({ title: '创建失败', icon: 'none' })
  }
}

// 跳转留言板
function goComments() {
  uni.navigateTo({ url: '/pages/comments/comments' })
}
</script>

<style lang="scss" scoped>
.conversations-page {
  min-height: 100vh;
  background: #f5f7fa;
  display: flex;
  flex-direction: column;
}

.nav-icon {
  font-size: 36rpx;
}

.conversations-list {
  flex: 1;
  height: 0;
  padding-bottom: 120rpx; // 为底部按钮留空间
}

.empty-conversations {
  display: flex;
  flex-direction: column;
  align-items: center;
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

  .quick-actions {
    margin-top: 48rpx;
    width: 100%;
    padding: 0 48rpx;
  }
}

.conversation-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background: #fff;
  margin-bottom: 2rpx;

  &:active {
    background: #f5f7fa;
  }
}

.conversation-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  font-weight: bold;
  flex-shrink: 0;
  margin-right: 24rpx;

  .avatar-image {
    width: 100%;
    height: 100%;
    border-radius: 16rpx;
  }
}

.ai-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.system-avatar {
  background: #e6a23c;
  color: #fff;
}

.user-avatar {
  background: $uni-color-primary;
  color: #fff;
}

.conversation-content {
  flex: 1;
  min-width: 0;
}

.conversation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.conversation-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-time {
  font-size: 24rpx;
  color: #909399;
}

.conversation-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12rpx;
}

.conversation-message {
  font-size: 26rpx;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.unread-badge {
  min-width: 36rpx;
  height: 36rpx;
  background: #f56c6c;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8rpx;

  text {
    font-size: 22rpx;
    color: #fff;
  }
}

.loading-indicator,
.no-more {
  padding: 24rpx;
  text-align: center;

  text {
    font-size: 26rpx;
    color: #909399;
  }
}

// 底部固定对话入口
.fixed-chat-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  padding: 24rpx;
  background: #fff;
  border-top: 1rpx solid #ebeef5;
  box-shadow: 0 -2rpx 12rpx 0 rgba(0, 0, 0, 0.05);
}

.chat-action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;

  .action-icon {
    width: 72rpx;
    height: 72rpx;
    border-radius: 20rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32rpx;
  }

  .ai-icon {
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  }

  .new-icon {
    background: rgba(64, 158, 255, 0.1);
  }

  .comment-icon {
    background: rgba(103, 194, 58, 0.1);
  }

  .action-text {
    font-size: 24rpx;
    color: #606266;
    margin-top: 8rpx;
  }
}
</style>
