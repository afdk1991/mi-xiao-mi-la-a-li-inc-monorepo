/** * 普通对话页面 * 用于用户间或客服对话 */
<template>
  <view class="chat-page">
    <gexm-nav-bar :title="conversationTitle" :showBack="true">
      <template #right>
        <text class="nav-icon" @click="showConversationInfo">ℹ️</text>
      </template>
    </gexm-nav-bar>

    <!-- 消息列表 -->
    <gexm-chat-list
      ref="chatListRef"
      :messages="messages"
      :hasMore="hasMore"
      :isLoading="isLoadingMore"
      :conversationType="conversationType"
      :otherNickname="otherNickname"
      :otherAvatar="otherAvatar"
      @load-more="loadMoreMessages"
    />

    <!-- 输入区域 -->
    <gexm-chat-input
      ref="chatInputRef"
      :placeholder="inputPlaceholder"
      :disabled="chatStore.isSending"
      @send="handleSend"
      @action="handleAction"
    />
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useChatStore } from '../../store/chat'
import { useUserStore } from '../../store/user'
import { uploadApi } from '../../api/upload'
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

// 会话ID（从URL参数获取）
const conversationId = ref(null)

// 消息列表
const messages = computed(() => chatStore.messages)

// 是否有更多消息
const hasMore = computed(() => chatStore.hasMoreMessages)

// 会话类型
const conversationType = computed(() => chatStore.currentConversationType || 'private')

// 会话标题
const conversationTitle = computed(() => {
  if (chatStore.currentConversation) {
    return chatStore.currentConversation.title || '对话'
  }
  return '对话'
})

// 输入框占位符
const inputPlaceholder = computed(() => {
  switch (conversationType.value) {
    case 'ai':
      return '向AI提问...'
    case 'system':
      return '暂不支持发送消息'
    default:
      return '输入消息...'
  }
})

// 其他用户昵称
const otherNickname = computed(() => {
  if (chatStore.currentConversation) {
    return chatStore.currentConversation.participant_nickname || '用户'
  }
  return ''
})

// 其他用户头像
const otherAvatar = computed(() => {
  if (chatStore.currentConversation) {
    return chatStore.currentConversation.participant_avatar || ''
  }
  return ''
})

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

  // 获取会话ID
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  conversationId.value = currentPage.options?.id

  // 如果没有会话ID，从store获取当前会话
  if (!conversationId.value && chatStore.currentConversationId) {
    conversationId.value = chatStore.currentConversationId
  }

  // 加载消息
  if (conversationId.value) {
    try {
      await chatStore.fetchMessages(conversationId.value)
      setTimeout(() => {
        chatListRef.value?.scrollToBottom()
      }, 100)
    } catch (e) {
      console.error('加载消息失败:', e)
      uni.showToast({ title: '加载失败', icon: 'none' })
    }
  } else {
    uni.showToast({ title: '会话不存在', icon: 'none' })
  }
})

// 发送消息
async function handleSend(content) {
  if (!content || !content.trim()) return

  try {
    await chatStore.sendMessage(content)
    setTimeout(() => {
      chatListRef.value?.scrollToBottom()
    }, 100)
  } catch (e) {
    console.error('发送消息失败:', e)
    uni.showToast({ title: '发送失败', icon: 'none' })
  }
}

// 处理更多操作
function handleAction(action) {
  switch (action) {
    case 'image':
      handleChooseImage()
      break
    case 'file':
      uni.showToast({ title: '文件功能开发中', icon: 'none' })
      break
    case 'location':
      handleChooseLocation()
      break
  }
}

// 选择并上传图片，然后发送图片消息
function handleChooseImage() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    success: async (res) => {
      const tempFilePath = res.tempFilePaths && res.tempFilePaths[0]
      if (!tempFilePath) return

      uni.showLoading({ title: '发送中...', mask: true })
      try {
        // 上传图片，复用 upload.js 中已实现的图片压缩逻辑
        const uploaded = await uploadApi.uploadImage(tempFilePath)
        const imageUrl = uploaded && (uploaded.url || uploaded.path || uploaded)
        if (!imageUrl || typeof imageUrl !== 'string') {
          throw new Error('上传返回的图片地址无效')
        }

        // 发送图片消息
        await chatStore.sendMessage(imageUrl, 'image')
        setTimeout(() => {
          chatListRef.value?.scrollToBottom()
        }, 100)
      } catch (e) {
        console.error('发送图片消息失败:', e)
        uni.showToast({ title: e.message || '图片发送失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
    fail: (err) => {
      // 用户取消选择不提示错误
      if (err && err.errMsg && err.errMsg.indexOf('cancel') === -1) {
        uni.showToast({ title: '选择图片失败', icon: 'none' })
      }
    },
  })
}

// 选择位置并发送位置消息
function handleChooseLocation() {
  uni.chooseLocation({
    success: async (res) => {
      const { name, address, latitude, longitude } = res
      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        uni.showToast({ title: '位置信息无效', icon: 'none' })
        return
      }

      uni.showLoading({ title: '发送中...', mask: true })
      try {
        // 将位置信息序列化为 JSON 字符串作为消息内容
        const locationContent = JSON.stringify({
          name: name || '',
          address: address || '',
          latitude,
          longitude,
        })

        await chatStore.sendMessage(locationContent, 'location')
        setTimeout(() => {
          chatListRef.value?.scrollToBottom()
        }, 100)
      } catch (e) {
        console.error('发送位置消息失败:', e)
        uni.showToast({ title: e.message || '位置发送失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
    fail: (err) => {
      // 用户取消选择不提示错误
      if (err && err.errMsg && err.errMsg.indexOf('cancel') === -1) {
        uni.showToast({ title: '获取位置失败', icon: 'none' })
      }
    },
  })
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

// 显示会话信息
function showConversationInfo() {
  uni.showToast({ title: '会话信息功能开发中', icon: 'none' })
}
</script>

<style lang="scss" scoped>
.chat-page {
  min-height: 100vh;
  background: #fff;
  display: flex;
  flex-direction: column;
}

.nav-icon {
  font-size: 36rpx;
}
</style>
