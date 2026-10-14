<template>
  <view class="product-detail">
    <!-- 导航栏 -->
    <gexm-nav-bar title="商品详情">
      <template #right>
        <text class="nav-share" @click="handleShare">分享</text>
      </template>
    </gexm-nav-bar>

    <!-- 主内容区 -->
    <scroll-view class="detail-content" scroll-y>
      <!-- 骨架屏 -->
      <view v-if="loading" class="skeleton-detail">
        <view class="skeleton-swiper">
          <gexm-skeleton :width="100" :height="400" />
        </view>
        <view class="skeleton-price card">
          <gexm-skeleton :width="120" :height="40" />
          <gexm-skeleton :width="80" :height="20" />
          <gexm-skeleton :width="150" :height="16" />
        </view>
        <view class="skeleton-info card">
          <gexm-skeleton :width="80" :height="24" />
          <gexm-skeleton :width="60" :height="16" />
        </view>
        <view class="skeleton-sku card">
          <gexm-skeleton :width="40" :height="16" />
          <gexm-skeleton :width="100" :height="16" />
        </view>
        <view class="skeleton-service card">
          <gexm-skeleton :width="80" :height="16" />
          <gexm-skeleton :width="80" :height="16" />
          <gexm-skeleton :width="80" :height="16" />
        </view>
        <view class="skeleton-tab card">
          <gexm-skeleton :width="60" :height="18" />
          <gexm-skeleton :width="60" :height="18" />
          <gexm-skeleton :width="60" :height="18" />
          <view class="skeleton-tab-content">
            <gexm-skeleton :width="100" :height="200" />
          </view>
        </view>
      </view>

      <!-- 轮播图 -->
      <swiper
        class="detail-swiper"
        :indicator-dots="true"
        indicator-color="rgba(255,255,255,0.4)"
        indicator-active-color="#ffffff"
        circular
        @change="onSwiperChange"
      >
        <swiper-item
          v-for="(img, index) in productImages"
          :key="index"
          @click="previewImage(index)"
        >
          <gexm-image-lazy
            class="swiper-image"
            :src="img"
            mode="aspectFill"
            shape="none"
            :lazy="index > 0"
            error-image="/static/images/placeholder.svg"
          />
        </swiper-item>
      </swiper>

      <!-- 价格区域 -->
      <view class="price-section card">
        <view class="price-row">
          <view class="current-price">
            <text class="price-symbol">¥</text>
            <text class="price-value">{{ displayPrice }}</text>
          </view>
          <text v-if="originalPrice" class="original-price">¥{{ originalPrice }}</text>
        </view>
        <view class="sales-row">
          <text class="sales-count">已售 {{ product.sales_count || product.sales || 0 }} 件</text>
          <text class="review-count" @click="goReviewList">{{ reviewTotal }} 条评价 ›</text>
        </view>
      </view>

      <!-- 商品信息 -->
      <view class="product-info card">
        <text class="product-name">{{ product.name || product.title }}</text>
        <text v-if="product.subtitle" class="product-subtitle">{{ product.subtitle }}</text>
      </view>

      <!-- 规格选择 -->
      <view class="sku-selector-row card" @click="showSkuPopup = true">
        <text class="sku-label">选择</text>
        <text class="sku-value">{{ selectedSpecsText || '请选择规格' }}</text>
        <text class="sku-arrow">›</text>
      </view>

      <!-- 服务保障 -->
      <view class="service-row card">
        <view class="service-item">
          <text class="service-icon">✓</text>
          <text class="service-text">正品保证</text>
        </view>
        <view class="service-item">
          <text class="service-icon">✓</text>
          <text class="service-text">7天无理由</text>
        </view>
        <view class="service-item">
          <text class="service-icon">✓</text>
          <text class="service-text">极速发货</text>
        </view>
      </view>

      <!-- Tab 内容区 -->
      <view class="tab-section card">
        <view class="tab-header">
          <view
            v-for="(tab, index) in tabs"
            :key="index"
            class="tab-item"
            :class="{ active: activeTab === index }"
            @click="activeTab = index"
          >
            <text>{{ tab }}</text>
            <view v-if="activeTab === index" class="tab-indicator" />
          </view>
        </view>
        <view class="tab-content">
          <!-- 商品详情 -->
          <view v-if="activeTab === 0" class="tab-detail">
            <view v-if="product.description" class="detail-text">
              <text>{{ product.description }}</text>
            </view>
            <image
              v-for="(img, index) in detailImages"
              :key="index"
              class="detail-image"
              :src="img"
              mode="widthFix"
            />
            <text v-if="detailImages.length === 0 && !product.description" class="no-detail">
              暂无商品详情
            </text>
          </view>
          <!-- 规格参数 -->
          <view v-else-if="activeTab === 1" class="tab-specs">
            <view v-for="(spec, index) in specList" :key="index" class="spec-item">
              <text class="spec-label">{{ spec.label }}</text>
              <text class="spec-value">{{ spec.value }}</text>
            </view>
            <text v-if="specList.length === 0" class="no-detail">暂无规格参数</text>
          </view>
          <!-- 用户评价 -->
          <view v-else-if="activeTab === 2" class="tab-reviews">
            <view class="review-header" @click="goReviewList">
              <view class="review-title">
                <text class="title-text">用户评价</text>
                <text class="review-count-text">({{ reviewTotal }})</text>
              </view>
              <text class="view-all">查看全部 ›</text>
            </view>
            <view v-if="reviewsLoading && reviews.length === 0" class="reviews-loading">
              <gexm-loading text="加载评价中..." />
            </view>
            <view v-else>
              <view
                v-for="(review, index) in reviews.slice(0, 3)"
                :key="review.id || index"
                class="review-item"
              >
                <view class="review-header-row">
                  <view class="review-user-info">
                    <view class="review-avatar">
                      {{ (review.nickname || review.user_name || '用').charAt(0) }}
                    </view>
                    <view class="review-user-detail">
                      <text class="review-user">
                        {{ review.nickname || review.user_name || '匿名用户' }}
                      </text>
                      <text class="review-rating">{{ '⭐'.repeat(review.rating || 5) }}</text>
                    </view>
                  </view>
                  <text v-if="review.created_at" class="review-time">
                    {{ formatDate(review.created_at) }}
                  </text>
                </view>
                <text class="review-content">{{ review.content }}</text>
                <view v-if="review.images && review.images.length > 0" class="review-images">
                  <image
                    v-for="(img, imgIndex) in review.images"
                    :key="imgIndex"
                    class="review-image"
                    :src="img"
                    mode="aspectFill"
                    @click="previewReviewImage(imgIndex, review.images)"
                  />
                </view>
              </view>
              <text v-if="reviews.length === 0" class="no-detail">暂无用户评价</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 相关推荐 -->
      <view v-if="relatedProducts.length > 0" class="related-section card">
        <view class="section-header">
          <text class="section-title">相关推荐</text>
          <text class="section-more">更多 ›</text>
        </view>
        <scroll-view scroll-x class="related-scroll" show-scrollbar="false">
          <view class="related-list">
            <view
              v-for="item in relatedProducts"
              :key="item.id"
              class="related-item"
              @click="goToRelatedDetail(item.id)"
            >
              <image
                class="related-image"
                :src="item.image || item.cover_image || item.cover"
                mode="aspectFill"
              />
              <view class="related-info">
                <text class="related-name">{{ item.name || item.title }}</text>
                <text class="related-price">
                  <text class="price-symbol">¥</text>
                  <text class="price-num">{{ (item.price || 0).toFixed(2) }}</text>
                </text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 底部间距 -->
      <view class="bottom-space" />
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar">
      <view class="bar-left">
        <view class="bar-item" @click="handleService">
          <text class="bar-icon">💬</text>
          <text class="bar-text">客服</text>
        </view>
        <view class="bar-item" @click="toggleFavorite">
          <text class="bar-icon">{{ isFavorited ? '❤️' : '🤍' }}</text>
          <text class="bar-text">收藏</text>
        </view>
        <view class="bar-item" @click="goCart">
          <text class="bar-icon">🛒</text>
          <text class="bar-text">购物车</text>
          <view v-if="cartCount > 0" class="cart-badge">
            {{ cartCount > 99 ? '99+' : cartCount }}
          </view>
        </view>
      </view>
      <view class="bar-right">
        <view class="btn-cart" @click="handleAddToCart">加入购物车</view>
        <view class="btn-buy" @click="handleBuyNow">立即购买</view>
      </view>
    </view>

    <!-- SKU 选择弹窗 -->
    <gexm-sku-selector
      :show="showSkuPopup"
      :product="product"
      :skus="skus"
      @close="showSkuPopup = false"
      @add-to-cart="onSkuAddToCart"
      @buy-now="onSkuBuyNow"
    />
  </view>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { onLoad, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import { useProductStore } from '@/store/product'
import { useFavoriteStore } from '@/store/favorite'
import { useCartStore } from '@/store/cart'
import { useOrderStore } from '@/store/order'
import reviewApi from '@/api/review'
import productApi from '@/api/product'

const productStore = useProductStore()
const favoriteStore = useFavoriteStore()
const cartStore = useCartStore()
const orderStore = useOrderStore()

const loading = ref(true)
const productId = ref('')
const activeTab = ref(0)
const showSkuPopup = ref(false)
const quantity = ref(1)
const isFavorited = ref(false)
const reviewsLoading = ref(false)
const reviews = ref([])
const reviewTotal = ref(0)
const reviewStats = ref(null)
const currentImageIndex = ref(0)
const relatedProducts = ref([])
const relatedLoading = ref(false)

const selectedSpecs = reactive({})

const tabs = ['商品详情', '规格参数', '用户评价']

const product = computed(() => productStore.currentProduct || {})
const skus = computed(() => productStore.skus || [])
const cartCount = computed(() => cartStore.cartCount)

const productImages = computed(() => {
  const p = product.value
  if (p.images && p.images.length > 0) return p.images
  if (p.image) return [p.image]
  if (p.cover_image) return [p.cover_image]
  return ['/static/images/placeholder.svg']
})

const detailImages = computed(() => {
  const p = product.value
  if (p.detail_images && p.detail_images.length > 0) return p.detail_images
  return []
})

const originalPrice = computed(() => {
  const p = product.value
  return p.original_price || p.market_price || ''
})

const displayPrice = computed(() => {
  const price = product.value.price || product.value.sale_price || 0
  return Number(price).toFixed(2)
})

const selectedSpecsText = computed(() => {
  const values = Object.values(selectedSpecs)
  if (values.length === 0) return ''
  return values.join(' / ')
})

const specList = computed(() => {
  const p = product.value
  if (p.specs) {
    return Object.entries(p.specs).map(([label, value]) => ({ label, value }))
  }
  return []
})

function formatDate(dateStr) {
  if (!dateStr) return ''
  return dateStr.split('T')[0]
}

function onSwiperChange(e) {
  currentImageIndex.value = e.detail.current
}

function previewImage(index) {
  uni.previewImage({
    current: index,
    urls: productImages.value,
  })
}

function previewReviewImage(index, images) {
  uni.previewImage({
    current: index,
    urls: images,
  })
}

async function loadReviews() {
  if (reviewsLoading.value) return
  reviewsLoading.value = true
  try {
    const [listResult, statsResult] = await Promise.all([
      reviewApi.getProductReviews(productId.value, { page: 1, pageSize: 10 }),
      reviewApi.getProductReviewStats(productId.value).catch(() => null),
    ])
    reviews.value = listResult.data || listResult.list || []
    reviewTotal.value = listResult.total || reviews.value.length
    reviewStats.value = statsResult
  } catch (e) {
    console.error('Load reviews failed:', e)
  } finally {
    reviewsLoading.value = false
  }
}

onLoad((options) => {
  if (options.id) {
    productId.value = options.id
    loadDetail()
  }
})

async function loadDetail() {
  loading.value = true
  try {
    await Promise.all([
      productStore.fetchProductDetail(productId.value),
      favoriteStore
        .checkFavorite(productId.value)
        .then((favorited) => {
          isFavorited.value = favorited
        })
        .catch(() => {
          isFavorited.value = false
        }),
      loadReviews(),
      loadRelatedProducts(),
    ])
  } catch (e) {
    console.error('Load product detail failed:', e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function loadRelatedProducts() {
  relatedLoading.value = true
  try {
    const result = await productApi.getRelatedProducts(productId.value, { page: 1, pageSize: 10 })
    relatedProducts.value = result.data || result.list || result || []
  } catch (e) {
    console.error('Load related products failed:', e)
    relatedProducts.value = []
  } finally {
    relatedLoading.value = false
  }
}

function goToRelatedDetail(id) {
  if (!id) return
  uni.redirectTo({ url: `/pages/product/detail?id=${id}` })
}

async function toggleFavorite() {
  try {
    await favoriteStore.toggleFavorite(productId.value, isFavorited.value)
    isFavorited.value = !isFavorited.value
    uni.showToast({
      title: isFavorited.value ? '已收藏' : '已取消收藏',
      icon: 'none',
    })
  } catch (e) {
    console.error('Toggle favorite failed:', e)
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

function handleAddToCart() {
  showSkuPopup.value = true
}

function handleBuyNow() {
  showSkuPopup.value = true
}

async function onSkuAddToCart(data) {
  try {
    const skuId = data.sku?.id
    await cartStore.addToCart(productId.value, skuId, data.quantity)
    showSkuPopup.value = false
    uni.showToast({ title: '已加入购物车', icon: 'success' })
  } catch (e) {
    console.error('Add to cart failed:', e)
    uni.showToast({ title: '加入购物车失败', icon: 'none' })
  }
}

async function onSkuBuyNow(data) {
  try {
    const skuId = data.sku?.id
    const skuName = data.selectedSpecs
      ? Object.values(data.selectedSpecs)
          .map((s) => s.name || s.value || s)
          .join(' / ')
      : ''
    const items = [
      {
        productId: productId.value,
        skuId: skuId,
        name: product.value.name || product.value.title,
        image: productImages.value[0],
        price: Number(displayPrice.value),
        quantity: data.quantity,
        spec: skuName,
        skuName: skuName,
      },
    ]
    orderStore.previewData = { items, shippingFee: 0, discountAmount: 0 }
    showSkuPopup.value = false
    uni.navigateTo({ url: '/pages/order/order-confirm?from=buyNow' })
  } catch (e) {
    console.error('Buy now failed:', e)
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

function handleService() {
  uni.showToast({ title: '功能开发中', icon: 'none' })
}

function goCart() {
  uni.switchTab({ url: '/pages/cart/cart' })
}

function goReviewList() {
  uni.navigateTo({ url: `/pages/review/review-list?productId=${productId.value}` })
}

function handleShare() {
  uni.showShareMenu({
    withShareTicket: true,
    menus: ['shareAppMessage', 'shareTimeline'],
  })
  uni.showToast({ title: '请点击右上角分享', icon: 'none' })
}

onShareAppMessage(() => {
  return {
    title: product.value.name || product.value.title || '商品详情',
    path: `/pages/product/detail?id=${productId.value}`,
    imageUrl: productImages.value[0] || '',
  }
})

onShareTimeline(() => {
  return {
    title: product.value.name || product.value.title || '商品详情',
    imageUrl: productImages.value[0] || '',
  }
})
</script>

<style lang="scss" scoped>
.product-detail {
  min-height: 100vh;
  background: $bg-color-page;
  display: flex;
  flex-direction: column;
}

// ===================================
// 导航栏
// ===================================

.nav-share {
  font-size: $font-size-sm;
  color: $primary-color;
  font-weight: $font-weight-medium;
}

// ===================================
// 内容区域
// ===================================

.detail-content {
  flex: 1;
  height: 0;
}

// ===================================
// 轮播图
// ===================================

.detail-swiper {
  width: 100%;
  height: 750rpx;
  background: $gray-100;
}

.swiper-image {
  width: 100%;
  height: 100%;
  display: block;
}

// ===================================
// 卡片容器
// ===================================

.card {
  background: $bg-color-white;
  margin-top: $spacing-4;
  padding: $spacing-6;
  border-radius: $radius-xl;
  box-shadow: $shadow-sm;
}

// ===================================
// 价格区域
// ===================================

.price-section {
  margin-top: $spacing-4;
}

.price-row {
  display: flex;
  align-items: baseline;
}

.current-price {
  display: flex;
  align-items: baseline;
  color: $color-danger;
}

.price-symbol {
  font-size: $font-size-sm;
  font-weight: $font-weight-semibold;
}

.price-value {
  font-size: 52rpx;
  font-weight: $font-weight-bold;
  margin-left: 4rpx;
  letter-spacing: -1rpx;
}

.original-price {
  margin-left: $spacing-4;
  font-size: $font-size-sm;
  color: $text-color-placeholder;
  text-decoration: line-through;
}

.sales-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: $spacing-3;
  padding-top: $spacing-3;
  border-top: 1rpx solid $gray-100;
}

.sales-count {
  font-size: $font-size-xs;
  color: $text-color-secondary;
}

.review-count {
  font-size: $font-size-xs;
  color: $text-color-secondary;

  &:active {
    color: $primary-color;
  }
}

// ===================================
// 商品信息
// ===================================

.product-name {
  display: block;
  font-size: $font-size-md;
  font-weight: $font-weight-semibold;
  color: $text-color-primary;
  line-height: $line-height-snug;
}

.product-subtitle {
  display: block;
  margin-top: $spacing-2;
  font-size: $font-size-sm;
  color: $text-color-secondary;
  line-height: $line-height-normal;
}

// ===================================
// 规格选择
// ===================================

.sku-selector-row {
  display: flex;
  align-items: center;
  transition: all $duration-fast $ease-out;

  &:active {
    background: $gray-50;
  }
}

.sku-label {
  font-size: $font-size-sm;
  color: $text-color-secondary;
  width: 100rpx;
}

.sku-value {
  flex: 1;
  font-size: $font-size-sm;
  color: $text-color-primary;
  text-align: right;
}

.sku-arrow {
  font-size: $font-size-lg;
  color: $text-color-placeholder;
  margin-left: $spacing-2;
}

// ===================================
// 服务保障
// ===================================

.service-row {
  display: flex;
  gap: $spacing-8;
}

.service-item {
  display: flex;
  align-items: center;
  gap: $spacing-2;
}

.service-icon {
  font-size: $font-size-sm;
  color: $color-success;
}

.service-text {
  font-size: $font-size-xs;
  color: $text-color-secondary;
}

// ===================================
// Tab 区域
// ===================================

.tab-section {
  margin-top: $spacing-4;
  border-radius: $radius-xl;
  overflow: hidden;
}

.tab-header {
  display: flex;
  border-bottom: 1rpx solid $gray-100;
  padding: 0 $spacing-6;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: $spacing-4 0;
  position: relative;
  font-size: $font-size-base;
  color: $text-color-secondary;
  transition: all $duration-fast $ease-out;

  &.active {
    color: $primary-color;
    font-weight: $font-weight-semibold;
  }

  &:active {
    opacity: 0.7;
  }
}

.tab-indicator {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 48rpx;
  height: 4rpx;
  background: $primary-color;
  border-radius: 2rpx;
}

.tab-content {
  padding: $spacing-6;
}

// ===================================
// 详情内容
// ===================================

.detail-text {
  font-size: $font-size-sm;
  color: $text-color-secondary;
  line-height: $line-height-relaxed;
  margin-bottom: $spacing-4;
}

.tab-detail {
  .detail-image {
    width: 100%;
    display: block;
    margin-bottom: $spacing-2;
    border-radius: $radius-base;
  }
}

.no-detail {
  display: block;
  text-align: center;
  padding: $spacing-xl 0;
  color: $text-color-placeholder;
  font-size: $font-size-sm;
}

// ===================================
// 规格参数
// ===================================

.tab-specs {
  .spec-item {
    display: flex;
    padding: $spacing-4 0;
    border-bottom: 1rpx solid $gray-100;

    &:last-child {
      border-bottom: none;
    }
  }

  .spec-label {
    width: 160rpx;
    font-size: $font-size-sm;
    color: $text-color-secondary;
    flex-shrink: 0;
  }

  .spec-value {
    flex: 1;
    font-size: $font-size-sm;
    color: $text-color-primary;
  }
}

// ===================================
// 用户评价
// ===================================

.tab-reviews {
  .review-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $spacing-4;
    padding-bottom: $spacing-4;
    border-bottom: 1rpx solid $gray-100;

    &:active {
      opacity: 0.7;
    }
  }

  .review-title {
    display: flex;
    align-items: baseline;
    gap: $spacing-2;
  }

  .title-text {
    font-size: $font-size-base;
    font-weight: $font-weight-semibold;
    color: $text-color-primary;
  }

  .review-count-text {
    font-size: $font-size-sm;
    color: $text-color-placeholder;
  }

  .view-all {
    font-size: $font-size-sm;
    color: $text-color-secondary;
  }

  .review-item {
    padding: $spacing-4 0;
    border-bottom: 1rpx solid $gray-100;

    &:last-child {
      border-bottom: none;
    }
  }

  .review-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $spacing-3;
  }

  .review-user-info {
    display: flex;
    align-items: center;
    gap: $spacing-3;
  }

  .review-avatar {
    width: 72rpx;
    height: 72rpx;
    border-radius: 50%;
    background: linear-gradient(135deg, $primary-color 0%, $primary-color-light 100%);
    color: $color-white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: $font-size-base;
    font-weight: $font-weight-medium;
  }

  .review-user-detail {
    display: flex;
    flex-direction: column;
    gap: 4rpx;
  }

  .review-user {
    font-size: $font-size-sm;
    color: $text-color-primary;
  }

  .review-rating {
    font-size: 20rpx;
  }

  .review-time {
    font-size: $font-size-xs;
    color: $text-color-placeholder;
  }

  .review-content {
    font-size: $font-size-sm;
    color: $text-color-secondary;
    line-height: $line-height-relaxed;
  }

  .review-images {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-3;
    margin-top: $spacing-3;
  }

  .review-image {
    width: 180rpx;
    height: 180rpx;
    border-radius: $radius-base;
    background: $gray-100;
  }
}

.reviews-loading {
  padding: $spacing-8 0;
}

// ===================================
// 底部间距
// ===================================

.bottom-space {
  height: 180rpx;
}

// ===================================
// 底部操作栏
// ===================================

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: $tab-bar-height;
  background: rgba($color-white, 0.98);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  display: flex;
  align-items: center;
  padding: 0 $spacing-6;
  border-top: 1rpx solid $gray-100;
  padding-bottom: $safe-area-bottom;
  z-index: $z-index-fixed;
  box-shadow: 0 -2rpx 16rpx rgba(0, 0, 0, 0.05);
}

.bar-left {
  display: flex;
  align-items: center;
}

.bar-item {
  width: 100rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all $duration-fast $ease-out;

  &:active {
    opacity: 0.7;
    transform: scale(0.95);
  }
}

.bar-icon {
  font-size: 44rpx;
}

.bar-text {
  font-size: $font-size-xs;
  color: $text-color-secondary;
  margin-top: 2rpx;
}

.cart-badge {
  position: absolute;
  top: -8rpx;
  right: 12rpx;
  min-width: 32rpx;
  height: 32rpx;
  background: $color-danger;
  color: $color-white;
  font-size: 18rpx;
  font-weight: $font-weight-bold;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6rpx;
  border: 2rpx solid $color-white;
}

.bar-right {
  flex: 1;
  display: flex;
  gap: $spacing-3;
  margin-left: $spacing-6;
}

.btn-cart,
.btn-buy {
  flex: 1;
  height: $button-height-base;
  border-radius: $radius-full;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: $font-size-sm;
  font-weight: $font-weight-semibold;
  transition: all $duration-fast $ease-out;

  &:active {
    opacity: 0.9;
    transform: scale(0.98);
  }
}

.btn-cart {
  background: $color-warning;
  color: $color-white;
}

.btn-buy {
  background: linear-gradient(135deg, $color-danger 0%, $color-danger-light 100%);
  color: $color-white;
}

// ===================================
// 响应式适配
// ===================================

@media screen and (max-width: #{$breakpoint-sm - 1px}) {
  .price-value {
    font-size: 44rpx;
  }

  .bar-item {
    width: 80rpx;
  }

  .bar-icon {
    font-size: 38rpx;
  }

  .bar-text {
    font-size: 18rpx;
  }
}

@media screen and (min-width: $breakpoint-lg) {
  .detail-content {
    max-width: 800px;
    margin: 0 auto;
  }

  .bottom-bar {
    max-width: 800px;
    margin: 0 auto;
    left: auto;
    right: auto;
    border-radius: $radius-xl $radius-xl 0 0;
  }
}

// ===================================
// 骨架屏样式
// ===================================

.skeleton-detail {
  .skeleton-swiper {
    width: 100%;
    height: 750rpx;
    background: $gray-100;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: $spacing-4;
  }

  .skeleton-price,
  .skeleton-info,
  .skeleton-sku,
  .skeleton-service,
  .skeleton-tab {
    display: flex;
    flex-direction: column;
    gap: $spacing-4;
  }

  .skeleton-price {
    gap: $spacing-3;
  }

  .skeleton-service {
    flex-direction: row;
    justify-content: space-between;
  }

  .skeleton-tab {
    gap: $spacing-6;
  }

  .skeleton-tab-content {
    padding-top: $spacing-4;
  }
}

// ===================================
// 相关推荐
// ===================================

.related-section {
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $spacing-4;
  }

  .section-title {
    font-size: $font-size-base;
    font-weight: $font-weight-semibold;
    color: $text-color-primary;
  }

  .section-more {
    font-size: $font-size-xs;
    color: $text-color-placeholder;
  }
}

.related-scroll {
  margin: 0 (-$spacing-6);
  padding: 0 $spacing-6;
  white-space: nowrap;
}

.related-list {
  display: inline-flex;
  gap: $spacing-3;
  padding-right: $spacing-6;
}

.related-item {
  width: 200rpx;
  flex-shrink: 0;
  background: $bg-color-page;
  border-radius: $radius-base;
  overflow: hidden;

  &:active {
    opacity: 0.8;
  }
}

.related-image {
  width: 200rpx;
  height: 200rpx;
  background: $gray-100;
}

.related-info {
  padding: $spacing-2 $spacing-3;
}

.related-name {
  display: block;
  font-size: $font-size-xs;
  color: $text-color-primary;
  line-height: $line-height-normal;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  white-space: normal;
  min-height: 60rpx;
}

.related-price {
  display: flex;
  align-items: baseline;
  margin-top: $spacing-2;

  .price-symbol {
    font-size: 20rpx;
    color: $danger-color;
    font-weight: $font-weight-semibold;
  }

  .price-num {
    font-size: $font-size-sm;
    color: $danger-color;
    font-weight: $font-weight-bold;
  }
}
</style>
