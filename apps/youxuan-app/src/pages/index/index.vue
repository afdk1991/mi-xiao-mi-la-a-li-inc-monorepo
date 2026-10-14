<template>
  <view class="page">
    <!-- 顶部搜索栏 -->
    <view class="search-bar">
      <view class="search-input" @tap="goSearch">
        <text class="search-icon">🔍</text>
        <text class="search-ph">搜索商品 / 品牌</text>
      </view>
      <view class="search-cart" @tap="onCart">
        🛒
        <text v-if="cartCount" class="badge">{{ cartCount }}</text>
      </view>
    </view>

    <scroll-view class="scroller" scroll-y>
      <!-- 轮播 Banner -->
      <view class="banner-wrap">
        <view class="banner-track" :style="{ transform: `translateX(-${bannerIdx * 100}%)` }">
          <view
            v-for="(b, i) in banners"
            :key="i"
            class="banner-slide"
            :style="{ background: b.bg }"
            @tap="goSearch"
          >
            <view class="banner-title">{{ b.title }}</view>
            <view class="banner-sub">{{ b.sub }}</view>
          </view>
        </view>
        <view class="banner-dots">
          <view
            v-for="(b, i) in banners"
            :key="i"
            class="dot"
            :class="{ active: i === bannerIdx }"
            @tap="bannerIdx = i"
          ></view>
        </view>
      </view>

      <!-- 金刚区分类 -->
      <scroll-view class="kingkong" scroll-x>
        <view v-for="c in categories" :key="c.name" class="kk-item" @tap="onCategory(c.name)">
          <view class="kk-icon" :style="{ background: c.bg }">{{ c.emoji }}</view>
          <text class="kk-text">{{ c.name }}</text>
        </view>
      </scroll-view>

      <!-- 限时秒杀 -->
      <view class="seckill">
        <view class="sk-head">
          <text class="sk-title">⚡ 限时秒杀</text>
          <view class="sk-timer">
            <text class="sk-label">距结束</text>
            <text class="sk-num">{{ countdown.h }}</text><text class="sk-colon">:</text>
            <text class="sk-num">{{ countdown.m }}</text><text class="sk-colon">:</text>
            <text class="sk-num">{{ countdown.s }}</text>
          </view>
        </view>
        <scroll-view class="sk-list" scroll-x>
          <view v-for="p in seckill" :key="p.id" class="sk-item" @tap="onProduct(p)">
            <view class="sk-thumb" :style="{ background: p.color }">{{ p.emoji || '🛍️' }}</view>
            <text class="sk-price">¥{{ p.price }}</text>
            <text class="sk-origin">¥{{ p.originalPrice || p.price }}</text>
          </view>
        </scroll-view>
      </view>

      <!-- 推荐商品 -->
      <view class="rec-head">
        <text class="rec-line"></text>
        <text class="rec-title">为你推荐</text>
        <text class="rec-line"></text>
      </view>

      <view v-if="loading" class="loading">加载中…</view>
      <view v-else-if="error" class="loading">
        <text class="err-text">商品加载失败</text>
        <view class="retry" @tap="load">重新加载</view>
      </view>
      <view v-else class="grid">
        <view v-for="p in products" :key="p.id" class="card" @tap="onProduct(p)">
          <view class="thumb" :style="{ background: p.color }">
            <text class="thumb-emoji">{{ p.emoji || '🛍️' }}</text>
            <text v-if="p.tag" class="tag">{{ p.tag }}</text>
          </view>
          <view class="info">
            <text class="title">{{ p.title }}</text>
            <view class="price-row">
              <text class="price">¥{{ p.price }}</text>
              <text v-if="p.originalPrice" class="origin">¥{{ p.originalPrice }}</text>
            </view>
            <text class="sales">已售 {{ p.sales }}</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { onUnload } from '@dcloudio/uni-app';
import { fetchProducts } from '../../api';
import type { Product } from '../../api/types';
import { cartStore } from '../../store/cart';

