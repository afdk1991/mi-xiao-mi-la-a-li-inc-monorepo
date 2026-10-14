<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { chatApi, type Conversation, type ChatMessage } from '@/api'
import { ElInput, ElButton, ElScrollbar } from 'element-plus'

const conversations = ref<Conversation[]>([])
const messages = ref<ChatMessage[]>([])
const selectedConversation = ref<Conversation | null>(null)
const inputMessage = ref('')
const messagesContainer = ref<HTMLElement | null>(null)

async function fetchConversations() {
  try {
    conversations.value = await chatApi.getConversations()
  } catch (e) {
    console.error('Failed to fetch conversations:', e)
  }
}

async function selectConversation(conversation: Conversation) {
  selectedConversation.value = conversation
  messages.value = []
  try {
    const result = await chatApi.getMessages(conversation.id, 1, 100)
    messages.value = result.list
    await nextTick()
    scrollToBottom()
  } catch (e) {
    console.error('Failed to fetch messages:', e)
  }
}

async function sendMessage() {
  if (!inputMessage.value.trim() || !selectedConversation.value) return

  const content = inputMessage.value.trim()
  inputMessage.value = ''

  const userMessage: ChatMessage = {
    id: 'temp-' + Date.now(),
    conversationId: selectedConversation.value.id,
    content,
    type: 'text',
    isAI: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  messages.value.push(userMessage)
  await nextTick()
  scrollToBottom()

  try {
    const result = await chatApi.sendMessage(selectedConversation.value.id, { content })
    messages.value.push(result)
    await nextTick()
    scrollToBottom()

    selectedConversation.value.lastMessage = content
    selectedConversation.value.lastMessageTime = new Date().toISOString()
  } catch (e) {
    console.error('Failed to send message:', e)
  }
}

async function createNewConversation() {
  try {
    const newConv = await chatApi.createConversation({ title: '新对话' })
    conversations.value.unshift(newConv)
    selectConversation(newConv)
  } catch (e) {
    console.error('Failed to create conversation:', e)
  }
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } else if (days === 1) {
    return '昨天'
  } else {
    return date.toLocaleDateString('zh-CN')
  }
}

onMounted(() => {
  fetchConversations()
})
</script>

<template>
  <div class="chat-page">
    <div class="chat-sidebar">
      <div class="sidebar-header">
        <h3>消息中心</h3>
        <ElButton type="primary" size="small" @click="createNewConversation">新对话</ElButton>
      </div>
      <div class="conversation-list">
        <div
          v-for="conv in conversations"
          :key="conv.id"
          :class="['conversation-item', { active: selectedConversation?.id === conv.id }]"
          @click="selectConversation(conv)"
        >
          <div class="conv-avatar">
            {{ conv.isAI ? '🤖' : '👤' }}
          </div>
          <div class="conv-info">
            <div class="conv-title">{{ conv.title }}</div>
            <div class="conv-preview">{{ conv.lastMessage || '暂无消息' }}</div>
          </div>
          <div class="conv-meta">
            <div class="conv-time">{{ formatTime(conv.lastMessageTime || conv.createdAt) }}</div>
            <span v-if="conv.unreadCount > 0" class="conv-unread">{{ conv.unreadCount }}</span>
          </div>
        </div>
        <div v-if="conversations.length === 0" class="empty-conversations">
          <div class="empty-icon">💬</div>
          <div class="empty-text">暂无对话</div>
          <ElButton type="primary" @click="createNewConversation">创建对话</ElButton>
        </div>
      </div>
    </div>

    <div class="chat-main">
      <template v-if="selectedConversation">
        <div class="chat-header">
          <div class="chat-title">{{ selectedConversation.title }}</div>
          <div class="chat-subtitle">{{ selectedConversation.isAI ? 'AI 助手' : '用户对话' }}</div>
        </div>

        <ElScrollbar class="messages-container" ref="messagesContainer">
          <div class="messages-list">
            <div
              v-for="msg in messages"
              :key="msg.id"
              :class="['message-item', { 'is-ai': msg.isAI }]"
            >
              <div class="msg-avatar">{{ msg.isAI ? '🤖' : '👤' }}</div>
              <div class="msg-content">
                <div class="msg-text">{{ msg.content }}</div>
                <div class="msg-time">{{ formatTime(msg.createdAt) }}</div>
              </div>
            </div>
            <div v-if="messages.length === 0" class="empty-messages">
              <div class="empty-icon">📝</div>
              <div class="empty-text">开始对话吧</div>
            </div>
          </div>
        </ElScrollbar>

        <div class="chat-input-area">
          <ElInput
            v-model="inputMessage"
            placeholder="输入消息..."
            type="textarea"
            :rows="3"
            @keyup.enter.ctrl="sendMessage"
            resize="none"
          />
          <div class="input-actions">
            <span class="input-hint">Ctrl + Enter 发送</span>
            <ElButton type="primary" @click="sendMessage">发送</ElButton>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="chat-welcome">
          <div class="welcome-icon">👋</div>
          <div class="welcome-title">欢迎来到消息中心</div>
          <div class="welcome-text">选择一个对话或创建新对话开始聊天</div>
        </div>
      </template>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.chat-page {
  display: flex;
  height: 100%;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
}

.chat-sidebar {
  width: 320px;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e4e7ed;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.conversation-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.conversation-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.conversation-item:hover {
  background: #f5f7fa;
}

.conversation-item.active {
  background: #eef2ff;
}

.conv-avatar {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.conv-info {
  flex: 1;
  min-width: 0;
}

.conv-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conv-preview {
  font-size: 12px;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 4px;
}

.conv-meta {
  text-align: right;
}

.conv-time {
  font-size: 12px;
  color: #909399;
}

.conv-unread {
  display: inline-block;
  min-width: 18px;
  height: 18px;
  background: #f56c6c;
  color: #fff;
  font-size: 12px;
  border-radius: 9px;
  text-align: center;
  line-height: 18px;
  margin-top: 4px;
  padding: 0 5px;
}

.empty-conversations {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 14px;
  color: #909399;
  margin-bottom: 20px;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.chat-header {
  padding: 20px 24px;
  border-bottom: 1px solid #e4e7ed;
}

.chat-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.chat-subtitle {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.messages-container {
  flex: 1;
}

.messages-list {
  padding: 24px;
}

.message-item {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.message-item.is-ai {
  flex-direction: row-reverse;
}

.msg-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.message-item:not(.is-ai) .msg-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.message-item.is-ai .msg-avatar {
  background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
}

.msg-content {
  max-width: 60%;
}

.msg-text {
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
}

.message-item:not(.is-ai) .msg-text {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border-bottom-left-radius: 4px;
}

.message-item.is-ai .msg-text {
  background: #f5f7fa;
  color: #303133;
  border-bottom-right-radius: 4px;
}

.msg-time {
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
}

.message-item.is-ai .msg-time {
  text-align: right;
}

.empty-messages {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
}

.chat-input-area {
  padding: 20px 24px;
  border-top: 1px solid #e4e7ed;
}

.chat-input-area :deep(.el-textarea__inner) {
  border-radius: 12px;
  resize: none;
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}

.input-hint {
  font-size: 12px;
  color: #909399;
}

.chat-welcome {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.welcome-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.welcome-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.welcome-text {
  font-size: 14px;
  color: #909399;
}
</style>
