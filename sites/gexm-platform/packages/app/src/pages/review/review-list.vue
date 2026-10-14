<template>
  <view class="review-list-page">
    <gexm-nav-bar title="商品评价" />

    <scroll-view class="review-content" scroll-y @scrolltolower="loadMore">
      <view class="review-stats card">
        <view class="stats-score">
          <text class="score-num">{{ stats.goodRate || '98%' }}</text>
          <text class="score-label">好评率</text>
        </view>
        <view class="stats-detail">
          <view v-for="item in starStats" :key="item.star" class="stat-row">
            <text class="stat-label">{{ item.star }}星</text>
            <view class="stat-bar">
              <view class="stat-bar-inner" :style="{ width: item.percent + '%' }" />
            </view>
            <text class="stat-count">{{ item.count }}</text>
          </view>
        </view>
      </view>

      <view class="review-tabs">
        <view
          v-for="(tab, index) in tabs"
          :key="index"
          class="tab-item"
          :class="{ 'tab-item--active': currentTab === index }"
          @click="switchTab(index)"
        >
          <text class="tab-text">{{ tab.name }}</text>
          <text v-if="tab.count !== undefined" class="tab-count">{{ tab.count }}</text>
        </view>
      </view>

      <view class="review-list">
        <view v-if="loading" class="list-loading">
          <gexm-loading text="加载中..." />
        </view>

        <view v-else-if="reviews.length === 0" class="list-empty">
          <gexm-empty description="暂无评价" />
        </view>

        <view v-else>
          <view v-for="item in reviews" :key="item.id" class="review-item card">
            <view class="review-header">
              <view class="review-user">
                <image
                  v-if="item.avatar"
                  class="user-avatar"
                  :src="item.avatar"
                  mode="aspectFill"
                />
                <view v-else class="user-avatar user-avatar-default">
                  <text>{{ (item.nickname || 'U').charAt(0) }}</text>
                </view>
                <view class="user-info">
                  <text class="user-nickname">{{ item.nickname || '匿名用户' }}</text>
                  <view class="user-rating">
                    <text
                      v-for="star in 5"
                      :key="star"
                      class="star-icon"
                      :class="{ 'star-icon--active': star <= item.rating }"
                    >
                      ★
                    </text>
                  </view>
                </view>
              </view>
              <text class="review-time">{{ item.createdAt || item.time || '' }}</text>
            </view>

            <view v-if="item.skuName || item.specs" class="review-sku">
              <text class="sku-text">{{ item.skuName || item.specs }}</text>
            </view>

            <view class="review-content-text">
              <text>{{ item.content || item.comment || '' }}</text>
            </view>

            <view v-if="item.images && item.images.length > 0" class="review-images">
              <image
                v-for="(img, imgIndex) in item.images"
                :key="imgIndex"
                class="review-image"
                :src="img"
                mode="aspectFill"
                @click="previewImage(item.images, imgIndex)"
              />
            </view>

            <view v-if="item.reply || item.merchantReply" class="review-reply">
              <text class="reply-label">商家回复：</text>
              <text class="reply-content">{{ item.reply || item.merchantReply }}</text>
            </view>
          </view>
        </view>

        <view v-if="hasMore && reviews.length > 0" class="load-more">
          <gexm-loading v-if="loadingMore" text="加载中..." />
          <text v-else class="load-more-text">上拉加载更多</text>
        </view>

        <view v-if="!hasMore && reviews.length > 0" class="no-more">
          <text class="no-more-text">— 没有更多了 —</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { reactive } from 'vue'
import reviewApi from '@/api/review'

const productId = ref('')
const currentTab = ref(0)
const reviews = ref([])
const loading = ref(false)
const loadingMore = ref(false)
const hasMore = ref(true)
const page = ref(1)
const pageSize = 10

const stats = reactive({
  total: 0,
  goodCount: 0,
  midCount: 0,
  badCount: 0,
  hasImageCount: 0,
  goodRate: '98%',
})

