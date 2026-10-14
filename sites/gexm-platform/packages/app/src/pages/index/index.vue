<template>
  <view class="home-page">
    <gexm-nav-bar title="" :showBack="false">
      <template #left>
        <view class="home-logo">G</view>
      </template>
      <template #center>
        <view class="home-search-bar" @click="goSearch">
          <text class="home-search-icon">🔍</text>
          <text class="home-search-placeholder">搜索商品</text>
        </view>
      </template>
    </gexm-nav-bar>

    <scroll-view class="home-content" scroll-y @scrolltolower="loadMore">
      <view v-if="loading" class="home-skeleton">
        <gexm-skeleton :width="100" :height="400" />
        <view class="skeleton-grid">
          <gexm-skeleton v-for="i in 4" :key="i" :width="100" :height="120" />
        </view>
        <view class="skeleton-section">
          <gexm-skeleton :width="80" :height="32" />
          <view class="skeleton-product-grid">
            <gexm-skeleton v-for="i in 4" :key="i" :width="48" :height="280" />
          </view>
        </view>
      </view>

      <template v-else>
        <swiper
          class="home-swiper"
          :indicator-dots="true"
          indicator-color="rgba(255,255,255,0.4)"
          indicator-active-color="#ffffff"
          autoplay
          interval="4000"
          circular
        >
          <swiper-item v-for="(banner, index) in banners" :key="index" @click="handleBannerClick(banner)">
            <gexm-image-lazy
              class="swiper-image"
              :src="banner.image || '/static/images/banner1.png'"
              mode="aspectFill"
              shape="none"
              :lazy="index > 0"
              error-image="/static/images/banner1.png"
            />
          </swiper-item>
        </swiper>

        <view class="feature-grid">
          <view
            v-for="(feature, index) in features"
            :key="index"
            class="feature-item"
            @click="handleFeatureClick(feature)"
          >
            <view class="feature-icon-wrapper" :style="{ background: feature.bgColor }">
              <text class="feature-icon">{{ feature.icon }}</text>
            </view>
            <text class="feature-label">{{ feature.label }}</text>
          </view>
        </view>

        <view class="category-scroll">
          <scroll-view scroll-x show-scrollbar="false" class="category-scroll-view">
            <view class="category-list">
              <view
                v-for="category in categories"
                :key="category.id"
                class="category-item"
                @click="goCategory(category.id)"
              >
                <gexm-image-lazy
                  class="category-icon"
                  :src="category.icon || '/static/images/placeholder.svg'"
                  mode="aspectFill"
                  shape="round"
                  error-image="/static/images/placeholder.svg"
                />
                <text class="category-name">{{ category.name }}</text>
              </view>
            </view>
          </scroll-view>
        </view>

        <view v-if="hotProducts.length > 0" class="product-section">
          <view class="section-header">
            <text class="section-title">🔥 热门商品</text>
            <text class="section-more" @click="goProductList('hot')">更多 ›</text>
          </view>
          <view class="product-grid">
            <gexm-product-card
              v-for="product in hotProducts"
              :key="product.id"
              :product="product"
              @click="goProductDetail(product.id)"
            />
          </view>
        </view>

        <view v-if="newProducts.length > 0" class="product-section">
          <view class="section-header">
            <text class="section-title">✨ 新品上市</text>
            <text class="section-more" @click="goProductList('new')">更多 ›</text>
          </view>
          <view class="product-grid">
            <gexm-product-card
              v-for="product in newProducts"
              :key="product.id"
              :product="product"
              @click="goProductDetail(product.id)"
            />
          </view>
        </view>

        <view v-if="flashSales.length > 0" class="flash-sale-section">
          <view class="section-header">
            <text class="section-title">⚡ 限时秒杀</text>
            <text class="section-more" @click="goFlashSale">更多 ›</text>
            <view class="flash-sale-countdown">
              <view class="countdown-item">
                <text class="countdown-num">{{ flashSaleTime.hours }}</text>
                <text class="countdown-label">时</text>
              </view>
              <text class="countdown-separator">:</text>
              <view class="countdown-item">
                <text class="countdown-num">{{ flashSaleTime.minutes }}</text>
                <text class="countdown-label">分</text>
              </view>
              <text class="countdown-separator">:</text>
              <view class="countdown-item">
                <text class="countdown-num">{{ flashSaleTime.seconds }}</text>
                <text class="countdown-label">秒</text>
              </view>
            </view>
          </view>
          <scroll-view scroll-x show-scrollbar="false" class="flash-sale-scroll">
            <view class="flash-sale-list">
              <view
                v-for="item in flashSales"
                :key="item.id"
                class="flash-sale-item"
                @click="goProductDetail(item.id)"
              >
                <gexm-image-lazy
                  class="flash-sale-image"
                  :src="item.image || item.main_image || '/static/images/placeholder.svg'"
                  mode="aspectFill"
                  shape="round"
                  error-image="/static/images/placeholder.svg"
                />
                <view class="flash-sale-info">
                  <text class="flash-sale-name">{{ item.name }}</text>
                  <view class="flash-sale-price-row">
                    <text class="flash-sale-price">¥{{ (item.flash_price || item.price).toFixed(2) }}</text>
                    <text class="flash-sale-original-price">¥{{ (item.original_price || item.price).toFixed(2) }}</text>
                  </view>
                  <view class="flash-sale-progress">
                    <view class="flash-sale-progress-bar" :style="{ width: getProgress(item) + '%' }" />
                    <text class="flash-sale-progress-text">已抢{{ getProgress(item) }}%</text>
                  </view>
                </view>
              </view>
            </view>
          </scroll-view>
        </view>

        <view v-if="coupons.length > 0" class="coupon-section">
          <view class="section-header">
            <text class="section-title">🎁 优惠券</text>
            <text class="section-more" @click="goCoupon">领取 ›</text>
          </view>
          <scroll-view scroll-x show-scrollbar="false" class="coupon-scroll">
            <view class="coupon-list">
              <view
                v-for="coupon in coupons"
                :key="coupon.id"
                class="coupon-item"
                @click="goCoupon"
              >
                <view class="coupon-left">
                  <text class="coupon-symbol">¥</text>
                  <text class="coupon-price">{{ coupon.discount.toFixed(2) }}</text>
                  <text class="coupon-condition">满{{ coupon.min_amount || coupon.minAmount }}可用</text>
                </view>
                <view class="coupon-right">
                  <text class="coupon-name">{{ coupon.name }}</text>
                  <text class="coupon-expire">{{ formatExpire(coupon.expire_at || coupon.expireAt) }}</text>
                </view>
              </view>
            </view>
          </scroll-view>
        </view>

        <view v-if="loadingMore" class="loading-more">
          <gexm-loading text="加载中..." />
        </view>

        <view v-if="!loadingMore && !hasMore && (hotProducts.length > 0 || newProducts.length > 0)" class="no-more">
          <text>— 已加载全部 —</text>
        </view>
      </template>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useProductStore } from '@/store/product'
