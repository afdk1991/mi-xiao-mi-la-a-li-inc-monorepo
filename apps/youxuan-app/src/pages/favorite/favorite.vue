<template>
  <view class="page">
    <view v-if="loading" class="loading">加载中…</view>
    <view v-else-if="list.length" class="grid">
      <view v-for="p in list" :key="p.id" class="card" @tap="goDetail(p)">
        <view class="thumb" :style="{ background: p.color }">
          <text class="thumb-emoji">{{ p.emoji || '🛍️' }}</text>
          <text class="unfav" @tap.stop="unfav(p)">♥</text>
        </view>
        <view class="info">
          <text class="title">{{ p.title }}</text>
          <view class="price-row">
            <text class="price">¥{{ p.price }}</text>
            <text v-if="p.originalPrice" class="origin">¥{{ p.originalPrice }}</text>
          </view>
        </view>
      </view>
    </view>
    <view v-else class="empty">
      <text class="empty-icon">💔</text>
      <text class="empty-text">还没有收藏商品</text>
      <view class="go-shop" @tap="goShop">去逛逛</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { fetchProducts } from '../../api';
import type { Product } from '../../api/types';
import { communityStore } from '../../store/community';

const all = ref<Product[]>([]);
const loading = ref(true);
const favIds = computed(() => communityStore.state.favorites);
const list = computed(() => all.value.filter((p) => favIds.value.includes(p.id)));

onShow(() => {
  loading.value = true;
  fetchProducts()
    .then((res) => { all.value = res.data || []; })
    .catch(() => {
      all.value = [];
      uni.showToast({ title: '加载失败，请下拉重试', icon: 'none' });
    })
    .finally(() => { loading.value = false; });
});

function unfav(p: Product) {
  communityStore.toggleFav(p.id);
}
function goDetail(p: Product) {
  uni.navigateTo({ url: `/pages/product/detail?id=${p.id}` });
}
function goShop() {
  uni.switchTab({ url: '/pages/index/index' });
}
</script>

<style scoped>
.page { padding: 16rpx 24rpx 40rpx; min-height: 100vh; }
.loading, .empty { text-align: center; padding: 160rpx 0; color: #999; }
.empty-icon { font-size: 80rpx; display: block; }
.empty-text { font-size: 26rpx; display: block; margin: 16rpx 0; }
.go-shop { display: inline-block; padding: 14rpx 40rpx; background: #FF5A1F; color: #fff; border-radius: 32rpx; font-size: 26rpx; }
.grid { display: flex; flex-wrap: wrap; justify-content: space-between; }
.card { width: 48.5%; background: #fff; border-radius: 20rpx; overflow: hidden; margin-bottom: 20rpx; }
.thumb { position: relative; height: 280rpx; display: flex; align-items: center; justify-content: center; }
.thumb-emoji { font-size: 110rpx; line-height: 1; }
.unfav { position: absolute; right: 16rpx; top: 16rpx; font-size: 36rpx; color: #FF5A1F; }
.info { padding: 16rpx 20rpx 20rpx; }
.title { font-size: 26rpx; color: #222; display: block; min-height: 72rpx; }
.price-row { display: flex; align-items: baseline; gap: 12rpx; margin-top: 10rpx; }
.price { color: #FF5A1F; font-size: 36rpx; font-weight: 700; }
.origin { color: #bbb; font-size: 22rpx; text-decoration: line-through; }
</style>