const tabs = computed(() => [
  { name: '全部', count: stats.total },
  { name: '好评', count: stats.goodCount },
  { name: '中评', count: stats.midCount },
  { name: '差评', count: stats.badCount },
  { name: '有图', count: stats.hasImageCount },
])

const starStats = computed(() => [
  {
    star: 5,
    count: stats.goodCount || 0,
    percent: stats.total ? (stats.goodCount / stats.total) * 100 : 0,
  },
  { star: 4, count: 0, percent: 0 },
  {
    star: 3,
    count: stats.midCount || 0,
    percent: stats.total ? (stats.midCount / stats.total) * 100 : 0,
  },
  { star: 2, count: 0, percent: 0 },
  {
    star: 1,
    count: stats.badCount || 0,
    percent: stats.total ? (stats.badCount / stats.total) * 100 : 0,
  },
])

onLoad((options) => {
  if (options.productId) {
    productId.value = options.productId
  }
  loadStats()
  loadReviews()
})

async function loadStats() {
  try {
    const result = await reviewApi.getProductReviewStats(productId.value)
    const data = result.stats || result.data || result
    stats.total = data.total || data.totalCount || 0
    stats.goodCount = data.goodCount || data.good || 0
    stats.midCount = data.midCount || data.middle || 0
    stats.badCount = data.badCount || data.bad || 0
    stats.hasImageCount = data.hasImageCount || data.withImage || 0

    if (data.goodRate) {
      stats.goodRate = data.goodRate
    } else if (stats.total > 0) {
      stats.goodRate = Math.round((stats.goodCount / stats.total) * 100) + '%'
    }
  } catch (e) {
    console.error('Failed to load review stats:', e)
  }
}

function switchTab(index) {
  if (currentTab.value === index) return
  currentTab.value = index
  page.value = 1
  hasMore.value = true
  reviews.value = []
  loadReviews()
}

function getReviewType() {
  const types = ['all', 'good', 'mid', 'bad', 'image']
  return types[currentTab.value]
}

