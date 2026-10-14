<template>
  <view class="cart-page">
    <!-- 导航栏 -->
    <gexm-nav-bar title="购物车">
      <template #right>
        <text v-if="hasItems" class="cart-edit-btn" @click="toggleEditMode">
          {{ isEditMode ? '完成' : '编辑' }}
        </text>
      </template>
    </gexm-nav-bar>

    <!-- 加载状态 -->
    <view v-if="loading" class="cart-skeleton">
      <view v-for="i in 3" :key="i" class="cart-skeleton-item">
        <gexm-skeleton mode="rect" width="60rpx" height="60rpx" class="cart-skeleton-checkbox" />
        <gexm-skeleton mode="rect" width="200rpx" height="200rpx" class="cart-skeleton-image" />
        <view class="cart-skeleton-info">
          <gexm-skeleton mode="rect" width="100%" height="40rpx" />
          <gexm-skeleton mode="rect" width="60%" height="32rpx" />
          <view class="cart-skeleton-bottom">
            <gexm-skeleton mode="rect" width="100rpx" height="36rpx" />
            <gexm-skeleton mode="rect" width="180rpx" height="48rpx" />
          </view>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-else-if="!hasItems" class="cart-empty">
      <gexm-empty
        description="购物车空空如也"
        show-button
        button-text="去逛逛"
        @click="goShopping"
      />
    </view>

    <!-- 购物车内容 -->
    <view v-else class="cart-content">
      <!-- 优惠券入口 -->
      <view
        v-if="!isEditMode && availableCoupons.length > 0"
        class="coupon-bar"
        @click="showCouponPopup = true"
      >
        <view class="coupon-bar__left">
          <text class="coupon-bar__icon">🎫</text>
          <text class="coupon-bar__text">优惠券</text>
          <text class="coupon-bar__count">{{ availableCoupons.length }}张可用</text>
        </view>
        <view class="coupon-bar__right">
          <text v-if="selectedCoupon" class="coupon-bar__discount">
            -¥{{ selectedCoupon.discount.toFixed(2) }}
          </text>
          <text class="coupon-bar__arrow">›</text>
        </view>
      </view>

      <!-- 商品列表 -->
      <scroll-view
        scroll-y
        class="cart-list"
        :style="{ paddingBottom: bottomHeight + 'rpx' }"
        refresher-enabled
        :refresher-triggered="refreshing"
        @refresherrefresh="onRefresh"
      >
        <view v-for="item in cartItems" :key="item.id" class="cart-item-wrapper">
          <!-- 删除按钮（滑动显示） -->
          <view class="cart-item__delete" @click="handleDelete(item)">
            <text class="delete-text">删除</text>
          </view>

          <!-- 商品项 -->
          <view
            class="cart-item"
            :style="{ transform: `translateX(${-getSwipeOffset(item.id)}rpx)` }"
            @touchstart="onTouchStart($event, item.id)"
            @touchmove="onTouchMove($event, item.id)"
            @touchend="onTouchEnd($event, item.id)"
          >
            <!-- 复选框 -->
            <view class="cart-item__checkbox" @click="handleToggleSelect(item)">
              <view class="checkbox" :class="{ 'is-checked': item.selected }">
                <text v-if="item.selected" class="checkbox-icon">✓</text>
              </view>
            </view>

            <!-- 商品图片 -->
            <gexm-image-lazy
              class="cart-item__image"
              :src="item.product_image || item.image || '/static/images/placeholder.svg'"
              mode="aspectFill"
              shape="round"
              :lazy="true"
              error-image="/static/images/placeholder.svg"
              @click="goProductDetail(item)"
            />

            <!-- 商品信息 -->
            <view class="cart-item__info">
              <text class="cart-item__name ellipsis-2" @click="goProductDetail(item)">
                {{ item.product_name || item.name }}
              </text>
              <text v-if="item.sku_name || item.sku" class="cart-item__sku">
                {{ item.sku_name || item.sku }}
              </text>
              <view class="cart-item__bottom">
                <text class="cart-item__price">
                  ¥{{ (item.sku_price || item.product_price || item.price || 0).toFixed(2) }}
                </text>
                <view class="cart-item__quantity">
                  <view
                    class="quantity-btn"
                    :class="{ 'quantity-btn--disabled': item.quantity <= 1 }"
                    @click="handleDecrease(item)"
                  >
                    <text>-</text>
                  </view>
                  <text class="quantity-num">{{ item.quantity }}</text>
                  <view class="quantity-btn" @click="handleIncrease(item)">
                    <text>+</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </scroll-view>

      <!-- 底部操作栏 -->
      <view class="cart-bottom">
        <view class="cart-bottom__select" @click="handleToggleSelectAll">
          <view class="checkbox" :class="{ 'is-checked': isAllSelected }">
            <text v-if="isAllSelected" class="checkbox-icon">✓</text>
          </view>
          <text class="select-text">全选</text>
        </view>

        <view v-if="!isEditMode" class="cart-bottom__total">
          <view class="total-row">
            <text class="total-label">合计：</text>
            <text class="total-price">¥{{ finalPrice.toFixed(2) }}</text>
          </view>
          <view v-if="selectedCoupon" class="discount-row">
            <text class="discount-label">优惠：</text>
            <text class="discount-value">-¥{{ selectedCoupon.discount.toFixed(2) }}</text>
          </view>
        </view>

        <view class="cart-bottom__btn">
          <gexm-button
            v-if="!isEditMode"
            type="primary"
            round
            :disabled="selectedCount === 0"
            @click="handleCheckout"
          >
            结算({{ selectedCount }})
          </gexm-button>
          <gexm-button
            v-else
            type="danger"
            round
            :disabled="selectedCount === 0"
            @click="handleDeleteSelected"
          >
            删除({{ selectedCount }})
          </gexm-button>
        </view>
      </view>
    </view>

    <!-- 优惠券选择弹窗 -->
    <view v-if="showCouponPopup" class="coupon-popup" @click="showCouponPopup = false">
      <view class="coupon-popup__content" @click.stop>
        <view class="coupon-popup__header">
          <text class="coupon-popup__title">选择优惠券</text>
          <text class="coupon-popup__close" @click="showCouponPopup = false">✕</text>
        </view>
        <scroll-view scroll-y class="coupon-popup__body">
          <view class="coupon-list">
            <view
              class="coupon-item"
              :class="{ 'is-selected': !selectedCoupon }"
              @click="selectCoupon(null)"
            >
              <view class="coupon-item__left">
                <text class="coupon-item__price">不使用</text>
              </view>
              <view class="coupon-item__right">
                <text class="coupon-item__name">不使用优惠券</text>
                <view class="coupon-item__check" :class="{ 'is-checked': !selectedCoupon }">✓</view>
              </view>
            </view>

            <view
              v-for="coupon in availableCoupons"
              :key="coupon.id"
              class="coupon-item"
              :class="{ 'is-selected': selectedCoupon && selectedCoupon.id === coupon.id }"
              @click="selectCoupon(coupon)"
            >
              <view class="coupon-item__left">
                <text class="coupon-item__symbol">¥</text>
                <text class="coupon-item__price">{{ coupon.discount.toFixed(2) }}</text>
                <text class="coupon-item__condition">满{{ coupon.minAmount }}可用</text>
              </view>
              <view class="coupon-item__right">
                <text class="coupon-item__name">{{ coupon.name }}</text>
                <text class="coupon-item__expire">有效期至 {{ formatDate(coupon.expireAt) }}</text>
                <view
                  class="coupon-item__check"
                  :class="{ 'is-checked': selectedCoupon && selectedCoupon.id === coupon.id }"
                >
                  ✓
                </view>
              </view>
            </view>
          </view>
        </scroll-view>
        <view class="coupon-popup__footer">
          <gexm-button type="primary" size="large" block @click="confirmCoupon">
            确认选择
          </gexm-button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import { useCartStore } from '@/store/cart'
