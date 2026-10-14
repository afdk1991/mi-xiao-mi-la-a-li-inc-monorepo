<template>
  <view class="page">
    <view class="tabs">
      <text
        v-for="(t, i) in tabs"
        :key="t"
        class="tab"
        :class="{ active: i === activeTab }"
        @tap="activeTab = i"
      >{{ t }}</text>
    </view>

    <view v-if="loading" class="loading">加载中…</view>
    <view v-else-if="error" class="loading">
      <text class="err-text">内容加载失败</text>
      <view class="retry" @tap="load">重新加载</view>
    </view>
    <view v-else-if="posts.length === 0" class="loading">暂无内容</view>
    <view v-else>
      <view v-for="p in posts" :key="p.id" class="post">
        <view class="head">
          <view class="avatar" :style="{ background: p.avatarColor }">{{ p.author.slice(0, 1) }}</view>
          <view class="meta">
            <text class="name">{{ p.author }}</text>
            <text class="time">{{ p.time }}</text>
          </view>
        </view>
        <text class="content">{{ p.content }}</text>
        <view class="cover" :style="{ background: p.imageColor }"></view>
        <view class="actions">
          <text class="act" :class="{ liked: isLiked(p.id) }" @tap="like(p)">👍 {{ displayLikes(p) }}</text>
          <text class="act" @tap="openComment(p)">💬 {{ displayComments(p) }}</text>
          <text class="act" @tap="share(p)">↗ 分享</text>
        </view>
        <view v-if="commentsOf(p.id).length" class="comment-list">
          <view v-for="(c, i) in commentsOf(p.id)" :key="i" class="cmt">
            <text class="cmt-user">我：</text>
            <text class="cmt-text">{{ c }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 评论输入框 -->
    <view v-if="commentTarget" class="mask" @tap="closeComment"></view>
    <view v-if="commentTarget" class="comment-bar">
      <input v-model="commentText" class="c-input" placeholder="友善评论…" focus confirm-type="send" @confirm="sendComment" />
      <view class="c-send" @tap="sendComment">发送</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { fetchPosts } from '../../api';
import type { Post } from '../../api/types';
import { communityStore } from '../../store/community';

const tabs = ['推荐', '热门', '最新'];
const activeTab = ref(0);
const raw = ref<Post[]>([]);
const loading = ref(true);
const error = ref(false);
const commentTarget = ref<Post | null>(null);
const commentText = ref('');

/** 「最新」排序用：把「10 分钟前 / 3 小时前 / 昨天」这类相对时间折算成分钟 */
function minutesAgo(time: string): number {
  const s = time || '';
  const m = s.match(/(\d+)\s*(分钟|小时|天|周)/);
  if (m) {
    const n = Number(m[1]);
    const unit = m[2];
    if (unit === '分钟') return n;
    if (unit === '小时') return n * 60;
    if (unit === '天') return n * 1440;
    return n * 10080;
  }
  if (s.includes('刚刚')) return 0;
  if (s.includes('昨天')) return 1440;
  if (s.includes('前天')) return 2880;
  return Number.MAX_SAFE_INTEGER;
}

const posts = computed<Post[]>(() => {
  const list = [...raw.value];
  if (activeTab.value === 1) return list.sort((a, b) => b.likes - a.likes);
  if (activeTab.value === 2) return list.sort((a, b) => minutesAgo(a.time) - minutesAgo(b.time));
  return list;
});

async function load() {
  loading.value = true;
  error.value = false;
  try {
    const res = await fetchPosts();
    raw.value = res.data || [];
  } catch {
    raw.value = [];
    error.value = true;
  } finally {
    loading.value = false;
  }
}

function isLiked(id: string) { return communityStore.isLiked(id); }
function displayLikes(p: Post) { return p.likes + (isLiked(p.id) ? 1 : 0); }
function displayComments(p: Post) { return p.comments + commentsOf(p.id).length; }
function commentsOf(id: string) { return communityStore.commentsOf(id); }

function like(p: Post) {
  communityStore.toggleLike(p.id);
}
function openComment(p: Post) {
  commentTarget.value = p;
  commentText.value = '';
}
function closeComment() {
  commentTarget.value = null;
  commentText.value = '';
}
function sendComment() {
  if (!commentTarget.value) return;
  const t = commentText.value.trim();
  if (!t) {
    uni.showToast({ title: '评论内容不能为空', icon: 'none' });
    return;
  }
  communityStore.addComment(commentTarget.value.id, t);
  closeComment();
  uni.showToast({ title: '已发布', icon: 'success' });
}
function share(p: Post) {
  const link = `https://appsp.example.com/post/${p.id}`;
  uni.setClipboardData({
    data: link,
    success: () => uni.showToast({ title: '链接已复制', icon: 'none' }),
    fail: () => uni.showToast({ title: '复制失败', icon: 'none' }),
  });
}

onMounted(load);
</script>

<style scoped>
.page { padding: 16rpx 24rpx 40rpx; }
.tabs { display: flex; gap: 32rpx; padding: 12rpx 0 24rpx; }
.tab { font-size: 30rpx; color: #666; padding-bottom: 8rpx; }
.tab.active { color: #222; font-weight: 700; border-bottom: 4rpx solid #FF5A1F; }
.loading { text-align: center; color: #999; padding: 120rpx 0; }
.err-text { display: block; font-size: 26rpx; }
.retry { display: inline-block; margin-top: 24rpx; padding: 14rpx 40rpx; background: #FF5A1F; color: #fff; border-radius: 32rpx; font-size: 26rpx; }
.post { background: #fff; border-radius: 20rpx; padding: 24rpx; margin-bottom: 20rpx; }
.head { display: flex; align-items: center; gap: 16rpx; margin-bottom: 16rpx; }
.avatar { width: 72rpx; height: 72rpx; border-radius: 50%; color: #fff; font-size: 30rpx; display: flex; align-items: center; justify-content: center; font-weight: 600; }
.meta { display: flex; flex-direction: column; }
.name { font-size: 28rpx; color: #222; font-weight: 600; }
.time { font-size: 22rpx; color: #999; margin-top: 4rpx; }
.content { font-size: 28rpx; color: #333; line-height: 1.6; display: block; }
.cover { height: 300rpx; border-radius: 16rpx; margin: 16rpx 0; }
.actions { display: flex; gap: 40rpx; }
.act { font-size: 26rpx; color: #888; }
.act.liked { color: #FF5A1F; }
.comment-list { margin-top: 16rpx; padding-top: 16rpx; border-top: 1rpx solid #f5f5f5; }
.cmt { font-size: 24rpx; line-height: 1.6; padding: 6rpx 0; }
.cmt-user { color: #FF5A1F; }
.cmt-text { color: #555; }
.mask { position: fixed; left: 0; right: 0; top: 0; bottom: 0; background: rgba(0,0,0,.35); z-index: 8; }
.comment-bar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 9; display: flex; gap: 16rpx; padding: 16rpx 24rpx; background: #fff; border-top: 1rpx solid #eee; }
.c-input { flex: 1; height: 72rpx; background: #f2f3f5; border-radius: 36rpx; padding: 0 24rpx; font-size: 26rpx; }
.c-send { background: #FF5A1F; color: #fff; padding: 0 28rpx; height: 72rpx; line-height: 72rpx; border-radius: 36rpx; font-size: 26rpx; }
</style>