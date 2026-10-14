<template>
  <view class="flash-sale-page">
    <gexm-nav-bar title="限时秒杀" />
    <gexm-loading v-if="loading" />
    <view v-else-if="sales.length === 0" class="empty-state">
      <gexm-empty description="暂无秒杀活动" />
    </view>
    <view v-else class="flash-sale-content">
      <scroll-view class="sale-tabs" scroll-x>
        <view
          v-for="sale in sales"
          :key="sale.id"
          class="sale-tab"
          :class="{ 'is-active': activeSaleId === sale.id }"
          @click="selectSale(sale)"
        >
          <text class="sale-tab__time">{{ sale.timeText }}</text>
          <text class="sale-tab__status">{{ getSaleStatus(sale) }}</text>
        </view>
      </scroll-view>

      <view v-if="currentSale" class="countdown-bar">
        <text class="countdown-bar__label">距离结束</text>
        <view class="countdown-bar__timer">
          <view class="countdown-item">
            <text class="countdown-item__num">{{ formatTime(countdown.hours) }}</text>
            <text class="countdown-item__unit">时</text>
          </view>
          <text class="countdown-separator">:</text>
          <view class="countdown-item">
            <text class="countdown-item__num">{{ formatTime(countdown.minutes) }}</text>
            <text class="countdown-item__unit">分</text>
          </view>
          <text class="countdown-separator">:</text>
          <view class="countdown-item">
            <text class="countdown-item__num">{{ formatTime(countdown.seconds) }}</text>
            <text class="countdown-item__unit">秒</text>
          </view>
        </view>
      </view>

      <scroll-view class="product-list" scroll-y>
        <view
          v-for="product in products"
          :key="product.id"
          class="product-card"
          @click="goProductDetail(product)"
        >
          <image class="product-card__image" :src="product.image" mode="aspectFill" />
          <view class="product-card__info">
            <text class="product-card__name">{{ product.name }}</text>
            <text class="product-card__desc">{{ product.desc }}</text>
            <view class="product-card__price-row">
              <view class="product-card__price">
                <text class="product-card__price-symbol">¥</text>
                <text class="product-card__price-value">{{ product.flashPrice }}</text>
              </view>
              <text class="product-card__original-price">¥{{ product.originalPrice }}</text>
            </view>
            <view class="product-card__bottom">
              <view class="product-card__progress">
                <view
                  class="product-card__progress-fill"
                  :style="{ width: getProgressPercent(product) + '%' }"
                />
              </view>
              <text class="product-card__sold">已售{{ product.sold }}/{{ product.stock }}</text>
            </view>
            <gexm-button
              type="danger"
              size="small"
              class="product-card__btn"
              :loading="joiningIds.includes(product.id)"
              :disabled="product.stock <= product.sold"
              @click.stop="handleJoin(product)"
            >
              {{ product.stock <= product.sold ? '已抢光' : '立即抢购' }}
            </gexm-button>
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useUserStore } from '@/store/user'
import { flashSaleApi } from '@/api'

const userStore = useUserStore()
const loading = ref(true)
const sales = ref([])
const activeSaleId = ref('')
const products = ref([])
const joiningIds = ref([])
let timer = null

const currentSale = computed(() => {
  return sales.value.find((s) => s.id === activeSaleId.value)
})

const countdown = ref({ hours: 0, minutes: 0, seconds: 0 })

