<template>
  <view class="page">
    <view v-if="loading" class="loading">加载中…</view>
    <template v-else-if="product">
      <view class="hero" :style="{ background: product.color }">
        <text class="hero-emoji">{{ product.emoji || '🛍️' }}</text>
        <text v-if="product.tag" class="hero-tag">{{ product.tag }}</text>
      </view>

      <view class="price-card">
        <view class="price-row">
          <text class="price">¥{{ product.price }}</text>
          <text v-if="product.originalPrice" class="origin">¥{{ product.originalPrice }}</text>
          <text class="sales">已售 {{ product.sales }}</text>
        </view>
        <text class="title">{{ product.title }}</text>
      </view>

      <view class="block">
        <text class="block-title">规格</text>
        <view class="specs">
          <text v-for="(s, i) in specs" :key="s" class="spec" :class="{ on: i === specIdx }" @tap="specIdx = i">{{ s }}</text>
        </view>
      </view>

      <view class="block">
        <text class="block-title">详情</text>
        <view class="desc-box">
          <text class="desc">· 正品保障，假一赔十</text>
          <text class="desc">· 7 天无理由退货</text>
          <text class="desc">· 全国包邮，48 小时内发货</text>
          <text class="desc">· 官方旗舰店货源，品质可溯</text>
        </view>
      </view>
    </template>
    <view v-else class="loading">商品不存在</view>

    <!-- 底部操作栏 -->
    <view class="tabbar">
      <view class="tab-icon" @tap="goCart">🛒<text class="tab-label">购物车</text><text v-if="cartCount" class="badge">{{ cartCount }}</text></view>
      <view class="tab-icon" :class="{ faved }" @tap="toggleFav">♥<text class="tab-label">收藏</text></view>
      <view class="btn-cart" @tap="addToCart">加入购物车</view>
      <view class="btn-buy" @tap="buyNow">立即购买</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { fetchProducts } from '../../api';
import type { Product } from '../../api/types';
import { cartStore, lineIdOf } from '../../store/cart';
import { communityStore } from '../../store/community';
import { userStore } from '../../store/user';

const product = ref<Product | null>(null);
const loading = ref(true);
const specIdx = ref(0);
const specs = ['标配', '升级版', '套装版'];
const currentId = ref('');

const cartCount = computed(() => cartStore.totalCount.value);
const faved = computed(() => currentId.value && communityStore.isFav(currentId.value));

onLoad((query) => {
  const id = query?.id;
  load(id);
});

async function load(id?: string) {
  loading.value = true;
  try {
    const res = await fetchProducts();
    const list = res.data || [];
    // 必须是精确匹配后再回退：原实现 res.data[0] 兜底会让「打开 A 商品却显示 B 商品」
    product.value = list.find((p) => p.id === id) || null;
    currentId.value = product.value?.id || '';
  } catch {
    product.value = null;
    currentId.value = '';
    uni.showToast({ title: '商品加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

function addToCart() {
  if (!product.value) return;
  cartStore.add({
    productId: product.value.id,
    title: product.value.title,
    price: product.value.price,
    color: product.value.color,
    spec: specs[specIdx.value],
    emoji: product.value.emoji,
  });
  uni.showToast({ title: '已加入购物车', icon: 'success' });
}

function buyNow() {
  if (!product.value) return;
  const p = product.value;
  const spec = specs[specIdx.value];
  // 保证该规格行存在，然后只勾选这一行（走 store 方法，勾选状态会持久化）
  cartStore.add({
    productId: p.id,
    title: p.title,
    price: p.price,
    color: p.color,
    spec,
    emoji: p.emoji,
  });
  cartStore.setOnlyChecked(lineIdOf(p.id, spec));

  // 购物车勾选状态已持久化，登录后可直接回下单页，不必让用户再点一次「立即购买」
  if (!userStore.state.user.isLoggedIn) {
    uni.navigateTo({
      url: '/pages/login/login?redirect=' + encodeURIComponent('/pages/order/confirm'),
    });
    return;
  }
  uni.navigateTo({ url: '/pages/order/confirm' });
}

function toggleFav() {
  if (!product.value) return;
  communityStore.toggleFav(product.value.id);
  uni.showToast({ title: communityStore.isFav(product.value.id) ? '已收藏' : '已取消收藏', icon: 'none' });
}

function goCart() {
  uni.navigateTo({ url: '/pages/cart/cart' });
}
</script>

<style scoped>
.page { padding-bottom: 140rpx; }
.loading { text-align: center; color: #999; padding: 200rpx 0; }
.hero { position: relative; height: 500rpx; display: flex; align-items: center; justify-content: center; }
.hero-emoji { font-size: 200rpx; line-height: 1; }
.hero-tag { position: absolute; left: 24rpx; top: 24rpx; background: rgba(0,0,0,.45); color: #fff; font-size: 22rpx; padding: 6rpx 16rpx; border-radius: 10rpx; }
.price-card { background: #fff; padding: 24rpx; margin-bottom: 16rpx; }
.price-row { display: flex; align-items: baseline; gap: 16rpx; }
.price { color: #FF5A1F; font-size: 48rpx; font-weight: 700; }
.origin { color: #bbb; font-size: 26rpx; text-decoration: line-through; }
.sales { color: #999; font-size: 22rpx; margin-left: auto; }
.title { font-size: 30rpx; color: #222; line-height: 1.5; margin-top: 16rpx; display: block; }
.block { background: #fff; padding: 24rpx; margin-bottom: 16rpx; }
.block-title { font-size: 28rpx; color: #222; font-weight: 600; display: block; margin-bottom: 16rpx; }
.specs { display: flex; flex-wrap: wrap; gap: 16rpx; }
.spec { padding: 12rpx 28rpx; background: #f2f3f5; border-radius: 12rpx; font-size: 26rpx; color: #555; }
.spec.on { background: #FFEDE3; color: #FF5A1F; border: 1rpx solid #FF5A1F; }
.desc-box { display: flex; flex-direction: column; gap: 12rpx; }
.desc { font-size: 26rpx; color: #666; }
.tabbar { position: fixed; left: 0; right: 0; bottom: 0; height: 110rpx; background: #fff; display: flex; align-items: center; padding: 0 24rpx; gap: 16rpx; border-top: 1rpx solid #eee; }
.tab-icon { position: relative; display: flex; flex-direction: column; align-items: center; font-size: 36rpx; width: 80rpx; }
.tab-icon.faved { color: #FF5A1F; }
.tab-label { font-size: 20rpx; color: #666; margin-top: 4rpx; }
.badge { position: absolute; top: -6rpx; right: 0; background: #FF3B30; color: #fff; font-size: 18rpx; min-width: 28rpx; height: 28rpx; line-height: 28rpx; border-radius: 14rpx; text-align: center; padding: 0 6rpx; }
.btn-cart { flex: 1; height: 80rpx; background: #FFD8B8; color: #FF5A1F; border-radius: 40rpx; display: flex; align-items: center; justify-content: center; font-size: 28rpx; font-weight: 600; }
.btn-buy { flex: 1; height: 80rpx; background: linear-gradient(135deg, #FF8A65, #FF5A1F); color: #fff; border-radius: 40rpx; display: flex; align-items: center; justify-content: center; font-size: 28rpx; font-weight: 600; }
</style>