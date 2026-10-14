<template>
  <view class="page">
    <view class="input-bar">
      <input v-model="text" class="input" placeholder="添加新待办…" confirm-type="done" @confirm="add" />
      <view class="add-btn" @tap="add">添加</view>
    </view>

    <view class="filter">
      <text v-for="(f, i) in filters" :key="f" class="f" :class="{ on: i === cur }" @tap="cur = i">{{ f }}</text>
      <text class="clear-done" @tap="clearDone">清除已完成</text>
    </view>

    <view v-if="filtered.length === 0" class="empty">暂无待办事项</view>
    <view v-else>
      <view v-for="t in filtered" :key="t.id" class="item">
        <view class="check" :class="{ on: t.done }" @tap="toggle(t.id)">✓</view>
        <text class="text" :class="{ done: t.done }">{{ t.text }}</text>
        <text class="del" @tap="remove(t.id)">✕</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { todoStore } from '../../store/todo';

const text = ref('');
const filters = ['全部', '未完成', '已完成'];
const cur = ref(0);

const filtered = computed(() => {
  const list = todoStore.state.list;
  if (cur.value === 1) return list.filter((x) => !x.done);
  if (cur.value === 2) return list.filter((x) => x.done);
  return list;
});

function add() {
  if (!text.value.trim()) {
    uni.showToast({ title: '请输入待办内容', icon: 'none' });
    return;
  }
  todoStore.add(text.value);
  text.value = '';
}
function toggle(id: string) { todoStore.toggle(id); }
function remove(id: string) { todoStore.remove(id); }
function clearDone() { todoStore.clearDone(); }
</script>

<style scoped>
.page { padding: 16rpx 24rpx 40rpx; min-height: 100vh; }
.input-bar { display: flex; gap: 16rpx; margin-bottom: 24rpx; }
.input { flex: 1; height: 80rpx; background: #fff; border-radius: 40rpx; padding: 0 28rpx; font-size: 26rpx; }
.add-btn { background: #FF5A1F; color: #fff; padding: 0 36rpx; height: 80rpx; line-height: 80rpx; border-radius: 40rpx; font-size: 26rpx; }
.filter { display: flex; align-items: center; margin-bottom: 16rpx; }
.f { font-size: 26rpx; color: #666; margin-right: 28rpx; padding: 8rpx 0; }
.f.on { color: #FF5A1F; font-weight: 600; border-bottom: 4rpx solid #FF5A1F; }
.clear-done { margin-left: auto; font-size: 22rpx; color: #999; }
.empty { text-align: center; color: #999; padding: 120rpx 0; }
.item { background: #fff; border-radius: 12rpx; padding: 24rpx; display: flex; align-items: center; gap: 16rpx; margin-bottom: 12rpx; }
.check { width: 40rpx; height: 40rpx; border-radius: 50%; border: 2rpx solid #ccc; color: transparent; font-size: 24rpx; display: flex; align-items: center; justify-content: center; }
.check.on { background: #FF5A1F; border-color: #FF5A1F; color: #fff; }
.text { flex: 1; font-size: 28rpx; color: #222; }
.text.done { color: #bbb; text-decoration: line-through; }
.del { color: #ccc; font-size: 28rpx; padding: 0 8rpx; }
</style>