import { useAppStore } from '@/store/app'
import { couponApi } from '@/api'

const cartStore = useCartStore()
const appStore = useAppStore()

const loading = ref(false)
const refreshing = ref(false)
const isEditMode = ref(false)
const showCouponPopup = ref(false)
const selectedCoupon = ref(null)
const coupons = ref([])

const swipeStates = reactive({})
const touchStartX = ref(0)
const touchStartY = ref(0)
const currentSwipeId = ref(null)
const DELETE_WIDTH = 160

const bottomHeight = computed(() => {
  const safeAreaBottomPx = appStore.safeAreaBottom || 0
  const safeAreaBottomRpx = safeAreaBottomPx * 2
  return 120 + safeAreaBottomRpx
})

const cartItems = computed(() => cartStore.cartItems)
const hasItems = computed(() => cartStore.hasItems)
const isAllSelected = computed(() => cartStore.isAllSelected)
const totalPrice = computed(() => cartStore.totalPrice)
const selectedCount = computed(() => cartStore.selectedCount)

const availableCoupons = computed(() => {
  return coupons.value.filter((coupon) => totalPrice.value >= coupon.minAmount)
})

const finalPrice = computed(() => {
  let price = totalPrice.value
  if (selectedCoupon.value && totalPrice.value >= selectedCoupon.value.minAmount) {
    price = Math.max(0, price - selectedCoupon.value.discount)
  }
  return price
})

