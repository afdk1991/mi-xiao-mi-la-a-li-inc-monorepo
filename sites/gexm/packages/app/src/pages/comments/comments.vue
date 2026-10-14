/** * 留言板页面 * 用户可以发表评论、查看他人留言、点赞互动 */
<template>
  <view class="comments-page">
    <gexm-nav-bar title="留言板">
      <template #right>
        <text class="nav-icon" @click="showPostModal">✏️</text>
      </template>
    </gexm-nav-bar>

    <scroll-view class="comments-list" scroll-y @scrolltolower="loadMore">
      <!-- 无留言提示 -->
      <view v-if="comments.length === 0 && !isLoading" class="empty-comments">
        <text class="empty-icon">💬</text>
        <text class="empty-text">暂无留言</text>
        <text class="empty-tip">点击右上角发表第一条留言</text>
      </view>

      <!-- 留言列表 -->
      <view v-for="comment in comments" :key="comment.id" class="comment-item">
        <!-- 用户头像 -->
        <view class="comment-avatar">
          <image v-if="comment.user_avatar" :src="comment.user_avatar" class="avatar-image" />
          <text v-else>{{ (comment.user_nickname || '匿名').charAt(0) }}</text>
        </view>

        <!-- 留言内容 -->
        <view class="comment-content">
          <view class="comment-header">
            <text class="comment-username">{{ comment.user_nickname || '匿名用户' }}</text>
            <text class="comment-time">{{ formatTime(comment.created_at) }}</text>
          </view>

          <text class="comment-text">{{ comment.content }}</text>

          <!-- 留言操作 -->
          <view class="comment-actions">
            <view
              class="action-item"
              role="button"
              aria-label="点赞"
              @click="likeComment(comment.id)"
            >
              <text class="action-icon">👍</text>
              <text class="action-count">{{ comment.likes || 0 }}</text>
            </view>
            <view class="action-item" role="button" aria-label="回复" @click="replyTo(comment)">
              <text class="action-icon">💬</text>
              <text class="action-count">{{ comment.reply_count || 0 }}</text>
            </view>
          </view>

          <!-- 回复列表（展开时显示） -->
          <view v-if="comment.showReplies && comment.replies?.length" class="reply-list">
            <view v-for="reply in comment.replies" :key="reply.id" class="reply-item">
              <view class="reply-avatar">
                <text>{{ (reply.user_nickname || '匿名').charAt(0) }}</text>
              </view>
              <view class="reply-content">
                <text class="reply-username">{{ reply.user_nickname || '匿名' }}</text>
                <text class="reply-text">{{ reply.content }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 加载更多 -->
      <view v-if="isLoading" class="loading-indicator">
        <text>加载中...</text>
      </view>
      <view v-if="!hasMore && comments.length > 0" class="no-more">
        <text>没有更多了</text>
      </view>
    </scroll-view>

    <!-- 发表留言弹窗 -->
    <view v-if="showModal" class="post-modal">
      <view class="modal-mask" @click="hidePostModal" />
      <view class="modal-content">
        <view class="modal-header">
          <text class="modal-title">发表留言</text>
          <text class="modal-close" @click="hidePostModal">×</text>
        </view>
        <textarea
          v-model="newCommentContent"
          class="modal-input"
          placeholder="写下你的留言..."
          :maxlength="500"
          auto-height
        ></textarea>
        <view class="modal-footer">
          <gexm-button type="default" size="normal" @click="hidePostModal">取消</gexm-button>
          <gexm-button type="primary" size="normal" :disabled="!canPost" @click="postComment">
            发表
          </gexm-button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useCommentStore } from '../../store/comment'
import { useUserStore } from '../../store/user'
import GexmNavBar from '../../components/gexm-nav-bar/index.vue'
import GexmButton from '../../components/gexm-button/index.vue'

const commentStore = useCommentStore()
const userStore = useUserStore()

// 加载状态
const isLoading = ref(false)

// 评论列表
const comments = computed(() => commentStore.comments)

// 是否有更多
const hasMore = computed(() => {
  return commentStore.comments.length < commentStore.commentsTotal
})

// 弹窗显示状态
const showModal = ref(false)

// 新留言内容
const newCommentContent = ref('')

// 回复对象
const replyTarget = ref(null)

// 是否可以发表
const canPost = computed(() => {
  return newCommentContent.value.trim().length > 0
})

// 初始化
onMounted(async () => {
  await loadComments()
})

