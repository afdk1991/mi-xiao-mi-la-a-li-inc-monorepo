<template>
  <view class="page">
    <view class="editor">
      <textarea v-model="draft" class="ta" placeholder="记录点什么…" />
      <view class="save" @tap="save">保存笔记</view>
    </view>

    <view class="list-title">全部笔记（{{ list.length }}）</view>
    <view v-if="list.length === 0" class="empty">还没有笔记</view>
    <view v-else>
      <view v-for="n in list" :key="n.id" class="note">
        <text class="content">{{ n.content }}</text>
        <view class="meta">
          <text class="time">{{ formatTime(n.updatedAt) }}</text>
          <text class="del" @tap="remove(n.id)">删除</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { noteStore, type Note } from '../../store/note';

const draft = ref('');
const list = ref<Note[]>([]);

onShow(() => { list.value = [...noteStore.state.list]; });

function save() {
  if (!draft.value.trim()) return uni.showToast({ title: '内容为空', icon: 'none' });
  noteStore.add(draft.value);
  draft.value = '';
  list.value = [...noteStore.state.list];
  uni.showToast({ title: '已保存', icon: 'success' });
}
function remove(id: string) {
  noteStore.remove(id);
  list.value = [...noteStore.state.list];
}
function formatTime(ts: number) {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}-${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
</script>

<style scoped>
.page { padding: 16rpx 24rpx 40rpx; min-height: 100vh; }
.editor { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 24rpx; }
.ta { width: 100%; height: 160rpx; font-size: 28rpx; }
.save { margin-top: 16rpx; height: 72rpx; line-height: 72rpx; text-align: center; background: #FF5A1F; color: #fff; border-radius: 36rpx; font-size: 26rpx; }
.list-title { font-size: 28rpx; color: #222; font-weight: 600; margin-bottom: 16rpx; }
.empty { text-align: center; color: #999; padding: 80rpx 0; }
.note { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 12rpx; }
.content { font-size: 28rpx; color: #333; line-height: 1.6; display: block; white-space: pre-wrap; }
.meta { display: flex; justify-content: space-between; margin-top: 16rpx; }
.time { font-size: 22rpx; color: #999; }
.del { font-size: 22rpx; color: #FF3B30; }
</style>
