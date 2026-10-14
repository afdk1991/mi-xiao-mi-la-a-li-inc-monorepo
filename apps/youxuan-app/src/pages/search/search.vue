<template>
  <view class="page">
    <view class="search-bar">
      <view class="input-wrap">
        <text class="icon">🔍</text>
        <input
          v-model="keyword"
          class="input"
          placeholder="搜索商品 / 品牌"
          confirm-type="search"
          @confirm="doSearch"
          focus
        />
        <text v-if="keyword" class="clear" @tap="clearKw">✕</text>
      </view>
      <text class="cancel" @tap="goBack">取消</text>
    </view>

    <template v-if="!searched">
      <view v-if="history.length" class="block">
        <view class="block-head">
          <text class="block-title">历史搜索</text>
          <text class="block-clear" @tap="clearHistory">清空</text>
        </view>
        <view class="tags">
          <text v-for="h in history" :key="h" class="tag" @tap="quick(h)">{{ h }}</text>
        </view>
      </view>
      <view class="block">
        <view class="block-head"><text class="block-title">热门推荐</text></view>
        <view class="tags">
          <text v-for="h in hot" :key="h" class="tag hot" @tap="quick(h)">{{ h }}</text>
        </view>
      </view>
    </template>

    <template v-else>
      <view v-if="loading" class="loading">搜索中…</view>
      <view v-else-if="results.length" class="grid">
        <view v-for="p in results" :key="p.id" class="card" @tap="goDetail(p)">
          <view class="thumb" :style="{ background: p.color }">
            <text class="thumb-emoji">{{ p.emoji || '🛍️' }}</text>
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
      <view v-else-if="failed" class="empty">
        <text class="empty-icon">⚠️</text>
        <text class="empty-text">搜索失败</text>
        <view class="retry" @tap="doSearch">重试</view>
      </view>
      <view v-else class="empty">
        <text class="empty-icon">🔍</text>
        <text class="empty-text">没有找到「{{ keyword }}」相关商品</text>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';
import { ref } from 'vue';
import { fetchProducts } from '../../api';
import type { Product } from '../../api/types';
import { load, save } from '../../utils/storage';

const HISTORY_KEY = 'appsp_search_history';
const keyword = ref('');
const searched = ref(false);
const loading = ref(false);
const results = ref<Product[]>([]);
/** 必须是 ref：普通数组改动不会触发视图更新，历史记录会「存了但看不见」 */
const history = ref<string[]>(load<string[]>(HISTORY_KEY, [] as string[]));
const hot = ['保温杯', '耳机', '键盘', '充电宝', '四件套', '手环'];
const failed = ref(false);

/** 支持 ?keyword=xxx 直接进入搜索结果（首页金刚区入口依赖此能力） */
onLoad((query) => {
  const kw = (query?.keyword as string | undefined) || '';
  if (kw) {
    keyword.value = kw;
    doSearch();
  }
});

function pushHistory(k: string) {
  const list = history.value.filter((x) => x !== k);
  list.unshift(k);
  if (list.length > 10) list.length = 10;
  history.value = list;
  save(HISTORY_KEY, list);
}

function doSearch() {
  const k = keyword.value.trim();
  if (!k) return;
  pushHistory(k);
  searched.value = true;
  loading.value = true;
  failed.value = false;
  fetchProducts()
    .then((res) => {
      const kw = k.toLowerCase();
      results.value = (res.data || []).filter(
        (p) => p.title.toLowerCase().includes(kw) || (p.tag || '').toLowerCase().includes(kw),
      );
    })
    .catch(() => {
      results.value = [];
      failed.value = true;
      uni.showToast({ title: '搜索失败，请重试', icon: 'none' });
    })
    .finally(() => {
      loading.value = false;
    });
}

function quick(h: string) {
  keyword.value = h;
  doSearch();
}
function clearKw() {
  keyword.value = '';
  searched.value = false;
  results.value = [];
}
function clearHistory() {
  history.value = [];
  save(HISTORY_KEY, history.value);
}
function goDetail(p: Product) {
  uni.navigateTo({ url: `/pages/product/detail?id=${p.id}` });
}
function goBack() {
  if (getCurrentPages().length > 1) uni.navigateBack();
  else uni.switchTab({ url: '/pages/index/index' });
}
</script>

<style scoped>
.page { padding: 16rpx 24rpx 40rpx; }
.search-bar { display: flex; align-items: center; gap: 16rpx; }
.input-wrap { flex: 1; height: 72rpx; background: #F0F1F3; border-radius: 36rpx; display: flex; align-items: center; padding: 0 24rpx; gap: 12rpx; }
.icon { font-size: 28rpx; }
.input { flex: 1; font-size: 26rpx; }
.clear { color: #aaa; font-size: 26rpx; padding: 0 8rpx; }
.cancel { color: #666; font-size: 26rpx; }
.block { margin-top: 32rpx; }
.block-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.block-title { font-size: 28rpx; color: #222; font-weight: 600; }
.block-clear { font-size: 24rpx; color: #999; }
.tags { display: flex; flex-wrap: wrap; gap: 16rpx; }
.tag { padding: 10rpx 24rpx; background: #fff; border-radius: 28rpx; font-size: 24rpx; color: #555; }
.tag.hot { background: #FFF3EC; color: #FF5A1F; }
.loading, .empty { text-align: center; color: #999; padding: 120rpx 0; }
.empty-icon { font-size: 64rpx; display: block; margin-bottom: 16rpx; }
.empty-text { font-size: 26rpx; }
.grid { display: flex; flex-wrap: wrap; justify-content: space-between; }
.card { width: 48.5%; background: #fff; border-radius: 20rpx; overflow: hidden; margin-bottom: 20rpx; }
.thumb { height: 280rpx; display: flex; align-items: center; justify-content: center; }
.thumb-emoji { font-size: 110rpx; line-height: 1; }
.info { padding: 16rpx 20rpx 20rpx; }
.title { font-size: 26rpx; color: #222; line-height: 1.4; display: block; min-height: 72rpx; }
.price-row { display: flex; align-items: baseline; gap: 12rpx; margin-top: 10rpx; }
.price { color: #FF5A1F; font-size: 36rpx; font-weight: 700; }
.origin { color: #bbb; font-size: 22rpx; text-decoration: line-through; }
.sales { color: #999; font-size: 22rpx; margin-top: 6rpx; display: block; }
.retry { display: inline-block; margin-top: 24rpx; padding: 14rpx 40rpx; background: #FF5A1F; color: #fff; border-radius: 32rpx; font-size: 26rpx; }
</style>