// 加载留言列表
async function loadComments() {
  if (isLoading.value) return
  isLoading.value = true

  try {
    await commentStore.fetchComments('global')
  } catch (e) {
    console.error('加载留言失败:', e)
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
    await commentStore.fetchComments(
      'global',
      null,
      Math.ceil(commentStore.comments.length / 20) + 1
    )
  } catch (e) {
    console.error('加载更多失败:', e)
  } finally {
    isLoading.value = false
  }
}

// 格式化时间
function formatTime(dateStr) {
  if (!dateStr) return ''

  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date

  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000))
    return minutes <= 1 ? '刚刚' : `${minutes}分钟前`
  }

  if (diff < 24 * 60 * 60 * 1000) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000))
    return `${days}天前`
  }

  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

// 点赞
async function likeComment(commentId) {
  try {
    await commentStore.likeComment(commentId)
  } catch (e) {
    console.error('点赞失败:', e)
    uni.showToast({ title: '点赞失败', icon: 'none' })
  }
}

// 回复
function replyTo(comment) {
  replyTarget.value = comment
  showModal.value = true
}

// 显示发表弹窗
function showPostModal() {
  if (!userStore.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }

  replyTarget.value = null
  newCommentContent.value = ''
  showModal.value = true
}

// 隐藏发表弹窗
function hidePostModal() {
  showModal.value = false
  newCommentContent.value = ''
  replyTarget.value = null
}

// 发表留言
async function postComment() {
  if (!canPost.value) return

  try {
    const data = {
      targetType: 'global',
      content: newCommentContent.value.trim(),
    }

    if (replyTarget.value) {
      data.parentId = replyTarget.value.id
    }

    await commentStore.postComment(data)
    hidePostModal()
    uni.showToast({ title: '发表成功', icon: 'success' })
  } catch (e) {
    console.error('发表留言失败:', e)
    uni.showToast({ title: '发表失败', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
.comments-page {
  min-height: 100vh;
  background: #f5f7fa;
  display: flex;
  flex-direction: column;
}

.nav-icon {
  font-size: 36rpx;
}

.comments-list {
  flex: 1;
  height: 0;
}

.empty-comments {
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
}

.comment-item {
  display: flex;
  padding: 24rpx;
  background: #fff;
  margin-bottom: 2rpx;
}

.comment-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 16rpx;
  background: $uni-color-primary;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: bold;
  flex-shrink: 0;
  margin-right: 20rpx;

  .avatar-image {
    width: 100%;
    height: 100%;
    border-radius: 16rpx;
  }
}

.comment-content {
  flex: 1;
  min-width: 0;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.comment-username {
  font-size: 28rpx;
  font-weight: 600;
  color: #303133;
}

.comment-time {
  font-size: 24rpx;
  color: #909399;
}

.comment-text {
  font-size: 30rpx;
  color: #606266;
  line-height: 1.6;
  margin-top: 12rpx;
}

.comment-actions {
  display: flex;
  margin-top: 16rpx;
}

.action-item {
  display: flex;
  align-items: center;
  padding: 8rpx 24rpx;
  margin-right: 24rpx;

  &:active {
    opacity: 0.7;
  }

  .action-icon {
    font-size: 28rpx;
  }

  .action-count {
    font-size: 24rpx;
    color: #909399;
    margin-left: 8rpx;
  }
}

.reply-list {
  margin-top: 16rpx;
  padding: 16rpx;
  background: #f5f7fa;
  border-radius: 12rpx;
}

.reply-item {
  display: flex;
  padding: 12rpx 0;
}

.reply-avatar {
  width: 48rpx;
  height: 48rpx;
  border-radius: 8rpx;
  background: #c0c4cc;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  margin-right: 12rpx;
}

.reply-content {
  flex: 1;
}

.reply-username {
  font-size: 24rpx;
  color: #409eff;
  margin-right: 8rpx;
}

.reply-text {
  font-size: 26rpx;
  color: #606266;
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

// 发表留言弹窗
.post-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
}

.modal-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
}

.modal-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 32rpx;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.modal-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #303133;
}

.modal-close {
  font-size: 48rpx;
  color: #909399;
}

.modal-input {
  width: 100%;
  min-height: 160rpx;
  padding: 24rpx;
  background: #f5f7fa;
  border-radius: 16rpx;
  font-size: 30rpx;
  color: #303133;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 24rpx;
  margin-top: 24rpx;
}
</style>
