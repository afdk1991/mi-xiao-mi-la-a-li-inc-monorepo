/** * AI智能助手对话页面 * 与AI进行实时对话交互 */
<template>
  <view class="ai-chat-page">
    <gexm-nav-bar title="AI智能助手" :showBack="true">
      <template #right>
        <text class="nav-icon" @click="clearHistory">🗑️</text>
      </template>
    </gexm-nav-bar>

    <!-- 消息列表 -->
    <gexm-chat-list
      ref="chatListRef"
      :messages="messages"
      :hasMore="hasMore"
      :isLoading="isLoadingMore"
      conversationType="ai"
      @load-more="loadMoreMessages"
    />

    <!-- 输入区域 -->
    <gexm-chat-input
      ref="chatInputRef"
      placeholder="向AI提问..."
      :disabled="chatStore.isSending"
      @send="handleSend"
      @action="handleAction"
    />
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useChatStore } from '../../store/chat'
import { useUserStore } from '../../store/user'
import GexmNavBar from '../../components/gexm-nav-bar/index.vue'
import GexmChatList from '../../components/gexm-chat-list/index.vue'
import GexmChatInput from '../../components/gexm-chat-input/index.vue'

const chatStore = useChatStore()
const userStore = useUserStore()

// 组件引用
const chatListRef = ref(null)
const chatInputRef = ref(null)

// 加载状态
const isLoadingMore = ref(false)

// 轮询 AI 回复的定时器（组件级，需在 onUnmounted 中清理）
let pollInterval = null

/**
 * 清理轮询定时器
 */
function clearPollInterval() {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

// 消息列表
const messages = computed(() => chatStore.messages)

// 是否有更多消息
const hasMore = computed(() => chatStore.hasMoreMessages)

// 初始化
onMounted(async () => {
  // 检查登录状态
  if (!userStore.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    setTimeout(() => {
      uni.navigateTo({ url: '/pages/login/login' })
    }, 1500)
    return
  }

  // 获取或创建AI会话
  try {
    const conversation = await chatStore.getOrCreateAIConversation()
    chatStore.setCurrentConversation(conversation)

    // 加载消息
    await chatStore.fetchMessages(conversation.id)

    // 滚动到底部
    setTimeout(() => {
      chatListRef.value?.scrollToBottom()
    }, 100)
  } catch (e) {
    console.error('初始化AI对话失败:', e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
})

// 清理
onUnmounted(() => {
  // 清理轮询定时器，避免组件卸载后定时器继续执行造成内存泄漏
  clearPollInterval()
})

// 发送消息
async function handleSend(content) {
  if (!content || !content.trim()) return

  // 进入新一轮发送前先清理上一次未完成的轮询
  clearPollInterval()

  try {
    // 发送用户消息
    await chatStore.sendMessage(content)

    // 滚动到底部
    setTimeout(() => {
      chatListRef.value?.scrollToBottom()
    }, 100)

    // 轮询获取AI回复（最多轮询15次，每次间隔800ms）
    let retryCount = 0
    const maxRetries = 15
    pollInterval = setInterval(async () => {
      retryCount++
      if (retryCount > maxRetries) {
        clearPollInterval()
        return
      }

      try {
        // 获取最新消息
        const prevLength = chatStore.messages.length
        await chatStore.fetchMessages(chatStore.currentConversationId)

        // 如果消息数量增加了，说明有新消息
        if (chatStore.messages.length > prevLength) {
          const lastMessage = chatStore.messages[chatStore.messages.length - 1]
          // 如果最后一条是AI发送的，停止轮询
          if (lastMessage && lastMessage.sender_id === 'ai_assistant') {
            clearPollInterval()
            setTimeout(() => {
              chatListRef.value?.scrollToBottom()
            }, 100)
          }
        }
      } catch (e) {
        console.error('轮询AI回复失败:', e)
      }
    }, 800)
  } catch (e) {
    console.error('发送消息失败:', e)
    uni.showToast({ title: '发送失败', icon: 'none' })
  }
}

// 处理更多操作
function handleAction(action) {
  switch (action) {
    case 'image':
      uni.showToast({ title: '图片功能开发中', icon: 'none' })
      break
    case 'file':
      uni.showToast({ title: '文件功能开发中', icon: 'none' })
      break
    case 'location':
      uni.showToast({ title: '位置功能开发中', icon: 'none' })
      break
  }
}

// 加载更多消息
async function loadMoreMessages() {
  if (isLoadingMore.value) return
  isLoadingMore.value = true

  try {
    await chatStore.loadMoreMessages()
  } catch (e) {
    console.error('加载更多失败:', e)
  } finally {
    isLoadingMore.value = false
  }
}

// 清空对话历史
function clearHistory() {
  uni.showModal({
    title: '提示',
    content: '确定要清空对话历史吗？',
    success: (res) => {
      if (res.confirm) {
        chatStore.clearMessages()
        uni.showToast({ title: '已清空', icon: 'success' })
      }
    },
  })
}
</script>

<style lang="scss" scoped>
.ai-chat-page {
  min-height: 100vh;
  background: #fff;
  display: flex;
  flex-direction: column;
}

.nav-icon {
  font-size: 36rpx;
}
</style>