async function loadReviews() {
  loading.value = true

  try {
    const result = await reviewApi.getProductReviews(productId.value, {
      type: getReviewType(),
      page: page.value,
      pageSize,
    })
    const list = result.reviews || result.data?.reviews || result.list || result.data || []
    reviews.value = list
    hasMore.value = list.length >= pageSize
  } catch (e) {
    console.error('Failed to load reviews:', e)
    reviews.value = []
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (!hasMore.value || loadingMore.value) return

  loadingMore.value = true
  page.value++

  try {
    const result = await reviewApi.getProductReviews(productId.value, {
      type: getReviewType(),
      page: page.value,
      pageSize,
    })
    const list = result.reviews || result.data?.reviews || result.list || result.data || []
    reviews.value = [...reviews.value, ...list]
    hasMore.value = list.length >= pageSize
  } catch (e) {
    console.error('Failed to load more reviews:', e)
    page.value--
  } finally {
    loadingMore.value = false
  }
}

function previewImage(images, current) {
  uni.previewImage({
    urls: images,
    current: images[current],
  })
}
</script>

<style lang="scss" scoped>
.review-list-page {
  min-height: 100vh;
  background: $bg-color-page;
  display: flex;
  flex-direction: column;
}

.review-content {
  flex: 1;
  height: 0;
}

.review-stats {
  margin: $spacing-base;
  padding: $spacing-base;
  background: $bg-color-white;
  border-radius: $border-radius-lg;
  box-shadow: $shadow-sm;
  display: flex;
  align-items: center;
}

.stats-score {
  width: 180rpx;
  text-align: center;
  border-right: 1rpx solid $border-color-lighter;
  padding-right: $spacing-base;
}

.score-num {
  display: block;
  font-size: 56rpx;
  font-weight: bold;
  color: $danger-color;
}

.score-label {
  font-size: $font-size-sm;
  color: $text-color-secondary;
  margin-top: $spacing-xs;
}

.stats-detail {
  flex: 1;
  padding-left: $spacing-base;
}

.stat-row {
  display: flex;
  align-items: center;
  margin-bottom: 8rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.stat-label {
  width: 60rpx;
  font-size: $font-size-xs;
  color: $text-color-secondary;
}

.stat-bar {
  flex: 1;
  height: 12rpx;
  background: $bg-color;
  border-radius: 6rpx;
  margin: 0 $spacing-sm;
  overflow: hidden;
}

.stat-bar-inner {
  height: 100%;
  background: linear-gradient(90deg, $warning-color, $danger-color);
  border-radius: 6rpx;
}

.stat-count {
  width: 60rpx;
  font-size: $font-size-xs;
  color: $text-color-placeholder;
  text-align: right;
}

.review-tabs {
  display: flex;
  background: $bg-color-white;
  padding: 0 $spacing-sm;
  border-bottom: 1rpx solid $border-color-lighter;
  position: sticky;
  top: 0;
  z-index: 10;
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $spacing-base 0;
  position: relative;

  &--active {
    .tab-text {
      color: $primary-color;
      font-weight: 600;
    }

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 48rpx;
      height: 6rpx;
      background: $primary-color;
      border-radius: 3rpx;
    }
  }
}

.tab-text {
  font-size: $font-size-base;
  color: $text-color-secondary;
}

.tab-count {
  font-size: $font-size-xs;
  color: $text-color-placeholder;
  margin-left: 4rpx;
}

.review-list {
  padding: $spacing-sm $spacing-base;
}

.list-loading,
.list-empty {
  padding: $spacing-xl 0;
}

.review-item {
  background: $bg-color-white;
  border-radius: $border-radius-lg;
  padding: $spacing-base;
  margin-bottom: $spacing-sm;
  box-shadow: $shadow-sm;
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: $spacing-sm;
}

.review-user {
  display: flex;
  align-items: center;
}

.user-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;

  &-default {
    background: $primary-color;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: $font-size-md;
    font-weight: bold;
  }
}

.user-info {
  margin-left: $spacing-sm;
}

.user-nickname {
  font-size: $font-size-base;
  color: $text-color;
  font-weight: 500;
}

.user-rating {
  margin-top: 4rpx;
}

.star-icon {
  font-size: 24rpx;
  color: $border-color-lighter;
  margin-right: 2rpx;

  &--active {
    color: $warning-color;
  }
}

.review-time {
  font-size: $font-size-xs;
  color: $text-color-placeholder;
}

.review-sku {
  margin-bottom: $spacing-sm;
}

.sku-text {
  font-size: $font-size-sm;
  color: $text-color-placeholder;
  background: $bg-color;
  padding: 4rpx 12rpx;
  border-radius: 4rpx;
}

.review-content-text {
  font-size: $font-size-base;
  color: $text-color;
  line-height: 1.6;
  margin-bottom: $spacing-sm;
}

.review-images {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-xs;
  margin-bottom: $spacing-sm;
}

.review-image {
  width: 160rpx;
  height: 160rpx;
  border-radius: $border-radius-sm;
}

.review-reply {
  background: rgba(64, 158, 255, 0.05);
  border-radius: $border-radius-sm;
  padding: $spacing-sm;
}

.reply-label {
  font-size: $font-size-sm;
  color: $primary-color;
  font-weight: 500;
}

.reply-content {
  font-size: $font-size-sm;
  color: $text-color-secondary;
  line-height: 1.5;
}

.load-more {
  padding: $spacing-md 0;
  text-align: center;
}

.load-more-text {
  font-size: $font-size-sm;
  color: $text-color-placeholder;
}

.no-more {
  padding: $spacing-md 0;
  text-align: center;
}

.no-more-text {
  font-size: $font-size-sm;
  color: $text-color-placeholder;
}
</style>