const products = ref<Product[]>([]);
const loading = ref(true);
const error = ref(false);
const cartCount = computed(() => cartStore.totalCount.value);

// 轮播
const banners = [
  { bg: 'linear-gradient(135deg,#FF6B6B,#FF8E53)', title: '新人大礼包', sub: '注册即领 ¥100 券' },
  { bg: 'linear-gradient(135deg,#4FACFE,#00F2FE)', title: '数码狂欢节', sub: '爆款直降 50%' },
  { bg: 'linear-gradient(135deg,#43E97B,#38F9D7)', title: '品质家居', sub: '满 199 减 50' },
];
const bannerIdx = ref(0);
let bannerTimer: ReturnType<typeof setInterval> | null = null;

// 分类（图标化）
const categories = [
  { name: '推荐', emoji: '🌟', bg: '#FF8A80' },
  { name: '数码', emoji: '📱', bg: '#82B1FF' },
  { name: '家居', emoji: '🏠', bg: '#B9F6CA' },
  { name: '服饰', emoji: '👕', bg: '#FFE57F' },
  { name: '美食', emoji: '🍔', bg: '#F48FB1' },
  { name: '美妆', emoji: '💄', bg: '#B388FF' },
  { name: '运动', emoji: '🏀', bg: '#80CBC4' },
  { name: '母婴', emoji: '🍼', bg: '#A5D6A7' },
];

// 限时秒杀：取前 4 个商品 + 当日结束倒计时
const seckill = computed(() => products.value.slice(0, 4));
const countdown = ref({ h: '00', m: '00', s: '00' });
let killTimer: ReturnType<typeof setInterval> | null = null;

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}
function tickCountdown() {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  let diff = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
  const h = Math.floor(diff / 3600);
  diff -= h * 3600;
  const m = Math.floor(diff / 60);
  const s = diff - m * 60;
  countdown.value = { h: pad(h), m: pad(m), s: pad(s) };
}

async function load() {
  loading.value = true;
  error.value = false;
  try {
    const res = await fetchProducts();
    products.value = res.data || [];
  } catch {
    products.value = [];
    error.value = true;
  } finally {
    loading.value = false;
  }
}

/** 金刚区：把分类名当搜索词带到搜索页（商品数据暂无分类字段，走搜索最贴近预期） */
function onCategory(name: string) {
  uni.navigateTo({ url: `/pages/search/search?keyword=${encodeURIComponent(name)}` });
}
function onProduct(p: Product) {
  uni.navigateTo({ url: `/pages/product/detail?id=${p.id}` });
}
function onCart() {
  uni.navigateTo({ url: '/pages/cart/cart' });
}
function goSearch() {
  uni.navigateTo({ url: '/pages/search/search' });
}

onMounted(() => {
  load();
  tickCountdown();
  killTimer = setInterval(tickCountdown, 1000);
  bannerTimer = setInterval(() => {
    bannerIdx.value = (bannerIdx.value + 1) % banners.length;
  }, 3500);
});

onUnload(() => {
  if (killTimer) clearInterval(killTimer);
  if (bannerTimer) clearInterval(bannerTimer);
});
</script>