onShow(() => {
  loadCart()
  loadCoupons()
})

async function loadCart() {
  loading.value = true
  try {
    await cartStore.fetchCart()
  } catch (err) {
    console.error('Failed to load cart:', err)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function loadCoupons() {
  try {
    const result = await couponApi.getMine()
    coupons.value = result.data || result || []
  } catch (e) {
    console.error('Failed to load coupons:', e)
    coupons.value = []
  }
}

function toggleEditMode() {
  isEditMode.value = !isEditMode.value
  Object.keys(swipeStates).forEach((key) => {
    swipeStates[key] = 0
  })
}

function getSwipeOffset(id) {
  return swipeStates[id] || 0
}

function onTouchStart(e, id) {
  const touch = e.touches[0]
  touchStartX.value = touch.clientX
  touchStartY.value = touch.clientY
  currentSwipeId.value = id
}

function onTouchMove(e, id) {
  if (currentSwipeId.value !== id) return

  const touch = e.touches[0]
  const deltaX = touch.clientX - touchStartX.value
  const deltaY = touch.clientY - touchStartY.value

  if (Math.abs(deltaY) > Math.abs(deltaX)) return

  const currentOffset = swipeStates[id] || 0
  let newOffset = currentOffset - deltaX * 2

  if (newOffset < 0) newOffset = 0
  if (newOffset > DELETE_WIDTH) newOffset = DELETE_WIDTH

  swipeStates[id] = newOffset
  touchStartX.value = touch.clientX
}

function onTouchEnd(e, id) {
  if (currentSwipeId.value !== id) return

  const currentOffset = swipeStates[id] || 0
  if (currentOffset > DELETE_WIDTH / 2) {
    swipeStates[id] = DELETE_WIDTH
  } else {
    swipeStates[id] = 0
  }
  currentSwipeId.value = null
}

async function handleToggleSelect(item) {
  try {
    await cartStore.toggleSelect(item.id, !item.selected)
  } catch (err) {
    console.error('Failed to toggle select:', err)
  }
}

async function handleToggleSelectAll() {
  try {
    await cartStore.toggleSelectAll(!isAllSelected.value)
  } catch (err) {
    console.error('Failed to toggle select all:', err)
  }
}

async function handleDecrease(item) {
  if (item.quantity <= 1) {
    uni.showModal({
      title: '提示',
      content: '确定要删除该商品吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await cartStore.removeItem(item.id)
            uni.showToast({ title: '已删除', icon: 'success' })
          } catch (err) {
            console.error('Failed to remove item:', err)
          }
        }
      },
    })
    return
  }
  try {
    await cartStore.updateQuantity(item.id, item.quantity - 1)
  } catch (err) {
    console.error('Failed to update quantity:', err)
  }
}

async function handleIncrease(item) {
  try {
    await cartStore.updateQuantity(item.id, item.quantity + 1)
  } catch (err) {
    console.error('Failed to update quantity:', err)
  }
}

function handleDelete(item) {
  uni.showModal({
    title: '提示',
    content: '确定要删除该商品吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await cartStore.removeItem(item.id)
          swipeStates[item.id] = 0
          uni.showToast({ title: '已删除', icon: 'success' })
          if (!hasItems.value) {
            isEditMode.value = false
          }
        } catch (err) {
          console.error('Failed to remove item:', err)
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    },
  })
}