onMounted(() => {
  fetchSales()
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

watch(activeSaleId, () => {
  if (currentSale.value) {
    fetchProducts()
    startCountdown()
  }
})

async function fetchSales() {
  loading.value = true
  try {
    const result = await flashSaleApi.getActiveSales()
    const data = result.data || result || []
    sales.value = data.map(sale => ({
      id: sale.id,
      name: sale.name,
      startTime: sale.start_time || sale.startTime,
      endTime: sale.end_time || sale.endTime,
      status: sale.status,
      currentStatus: sale.current_status || sale.currentStatus,
      remainingTime: sale.remaining_time || sale.remainingTime,
      timeText: sale.start_time ? new Date(sale.start_time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '',
    }))
    if (sales.value.length > 0) {
      activeSaleId.value = sales.value[0].id
    }
  } catch (e) {
    console.error('Fetch sales error:', e)
    sales.value = []
  } finally {
    loading.value = false
  }
}

async function fetchProducts() {
  if (!activeSaleId.value) return
  try {
    const result = await flashSaleApi.getSaleProducts(activeSaleId.value)
    const data = result.data || result || {}
    const items = data.items || data || []
    products.value = items.map(item => ({
      id: item.id,
      name: item.product_name || item.name || '',
      image: item.product_image || item.image || '/static/images/placeholder.svg',
      desc: item.sku_name || item.desc || '',
      flashPrice: item.flash_price || item.flashPrice || 0,
      originalPrice: item.original_price || item.originalPrice || 0,
      stock: item.stock || 0,
      sold: item.sold_count || item.sold || 0,
      limitPerUser: item.limit_per_user || item.limitPerUser || 1,
      remainingStock: item.remaining_stock || item.stock || 0,
      progress: parseFloat(item.progress) || 0,
    }))
  } catch (e) {
    console.error('Fetch products error:', e)
    products.value = []
  }
}

function selectSale(sale) {
  activeSaleId.value = sale.id
}

function getSaleStatus(sale) {
  const now = Date.now()
  if (now < sale.startTime) return '即将开始'
  if (now > sale.endTime) return '已结束'
  return '进行中'
}

function startCountdown() {
  if (timer) clearInterval(timer)
  updateCountdown()
  timer = setInterval(updateCountdown, 1000)
}

function updateCountdown() {
  if (!currentSale.value) return
  const now = Date.now()
  const diff = Math.max(0, currentSale.value.endTime - now)
  countdown.value = {
    hours: Math.floor(diff / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  }
}

function formatTime(num) {
  return num.toString().padStart(2, '0')
}

function getProgressPercent(product) {
  return Math.min(100, (product.sold / product.stock) * 100)
}

function goProductDetail(product) {
  uni.navigateTo({ url: `/pages/product/detail?id=${product.id}` })
}

async function handleJoin(product) {
  if (!userStore.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }
  if (joiningIds.value.includes(product.id)) return
  if (product.stock <= product.sold) return

  joiningIds.value.push(product.id)
  try {
    await flashSaleApi.joinFlashSale(product.id)
    uni.showToast({ title: '抢购成功', icon: 'success' })
    product.sold++
  } catch (e) {
    console.error('Join flash sale error:', e)
  } finally {
    joiningIds.value = joiningIds.value.filter((id) => id !== product.id)
  }
}
</script>

<style lang="scss" scoped>
.flash-sale-page {
  min-height: 100vh;
  background: $bg-color-page;
}

.empty-state {
  padding-top: 200rpx;
}

.flash-sale-content {
  padding-bottom: $spacing-lg;
}

.sale-tabs {
  white-space: nowrap;
  background: #fff;
  padding: $spacing-sm 0;
  border-bottom: 1rpx solid $border-color-lighter;
}

.sale-tab {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  padding: 0 $spacing-lg;
  border-right: 1rpx solid $border-color-lighter;

  &:last-child {
    border-right: none;
  }

  &__time {
    font-size: $font-size-md;
    font-weight: 600;
    color: $text-color;
  }

  &__status {
    font-size: $font-size-xs;
    color: $danger-color;
    margin-top: 4rpx;
  }

  &.is-active {
    background: rgba(245, 108, 108, 0.05);

    .sale-tab__time {
      color: $danger-color;
    }
  }
}

.countdown-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(90deg, #f56c6c 0%, #ee5a5a 100%);
  padding: $spacing-sm 0;
}

.countdown-bar__label {
  font-size: $font-size-sm;
  color: rgba(255, 255, 255, 0.8);
  margin-right: $spacing-sm;
}

.countdown-bar__timer {
  display: flex;
  align-items: center;
}

.countdown-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(0, 0, 0, 0.2);
  padding: $spacing-xs $spacing-sm;
  border-radius: $border-radius-sm;

  &__num {
    font-size: $font-size-lg;
    font-weight: bold;
    color: #fff;
    line-height: 1;
  }

  &__unit {
    font-size: 16rpx;
    color: rgba(255, 255, 255, 0.8);
    margin-top: 4rpx;
  }
}

.countdown-separator {
  font-size: $font-size-lg;
  color: #fff;
  padding: 0 8rpx;
}

.product-list {
  padding: $spacing-base;
  height: calc(100vh - 350rpx);
}

.product-card {
  display: flex;
  background: #fff;
  border-radius: $border-radius-md;
  overflow: hidden;
  margin-bottom: $spacing-sm;
  box-shadow: $shadow-sm;

  &__image {
    width: 200rpx;
    height: 200rpx;
    flex-shrink: 0;
  }

  &__info {
    flex: 1;
    padding: $spacing-sm;
    display: flex;
    flex-direction: column;
  }

  &__name {
    font-size: $font-size-base;
    font-weight: 600;
    color: $text-color;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__desc {
    font-size: $font-size-xs;
    color: $text-color-placeholder;
    margin-top: 4rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__price-row {
    display: flex;
    align-items: baseline;
    margin-top: $spacing-sm;
  }

  &__price {
    display: flex;
    align-items: baseline;
    color: $danger-color;

    &-symbol {
      font-size: $font-size-sm;
      font-weight: bold;
    }

    &-value {
      font-size: $font-size-xl;
      font-weight: bold;
    }
  }

  &__original-price {
    font-size: $font-size-xs;
    color: $text-color-placeholder;
    text-decoration: line-through;
    margin-left: $spacing-sm;
  }

  &__bottom {
    display: flex;
    align-items: center;
    margin-top: $spacing-sm;
  }

  &__progress {
    flex: 1;
    height: 12rpx;
    background: $bg-color-gray;
    border-radius: 6rpx;
    overflow: hidden;
    margin-right: $spacing-sm;
  }

  &__progress-fill {
    height: 100%;
    background: $danger-color;
    border-radius: 6rpx;
    transition: width 0.3s ease;
  }

  &__sold {
    font-size: $font-size-xs;
    color: $text-color-placeholder;
    flex-shrink: 0;
  }

  &__btn {
    align-self: flex-end;
    margin-top: $spacing-sm;
  }
}
</style>
