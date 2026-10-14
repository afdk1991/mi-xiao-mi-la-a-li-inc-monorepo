<template>
  <view class="page">
    <view class="card">
      <input v-model="text" class="input" placeholder="输入要生成二维码的文本 / 链接" />
      <view class="gen" @tap="gen">生成二维码</view>
    </view>

    <view v-if="qrUrl" class="qr-wrap">
      <image :src="qrUrl" class="qr" mode="aspectFit" show-menu-by-longpress @load="onLoad" @error="onError" />
      <text class="tip">长按图片可保存 / 分享</text>
      <view v-if="loading" class="loading-tip">生成中…</view>
    </view>
    <view v-else class="empty">
      <text class="empty-icon">🔳</text>
      <text class="empty-text">{{ errTip || '输入内容后点击生成' }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onUnload } from '@dcloudio/uni-app';

const text = ref('https://example.com');
const qrUrl = ref('');
const loading = ref(false);
const errTip = ref('');

let loadTimer: ReturnType<typeof setTimeout> | null = null;

// 页面销毁时撤销超时兜底，否则定时器仍会触发并把已加载成功的二维码清空
onUnload(() => {
  if (loadTimer) {
    clearTimeout(loadTimer);
    loadTimer = null;
  }
});

function buildUrl(content: string) {
  return 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=' + encodeURIComponent(content);
}

function gen() {
  const t = text.value.trim();
  if (!t) {
    uni.showToast({ title: '请输入内容', icon: 'none' });
    return;
  }
  if (t.length > 1000) {
    uni.showToast({ title: '内容过长（上限 1000 字）', icon: 'none' });
    return;
  }
  errTip.value = '';
  loading.value = true;
  qrUrl.value = buildUrl(t);
  // 图片加载超时兜底：网络不可达时给出明确提示，而不是一直空白
  if (loadTimer) clearTimeout(loadTimer);
  loadTimer = setTimeout(() => {
    if (loading.value) {
      loading.value = false;
      qrUrl.value = '';
      errTip.value = '生成失败，请检查网络后重试';
    }
  }, 10000);
}

function onError() {
  loading.value = false;
  if (loadTimer) clearTimeout(loadTimer);
  qrUrl.value = '';
  errTip.value = '生成失败，请检查网络后重试';
}

/** 图片加载成功：关闭加载态并撤销超时兜底 */
function onLoad() {
  loading.value = false;
  if (loadTimer) clearTimeout(loadTimer);
}
</script>

<style scoped>
.page { padding: 24rpx; }
.card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 32rpx; }
.input { height: 80rpx; background: #f5f5f5; border-radius: 40rpx; padding: 0 28rpx; font-size: 26rpx; }
.gen { margin-top: 20rpx; height: 80rpx; line-height: 80rpx; text-align: center; background: #FF5A1F; color: #fff; border-radius: 40rpx; font-size: 28rpx; }
.qr-wrap { text-align: center; }
.qr { width: 400rpx; height: 400rpx; }
.tip { display: block; color: #999; font-size: 22rpx; margin-top: 16rpx; }
.loading-tip { display: block; color: #999; font-size: 22rpx; margin-top: 8rpx; }
.empty { text-align: center; padding: 120rpx 0; color: #999; }
.empty-icon { font-size: 80rpx; display: block; }
.empty-text { font-size: 26rpx; display: block; margin-top: 16rpx; }
</style>