async function handleDeleteSelected() {
  if (selectedCount.value === 0) return
  uni.showModal({
    title: '提示',
    content: `确定要删除选中的${selectedCount.value}件商品吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await cartStore.removeSelected()
          uni.showToast({ title: '删除成功', icon: 'success' })
          if (!hasItems.value) {
            isEditMode.value = false
          }
        } catch (err) {
          console.error('Failed to remove selected:', err)
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    },
  })
}

function handleCheckout() {
  if (selectedCount.value === 0) return
  let url = '/pages/order/order-confirm'
  if (selectedCoupon.value) {
    url += `?couponId=${selectedCoupon.value.id}`
  }
  uni.navigateTo({ url })
}

function selectCoupon(coupon) {
  selectedCoupon.value = coupon
}

function confirmCoupon() {
  showCouponPopup.value = false
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function goShopping() {
  uni.switchTab({
    url: '/pages/index/index',
    fail: () => {
      uni.navigateTo({ url: '/pages/index/index' })
    },
  })
}

function goProductDetail(item) {
  const productId = item.product_id || item.productId
  if (productId) {
    uni.navigateTo({ url: `/pages/product/detail?id=${productId}` })
  }
}

async function onRefresh() {
  refreshing.value = true
  try {
    await cartStore.fetchCart()
  } catch (err) {
    console.error('Refresh failed:', err)
  } finally {
    refreshing.value = false
  }
}

onPullDownRefresh(() => {
  onRefresh().finally(() => {
    uni.stopPullDownRefresh()
  })
})
</script>

<style lang="scss" scoped>
.cart-page {
  min-height: 100vh;
  background: $bg-color-page;
}

// ===================================
// 编辑按钮
// ===================================

.cart-edit-btn {
  font-size: $font-size-sm;
  color: $primary-color;
  font-weight: $font-weight-medium;
}

// ===================================
// 加载/空状态
// ===================================

.cart-loading,
.cart-empty {
  padding-top: 200rpx;
}

.cart-skeleton {
  padding: $spacing-6;

  .cart-skeleton-item {
    display: flex;
    align-items: center;
    background: $bg-color-white;
    padding: $spacing-5;
    border-radius: $radius-xl;
    margin-bottom: $spacing-4;

    .cart-skeleton-checkbox {
      flex-shrink: 0;
      margin-right: $spacing-4;
      border-radius: 50%;
    }

    .cart-skeleton-image {
      flex-shrink: 0;
      margin-right: $spacing-4;
      border-radius: $radius-lg;
    }

    .cart-skeleton-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 200rpx;

      .cart-skeleton-bottom {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
    }
  }
}

// ===================================
// 购物车内容
// ===================================

.cart-content {
  position: relative;
  min-height: calc(100vh - 200rpx);
}

.cart-list {
  height: calc(100vh - 200rpx);
  padding: $spacing-6;
  box-sizing: border-box;
}

// ===================================
// 商品项包装器
// ===================================

.cart-item-wrapper {
  position: relative;
  margin-bottom: $spacing-4;
  overflow: hidden;
  border-radius: $radius-xl;
}

// ===================================
// 删除按钮
// ===================================

.cart-item__delete {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 160rpx;
  background: linear-gradient(135deg, $color-danger 0%, $color-danger-dark 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  border-radius: 0 $radius-xl $radius-xl 0;
  box-shadow: $shadow-sm;
}

.delete-text {
  color: $color-white;
  font-size: $font-size-sm;
  font-weight: $font-weight-semibold;
}

// ===================================
// 商品项
// ===================================

.cart-item {
  display: flex;
  align-items: center;
  background: $bg-color-white;
  border-radius: $radius-xl;
  padding: $spacing-5;
  box-shadow: $shadow-sm;
  position: relative;
  z-index: 2;
  transition: transform $duration-base $ease-out;

  &__checkbox {
    margin-right: $spacing-4;
    flex-shrink: 0;
  }

  &__image {
    width: 160rpx;
    height: 160rpx;
    border-radius: $radius-md;
    background: $gray-100;
    flex-shrink: 0;
  }

  &__info {
    flex: 1;
    min-width: 0;
    margin-left: $spacing-4;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 160rpx;
  }

  &__name {
    font-size: $font-size-base;
    color: $text-color-primary;
    font-weight: $font-weight-medium;
    line-height: $line-height-snug;
  }

  &__sku {
    font-size: $font-size-xs;
    color: $text-color-tertiary;
    background: $gray-50;
    padding: 4rpx 12rpx;
    border-radius: $radius-sm;
    align-self: flex-start;
    margin-top: $spacing-1;
  }

  &__bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__price {
    font-size: $font-size-lg;
    color: $color-danger;
    font-weight: $font-weight-bold;
    letter-spacing: -0.5rpx;
  }
}

// ===================================
// 文本截断
// ===================================

.ellipsis-2 {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

// ===================================
// 复选框
// ===================================

.checkbox {
  width: 44rpx;
  height: 44rpx;
  border: 2rpx solid $gray-300;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $bg-color-white;
  transition: all $duration-fast $ease-out;

  &.is-checked {
    background: $primary-color;
    border-color: $primary-color;
    box-shadow: 0 2rpx 8rpx rgba($primary-color, 0.3);
  }

  &-icon {
    color: $color-white;
    font-size: 26rpx;
    font-weight: $font-weight-bold;
  }
}

// ===================================
// 数量选择器
// ===================================

.cart-item__quantity {
  display: flex;
  align-items: center;
  background: $gray-50;
  border-radius: $radius-base;
  overflow: hidden;

  .quantity-btn {
    width: 56rpx;
    height: 48rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: $font-size-lg;
    color: $text-color-secondary;
    transition: all $duration-fast $ease-out;

    &--disabled {
      color: $text-color-placeholder;
    }

    &:active {
      background: $gray-200;
      transform: scale(0.95);
    }
  }

  .quantity-num {
    min-width: 64rpx;
    text-align: center;
    font-size: $font-size-sm;
    color: $text-color-primary;
    font-weight: $font-weight-medium;
  }
}

// ===================================
// 底部操作栏
// ===================================

.cart-bottom {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba($color-white, 0.98);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  display: flex;
  align-items: center;
  padding: $spacing-4 $spacing-6;
  padding-bottom: calc(#{$spacing-4} + #{$safe-area-bottom});
  border-top: 1rpx solid $gray-100;
  z-index: $z-index-fixed;
  box-shadow: 0 -2rpx 16rpx rgba(0, 0, 0, 0.05);

  &__select {
    display: flex;
    align-items: center;
    margin-right: $spacing-4;
    flex-shrink: 0;
  }

  &__total {
    flex: 1;
    display: flex;
    align-items: baseline;
    gap: $spacing-1;
  }

  &__btn {
    flex-shrink: 0;
    width: 200rpx;
  }
}

.select-text {
  font-size: $font-size-sm;
  color: $text-color-primary;
  margin-left: $spacing-2;
}

.total-label {
  font-size: $font-size-sm;
  color: $text-color-secondary;
}

.total-price {
  font-size: $font-size-xl;
  color: $color-danger;
  font-weight: $font-weight-bold;
  letter-spacing: -1rpx;
}

// ===================================
// 响应式适配
// ===================================

@media screen and (max-width: #{$breakpoint-sm - 1px}) {
  .cart-list {
    padding: $spacing-4;
  }

  .cart-item-wrapper {
    margin-bottom: $spacing-3;
  }

  .cart-item {
    padding: $spacing-4;

    &__image {
      width: 140rpx;
      height: 140rpx;
    }

    &__info {
      height: 140rpx;
    }

    &__name {
      font-size: $font-size-sm;
    }

    &__price {
      font-size: $font-size-md;
    }
  }

  .cart-bottom__btn {
    width: 160rpx;
  }
}

@media screen and (min-width: $breakpoint-lg) {
  .cart-content {
    max-width: 800px;
    margin: 0 auto;
  }

  .cart-bottom {
    max-width: 800px;
    margin: 0 auto;
    left: auto;
    right: auto;
    border-radius: $radius-xl $radius-xl 0 0;
  }
}

// ===================================
// 优惠券栏
// ===================================

.coupon-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 152, 0, 0.1) 100%);
  margin: $spacing-4;
  padding: $spacing-4;
  border-radius: $radius-lg;
  border: 1rpx solid rgba(255, 193, 7, 0.3);

  &__left {
    display: flex;
    align-items: center;
    gap: $spacing-2;
  }

  &__icon {
    font-size: 36rpx;
  }

  &__text {
    font-size: $font-size-base;
    color: $text-color-primary;
    font-weight: $font-weight-medium;
  }

  &__count {
    font-size: $font-size-xs;
    color: $warning-color;
    background: rgba(255, 193, 7, 0.2);
    padding: 4rpx 12rpx;
    border-radius: $radius-sm;
  }

  &__right {
    display: flex;
    align-items: center;
    gap: $spacing-2;
  }

  &__discount {
    font-size: $font-size-sm;
    color: $danger-color;
    font-weight: $font-weight-semibold;
  }

  &__arrow {
    font-size: $font-size-lg;
    color: $text-color-placeholder;
  }
}

// ===================================
// 底部合计区域优化
// ===================================

.total-row {
  display: flex;
  align-items: baseline;
  gap: $spacing-1;
}

.discount-row {
  display: flex;
  align-items: center;
  gap: $spacing-1;
  margin-top: 4rpx;
}

.discount-label {
  font-size: $font-size-xs;
  color: $text-color-placeholder;
}

.discount-value {
  font-size: $font-size-sm;
  color: $success-color;
}

// ===================================
// 优惠券弹窗
// ===================================

.coupon-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
}

.coupon-popup__content {
  width: 100%;
  max-height: 70vh;
  background: $bg-color-white;
  border-radius: $radius-xl $radius-xl 0 0;
  display: flex;
  flex-direction: column;
}

.coupon-popup__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-5;
  border-bottom: 1rpx solid $border-color-lighter;
}

.coupon-popup__title {
  font-size: $font-size-lg;
  font-weight: $font-weight-semibold;
  color: $text-color-primary;
}

.coupon-popup__close {
  font-size: $font-size-xl;
  color: $text-color-placeholder;
  padding: $spacing-2;
}

.coupon-popup__body {
  flex: 1;
  padding: $spacing-4;
  overflow-y: auto;
}

.coupon-popup__footer {
  padding: $spacing-5;
  padding-bottom: calc(#{$spacing-5} + #{$safe-area-bottom});
  border-top: 1rpx solid $border-color-lighter;
}

.coupon-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-4;
}

.coupon-item {
  display: flex;
  background: $bg-color-page;
  border-radius: $radius-lg;
  border: 2rpx solid transparent;
  overflow: hidden;
  transition: all $duration-fast $ease-out;

  &.is-selected {
    border-color: $primary-color;
    background: rgba(64, 158, 255, 0.05);
  }

  &__left {
    width: 200rpx;
    background: linear-gradient(135deg, $warning-color 0%, $color-warning-dark 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: $spacing-4;
    flex-shrink: 0;
  }

  &__symbol {
    font-size: $font-size-lg;
    color: $color-white;
    font-weight: $font-weight-bold;
    line-height: 1;
  }

  &__price {
    font-size: 56rpx;
    color: $color-white;
    font-weight: $font-weight-bold;
    line-height: 1;
  }

  &__condition {
    font-size: $font-size-xs;
    color: rgba(255, 255, 255, 0.8);
    margin-top: $spacing-2;
  }

  &__right {
    flex: 1;
    padding: $spacing-4;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative;
  }

  &__name {
    font-size: $font-size-base;
    color: $text-color-primary;
    font-weight: $font-weight-medium;
  }

  &__expire {
    font-size: $font-size-xs;
    color: $text-color-placeholder;
  }

  &__check {
    position: absolute;
    right: $spacing-4;
    top: 50%;
    transform: translateY(-50%);
    width: 44rpx;
    height: 44rpx;
    border: 2rpx solid $border-color;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24rpx;
    color: transparent;
    transition: all $duration-fast $ease-out;

    &.is-checked {
      background: $primary-color;
      border-color: $primary-color;
      color: $color-white;
    }
  }
}
</style>