<style scoped>
.page { display: flex; flex-direction: column; height: 100vh; background: #F5F6F8; }
.search-bar { display: flex; align-items: center; gap: 16rpx; padding: 16rpx 24rpx; background: #fff; }
.search-input { flex: 1; height: 72rpx; background: #F0F1F3; border-radius: 36rpx; display: flex; align-items: center; padding: 0 24rpx; gap: 12rpx; }
.search-icon { font-size: 28rpx; }
.search-ph { color: #9AA0A6; font-size: 26rpx; }
.search-cart { position: relative; font-size: 40rpx; }
.badge { position: absolute; top: -10rpx; right: -14rpx; background: #FF3B30; color: #fff; font-size: 18rpx; min-width: 28rpx; height: 28rpx; line-height: 28rpx; border-radius: 14rpx; text-align: center; padding: 0 6rpx; }
.scroller { flex: 1; }

/* 轮播 */
.banner-wrap { position: relative; margin: 20rpx 24rpx 0; border-radius: 20rpx; overflow: hidden; height: 260rpx; }
.banner-track { display: flex; height: 100%; transition: transform 0.4s ease; }
.banner-slide { flex: 0 0 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; padding: 0 40rpx; color: #fff; }
.banner-title { font-size: 44rpx; font-weight: 700; }
.banner-sub { font-size: 26rpx; margin-top: 12rpx; opacity: 0.92; }
.banner-dots { position: absolute; bottom: 16rpx; left: 0; right: 0; display: flex; justify-content: center; gap: 10rpx; }
.dot { width: 12rpx; height: 12rpx; border-radius: 50%; background: rgba(255,255,255,.5); }
.dot.active { width: 28rpx; border-radius: 6rpx; background: #fff; }

/* 金刚区 */
.kingkong { white-space: nowrap; padding: 24rpx 24rpx 8rpx; background: #fff; margin-top: 20rpx; }
.kk-item { display: inline-flex; flex-direction: column; align-items: center; margin-right: 36rpx; }
.kk-icon { width: 88rpx; height: 88rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 44rpx; margin-bottom: 10rpx; }
.kk-text { font-size: 24rpx; color: #333; }

/* 秒杀 */
.seckill { background: #fff; margin-top: 20rpx; padding: 24rpx; }
.sk-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20rpx; }
.sk-title { font-size: 32rpx; font-weight: 700; color: #FF3B30; }
.sk-timer { display: flex; align-items: center; gap: 4rpx; }
.sk-label { font-size: 22rpx; color: #999; margin-right: 8rpx; }
.sk-num { background: #2B2B2B; color: #fff; font-size: 22rpx; padding: 4rpx 8rpx; border-radius: 6rpx; }
.sk-colon { color: #2B2B2B; font-size: 22rpx; font-weight: 700; }
.sk-list { white-space: nowrap; }
.sk-item { display: inline-flex; flex-direction: column; align-items: center; width: 160rpx; margin-right: 20rpx; }
.sk-thumb { width: 140rpx; height: 140rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; font-size: 64rpx; }
.sk-price { color: #FF3B30; font-size: 30rpx; font-weight: 700; margin-top: 10rpx; }
.sk-origin { color: #bbb; font-size: 20rpx; text-decoration: line-through; }

/* 推荐 */
.rec-head { display: flex; align-items: center; justify-content: center; gap: 16rpx; margin: 30rpx 0 10rpx; }
.rec-title { font-size: 28rpx; color: #333; font-weight: 600; }
.rec-line { width: 60rpx; height: 2rpx; background: #ddd; }

/* 商品网格 */
.grid { display: flex; flex-wrap: wrap; justify-content: space-between; padding: 0 24rpx 40rpx; }
.card { width: 48.5%; background: #fff; border-radius: 20rpx; overflow: hidden; margin-bottom: 20rpx; }
.thumb { position: relative; height: 300rpx; display: flex; align-items: center; justify-content: center; }
.thumb-emoji { font-size: 110rpx; }
.tag { position: absolute; left: 16rpx; top: 16rpx; background: rgba(0,0,0,.45); color: #fff; font-size: 20rpx; padding: 4rpx 12rpx; border-radius: 8rpx; }
.info { padding: 16rpx 20rpx 20rpx; }
.title { font-size: 26rpx; color: #222; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 72rpx; }
.price-row { display: flex; align-items: baseline; gap: 12rpx; margin-top: 10rpx; }
.price { color: #FF5A1F; font-size: 36rpx; font-weight: 700; }
.origin { color: #bbb; font-size: 22rpx; text-decoration: line-through; }
.sales { color: #999; font-size: 22rpx; margin-top: 6rpx; display: block; }
.loading { text-align: center; color: #999; padding: 120rpx 0; }
.err-text { display: block; font-size: 26rpx; }
.retry { display: inline-block; margin-top: 24rpx; padding: 14rpx 40rpx; background: #FF5A1F; color: #fff; border-radius: 32rpx; font-size: 26rpx; }
</style>