import { useCategoryStore } from '@/store/category'
import { useCouponStore } from '@/store/coupon'
import productApi from '@/api/product'
import flashSaleApi from '@/api/flash-sale'

const productStore = useProductStore()
const categoryStore = useCategoryStore()
const couponStore = useCouponStore()

const loading = ref(true)
const loadingMore = ref(false)
const hasMore = ref(true)
const page = ref(1)
const pageSize = 10

const hotProducts = ref([])
const newProducts = ref([])
const flashSales = ref([])
const flashSaleEndTime = ref('')
const coupons = ref([])
const categories = ref([])

const banners = ref([
  { image: '/static/images/banner1.png', link: '' },
  { image: '/static/images/banner2.png', link: '' },
  { image: '/static/images/banner3.png', link: '' },
])

const features = [
  { icon: '🔥', label: '限时秒杀', path: '/pages/flash-sale/flash-sale', bgColor: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)' },
  { icon: '🎁', label: '优惠券', path: '/pages/coupon/coupon-list', bgColor: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' },
  { icon: '⭐', label: '每日签到', path: '/pages/checkin/checkin', bgColor: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
  { icon: '💬', label: '在线客服', path: '/pages/chat/ai-chat', bgColor: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' },
  { icon: '❤️', label: '我的收藏', path: '/pages/favorites/favorites', bgColor: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)' },
  { icon: '📦', label: '订单中心', path: '/pages/order/order-list', bgColor: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' },
]

let countdownTimer = null

const flashSaleTime = ref({ hours: '00', minutes: '00', seconds: '00' })

function updateFlashSaleCountdown() {
  if (!flashSaleEndTime.value) {
    flashSaleTime.value = { hours: '00', minutes: '00', seconds: '00' }
    return
  }
  
  const now = new Date().getTime()
  const endTime = new Date(flashSaleEndTime.value).getTime()
  const diff = Math.max(0, endTime - now)
  
  const hours = String(Math.floor(diff / (1000 * 60 * 60))).padStart(2, '0')
  const minutes = String(Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0')
  const seconds = String(Math.floor((diff % (1000 * 60)) / 1000)).padStart(2, '0')
  
  flashSaleTime.value = { hours, minutes, seconds }
}

onMounted(() => {
  startCountdown()
})

onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
  }
})

onShow(() => {
  if (!hotProducts.value.length) {
    loadData()
  }
})

function startCountdown() {
  if (countdownTimer) clearInterval(countdownTimer)
  updateFlashSaleCountdown()
  countdownTimer = setInterval(updateFlashSaleCountdown, 1000)
}

async function loadData() {
  loading.value = true
  try {
    await Promise.all([
      loadHotProducts(),
      loadNewProducts(),
      loadCategories(),
      loadFlashSales(),
      loadCoupons(),
    ])
  } catch (e) {
    console.error('Load home data failed:', e)
  } finally {
    loading.value = false
  }
}

async function loadHotProducts() {
  try {
    const result = await productApi.getProducts({ page: 1, pageSize: 6, sort: 'sales' })
    hotProducts.value = result.data || []
  } catch (e) {
    console.error('Load hot products failed:', e)
    hotProducts.value = []
  }
}

async function loadNewProducts() {
  try {
    const result = await productApi.getProducts({ page: 1, pageSize: 6, sort: 'newest' })
    newProducts.value = result.data || []
  } catch (e) {
    console.error('Load new products failed:', e)
    newProducts.value = []
  }
}

async function loadCategories() {
  try {
    if (categoryStore.categories.length === 0) {
      await categoryStore.fetchCategories()
    }
    categories.value = categoryStore.categories.slice(0, 10)
  } catch (e) {
    console.error('Load categories failed:', e)
    categories.value = []
  }
}

async function loadFlashSales() {
  try {
    const result = await flashSaleApi.getActiveSales()
    const sales = result.data || result || []
    
    if (sales.length > 0) {
      const firstSale = sales[0]
      flashSaleEndTime.value = firstSale.end_time || firstSale.endTime || ''
      const detailResult = await flashSaleApi.getSaleDetail(firstSale.id)
      const saleData = detailResult.data || detailResult || {}
      const items = saleData.items || saleData || []
      flashSales.value = items.map(item => ({
        id: item.id,
        name: item.product_name || item.name || '',
        image: item.product_image || item.image || '/static/images/placeholder.svg',
        flash_price: item.flash_price || item.flashPrice || 0,
        original_price: item.original_price || item.originalPrice || 0,
        stock: item.stock || 0,
        sold_count: item.sold_count || item.sold || 0,
        progress: parseFloat(item.progress) || 0,
      }))
    } else {
      flashSales.value = []
      flashSaleEndTime.value = ''
    }
  } catch (e) {
    console.error('Load flash sales failed:', e)
    flashSales.value = []
    flashSaleEndTime.value = ''
  }
}

async function loadCoupons() {
  try {
    const result = await couponStore.fetchCoupons()
    coupons.value = result.slice(0, 5)
  } catch (e) {
    console.error('Load coupons failed:', e)
    coupons.value = []
  }
}

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  page.value++
  try {
    const result = await productApi.getProducts({ page: page.value, pageSize })
    const list = result.data || []
    if (list.length < pageSize) {
      hasMore.value = false
    }
    if (hotProducts.value.length < newProducts.value.length) {
      hotProducts.value = [...hotProducts.value, ...list]
    } else {
      newProducts.value = [...newProducts.value, ...list]
    }
  } catch (e) {
    console.error('Load more failed:', e)
  } finally {
    loadingMore.value = false
  }
}

function getProgress(item) {
  const sold = item.sold_count || item.sold || 0
  const total = item.stock || 100
  return Math.min(100, Math.round((sold / total) * 100))
}

function formatExpire(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}截止`
}

function goSearch() {
  uni.navigateTo({ url: '/pages/search/search' })
}

function goCategory(categoryId) {
  uni.navigateTo({ url: `/pages/product/list?categoryId=${categoryId}` })
}

function goProductList(type) {
  const url = type === 'hot' 
    ? '/pages/product/list?sort=sales' 
    : '/pages/product/list?sort=newest'
  uni.navigateTo({ url })
}

function goProductDetail(productId) {
  uni.navigateTo({ url: `/pages/product/detail?id=${productId}` })
}

function goCoupon() {
  uni.navigateTo({ url: '/pages/coupon/coupon-list' })
}

function goFlashSale() {
  uni.navigateTo({ url: '/pages/flash-sale/flash-sale' })
}

function handleBannerClick(banner) {
  if (banner.link) {
    uni.navigateTo({ url: banner.link })
  }
}

function handleFeatureClick(feature) {
  uni.navigateTo({ url: feature.path })
}
</script>

<style lang="scss" scoped>
.home-page {
  min-height: 100vh;
  background: $bg-color-page;
}

.home-logo {
  width: 56rpx;
  height: 56rpx;
  background: $primary-color;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: $font-weight-bold;
  color: $color-white;
}

.home-search-bar {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 $spacing-sm;
  padding: $spacing-2 $spacing-md;
  background-color: $bg-color-page;
  border-radius: $radius-full;
  height: 72rpx;
}

.home-search-icon {
  font-size: $font-size-sm;
  margin-right: $spacing-xs;
}

.home-search-placeholder {
  font-size: $font-size-sm;
  color: $text-color-placeholder;
}

.home-content {
  padding-bottom: 120rpx;
}

.home-skeleton {
  padding: $spacing-4;

  .skeleton-grid {
    display: flex;
    gap: $spacing-3;
    margin-top: $spacing-4;
  }

  .skeleton-section {
    margin-top: $spacing-4;

    .skeleton-product-grid {
      display: flex;
      flex-wrap: wrap;
      gap: $spacing-3;
      margin-top: $spacing-3;

      .gexm-skeleton {
        width: calc(50% - 8rpx);
        height: 400rpx;
      }
    }
  }
}

.home-swiper {
  width: 100%;
  height: 360rpx;
  background: $gray-100;
}

.swiper-image {
  width: 100%;
  height: 100%;
  display: block;
}

.feature-grid {
  display: flex;
  padding: $spacing-4;
  background-color: $bg-color-white;
  margin: $spacing-4;
  border-radius: $radius-xl;
  box-shadow: $shadow-sm;
}

.feature-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;

  &:active {
    opacity: 0.7;
  }
}

.feature-icon-wrapper {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: $spacing-2;
}

.feature-icon {
  font-size: 44rpx;
}

.feature-label {
  font-size: $font-size-xs;
  color: $text-color-secondary;
}

.category-scroll {
  background: $bg-color-white;
  margin: 0 $spacing-4 $spacing-4;
  border-radius: $radius-xl;
  padding: $spacing-4;
  box-shadow: $shadow-sm;
}

.category-scroll-view {
  white-space: nowrap;
}

.category-list {
  display: inline-flex;
  gap: $spacing-md;
}

.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100rpx;

  &:active {
    opacity: 0.7;
  }
}

.category-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: $gray-100;
}

.category-name {
  font-size: $font-size-xs;
  color: $text-color-secondary;
  margin-top: $spacing-2;
  white-space: normal;
  text-align: center;
}

.product-section {
  padding: $spacing-4;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-3;
}

.section-title {
  font-size: $font-size-lg;
  font-weight: $font-weight-semibold;
  color: $text-color-primary;
}

.section-more {
  font-size: $font-size-sm;
  color: $text-color-placeholder;
}

.product-grid {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-3;

  :deep(.gexm-product-card) {
    width: calc(50% - 8rpx);
  }
}

.flash-sale-section {
  padding: $spacing-4;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(249, 115, 22, 0.05) 100%);
  margin: 0 $spacing-4 $spacing-4;
  border-radius: $radius-xl;
  border: 1rpx solid rgba(239, 68, 68, 0.1);
}

.flash-sale-countdown {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
}

.countdown-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.countdown-num {
  width: 48rpx;
  height: 48rpx;
  background: $color-danger;
  color: $color-white;
  font-size: $font-size-sm;
  font-weight: $font-weight-bold;
  border-radius: $radius-sm;
  display: flex;
  align-items: center;
  justify-content: center;
}

.countdown-label {
  font-size: 18rpx;
  color: $text-color-placeholder;
  margin-top: 4rpx;
}

.countdown-separator {
  font-size: $font-size-md;
  color: $color-danger;
  font-weight: $font-weight-bold;
}

.flash-sale-scroll {
  margin: 0 - $spacing-4;
  padding: 0 $spacing-4;
  white-space: nowrap;
}

.flash-sale-list {
  display: inline-flex;
  gap: $spacing-3;
}

.flash-sale-item {
  width: 240rpx;
  background: $bg-color-white;
  border-radius: $radius-lg;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: $shadow-sm;

  &:active {
    opacity: 0.8;
  }
}

.flash-sale-image {
  width: 240rpx;
  height: 240rpx;
  background: $gray-100;
}

.flash-sale-info {
  padding: $spacing-3;
}

.flash-sale-name {
  display: block;
  font-size: $font-size-xs;
  color: $text-color-primary;
  line-height: $line-height-snug;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  overflow: hidden;
}

.flash-sale-price-row {
  display: flex;
  align-items: baseline;
  gap: $spacing-xs;
  margin-top: $spacing-2;
}

.flash-sale-price {
  font-size: $font-size-lg;
  font-weight: $font-weight-bold;
  color: $color-danger;
}

.flash-sale-original-price {
  font-size: $font-size-xs;
  color: $text-color-placeholder;
  text-decoration: line-through;
}

.flash-sale-progress {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  margin-top: $spacing-2;
}

.flash-sale-progress-bar {
  flex: 1;
  height: 8rpx;
  background: $color-danger;
  border-radius: 4rpx;
}

.flash-sale-progress-text {
  font-size: 18rpx;
  color: $color-danger;
  white-space: nowrap;
}

.coupon-section {
  padding: $spacing-4;
}

.coupon-scroll {
  margin: 0 - $spacing-4;
  padding: 0 $spacing-4;
  white-space: nowrap;
}

.coupon-list {
  display: inline-flex;
  gap: $spacing-3;
}

.coupon-item {
  display: flex;
  background: $bg-color-white;
  border-radius: $radius-lg;
  overflow: hidden;
  border: 2rpx solid $border-color-lighter;
  flex-shrink: 0;
  width: 360rpx;

  &:active {
    border-color: $warning-color;
    background: rgba(255, 193, 7, 0.05);
  }
}

.coupon-left {
  width: 140rpx;
  background: linear-gradient(135deg, $warning-color 0%, $color-warning-dark 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: $spacing-3;
}

.coupon-symbol {
  font-size: $font-size-sm;
  color: $color-white;
  font-weight: $font-weight-semibold;
  line-height: 1;
}

.coupon-price {
  font-size: 48rpx;
  color: $color-white;
  font-weight: $font-weight-bold;
  line-height: 1;
}

.coupon-condition {
  font-size: $font-size-xs;
  color: rgba(255, 255, 255, 0.8);
  margin-top: $spacing-2;
}

.coupon-right {
  flex: 1;
  padding: $spacing-3;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.coupon-name {
  font-size: $font-size-sm;
  color: $text-color-primary;
  font-weight: $font-weight-medium;
}

.coupon-expire {
  font-size: $font-size-xs;
  color: $text-color-placeholder;
}

.loading-more {
  padding: $spacing-6;
}

.no-more {
  text-align: center;
  padding: $spacing-6;
  font-size: $font-size-xs;
  color: $text-color-placeholder;
}
</style>