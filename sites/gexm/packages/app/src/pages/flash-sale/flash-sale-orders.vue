<template>
  <view class="flash-sale-orders-page">
    <gexm-nav-bar title="我的秒杀订单" />

    <view class="order-tabs">
      <view
        v-for="tab in tabs"
        :key="tab.value"
        class="order-tabs__item"
        :class="{ 'is-active': activeTab === tab.value }"
        @click="handleTabChange(tab.value)"
      >
        <text class="order-tabs__text">{{ tab.label }}</text>
        <view v-if="activeTab === tab.value" class="order-tabs__indicator" />
      </view>
    </view>

    <scroll-view
      class="order-scroll"
      scroll-y
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="loadMore"
    >
      <view v-if="loading && orders.length === 0" class="order-loading">
        <view class="skeleton-order-list">
          <view v-for="i in 3" :key="i" class="skeleton-order-card">
            <view class="skeleton-order-card__header">
              <gexm-skeleton :width="120" :height="14" />
              <gexm-skeleton :width="60" :height="14" />
            </view>
            <view class="skeleton-order-card__goods">
              <gexm-skeleton :width="160" :height="160" :circle="false" />
              <view class="skeleton-order-card__goods-info">
                <gexm-skeleton :width="180" :height="16" />
                <gexm-skeleton :width="100" :height="12" />
                <gexm-skeleton :width="60" :height="14" />
              </view>
            </view>
            <view class="skeleton-order-card__footer">
              <gexm-skeleton :width="140" :height="12" />
              <gexm-skeleton :width="60" :height="24" />
            </view>
          </view>
        </view>
      </view>

      <gexm-empty
        v-else-if="orders.length === 0"
        description="暂无秒杀订单"
        show-button
        button-text="去抢购"
        @click="goFlashSale"
      />

      <view v-else class="order-list">
        <view
          v-for="order in orders"
          :key="order.id"
          class="order-card"
          @click="goDetail(order.id)"
        >
          <view class="order-card__header">
            <text class="order-card__no">订单号：{{ order.id }}</text>
            <text class="order-card__status" :class="`is-${order.status}`">
              {{ getStatusText(order.status) }}
            </text>
          </view>

          <view class="order-card__goods">
            <gexm-image-lazy
              class="order-goods__image"
              :src="order.product_image || order.productImage || '/static/images/placeholder.svg'"
              mode="aspectFill"
              shape="round"
              :lazy="true"
              error-image="/static/images/placeholder.svg"
            />
            <view class="order-goods__info">
              <text class="order-goods__name">{{ order.product_name || order.productName || '' }}</text>
              <text class="order-goods__spec">{{ order.sku_name || order.skuName || '' }}</text>
              <view class="order-goods__bottom">
                <text class="order-goods__price">¥{{ (order.price || 0).toFixed(2) }}</text>
                <text class="order-goods__quantity">x{{ order.quantity || 1 }}</text>
              </view>
            </view>
          </view>

          <view class="order-card__footer">
            <view class="order-card__total">
              <text class="order-card__total-label">共{{ order.quantity || 1 }}件</text>
              <text class="order-card__total-price">实付：¥{{ ((order.price || 0) * (order.quantity || 1)).toFixed(2) }}</text>
            </view>
            <view class="order-card__actions">
              <gexm-button
                v-if="order.status === 'pending'"
                size="small"
                type="default"
                @click.stop="handleCancel(order)"
              >
                取消订单
              </gexm-button>
              <gexm-button
                v-if="order.status === 'pending'"
                size="small"
                type="danger"
                @click.stop="handlePay(order)"
              >
                立即支付
              </gexm-button>
              <text v-if="order.status === 'cancelled'" class="order-card__status-text">已取消</text>
              <text v-if="order.status === 'completed'" class="order-card__status-text">已完成</text>
            </view>
          </view>
        </view>
      </view>

      <view v-if="loadingMore && orders.length > 0" class="load-more">
        <text class="load-more__text">加载中...</text>
      </view>
      <view v-if="!hasMore && orders.length > 0" class="load-more">
        <text class="load-more__text">没有更多了</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/store/user'
import { flashSaleApi } from '@/api'

const userStore = useUserStore()
const loading = ref(true)
const loadingMore = ref(false)
const refreshing = ref(false)
const hasMore = ref(true)
const page = ref(1)
const pageSize = 10
const orders = ref([])
const activeTab = ref('')

const tabs = [
  { label: '全部', value: '' },
  { label: '待付款', value: 'pending' },
  { label: '已取消', value: 'cancelled' },
  { label: '已完成', value: 'completed' },
]

onMounted(() => {
  fetchOrders()
})

async function fetchOrders(isRefresh = false) {
  if (!userStore.isLoggedIn) {
    loading.value = false
    return
  }
  
  if (isRefresh) {
    refreshing.value = true
    page.value = 1
  } else {
    loadingMore.value = true
  }
  
  try {
    const result = await flashSaleApi.getUserOrders({
      page: page.value,
      pageSize,
      status: activeTab.value,
    })
    const data = result.data || result || {}
    const list = data.items || data.list || data || []
    
    if (isRefresh) {
      orders.value = list
    } else {
      orders.value = [...orders.value, ...list]
    }
    
    hasMore.value = list.length >= pageSize
  } catch (e) {
    console.error('Fetch flash sale orders error:', e)
  } finally {
    loading.value = false
    loadingMore.value = false
    refreshing.value = false
  }
}

function handleTabChange(status) {
  activeTab.value = status
  orders.value = []
  hasMore.value = true
  page.value = 1
  fetchOrders()
}

function onRefresh() {
  fetchOrders(true)
}

function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  page.value++
  fetchOrders()
}

function getStatusText(status) {
  const statusMap = {
    pending: '待付款',
    cancelled: '已取消',
    completed: '已完成',
    paid: '已付款',
    refunded: '已退款',
  }
  return statusMap[status] || status
}

async function handleCancel(order) {
  uni.showModal({
    title: '提示',
    content: '确定要取消该订单吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await flashSaleApi.cancelOrder(order.id)
          uni.showToast({ title: '取消成功', icon: 'success' })
          orders.value = orders.value.filter((o) => o.id !== order.id)
        } catch (e) {
          uni.showToast({ title: '取消失败', icon: 'none' })
        }
      }
    },
  })
}

function handlePay(order) {
  uni.navigateTo({ url: `/pages/payment/payment?orderId=${order.id}&type=flash-sale` })
}

function goDetail(orderId) {
  uni.navigateTo({ url: `/pages/flash-sale/flash-sale-order-detail?id=${orderId}` })
}

function goFlashSale() {
  uni.navigateTo({ url: '/pages/flash-sale/flash-sale' })
}
</script>

<style lang="scss" scoped>
.flash-sale-orders-page {
  min-height: 100vh;
  background: $bg-color-page;
}

.order-tabs {
  display: flex;
  background: #fff;
  padding: $spacing-sm 0;
  border-bottom: 1rpx solid $border-color-lighter;
}

.order-tabs__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $spacing-xs 0;
  position: relative;

  &__text {
    font-size: $font-size-sm;
    color: $text-color-secondary;
  }

  &.is-active {
    .order-tabs__text {
      color: $danger-color;
    }
  }

  &__indicator {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 40rpx;
    height: 6rpx;
    background: $danger-color;
    border-radius: 3rpx;
  }
}

.order-scroll {
  height: calc(100vh - 160rpx);
}

.order-loading {
  padding: $spacing-lg;
}

.skeleton-order-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.skeleton-order-card {
  background: #fff;
  border-radius: $border-radius-md;
  padding: $spacing-base;
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__goods {
    display: flex;
    gap: $spacing-sm;

    &-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
  }

  &__footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
}

.order-list {
  padding: $spacing-sm;
}

.order-card {
  background: #fff;
  border-radius: $border-radius-md;
  padding: $spacing-base;
  margin-bottom: $spacing-sm;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $spacing-sm;
  }

  &__no {
    font-size: $font-size-xs;
    color: $text-color-placeholder;
  }

  &__status {
    font-size: $font-size-xs;
    font-weight: 500;

    &.is-pending {
      color: $danger-color;
    }

    &.is-cancelled {
      color: $text-color-placeholder;
    }

    &.is-completed {
      color: $success-color;
    }
  }

  &__goods {
    display: flex;
    gap: $spacing-sm;
    margin-bottom: $spacing-sm;
  }

  &__footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: $spacing-sm;
    border-top: 1rpx solid $border-color-lighter;
  }

  &__total {
    display: flex;
    align-items: center;
    gap: $spacing-sm;

    &-label {
      font-size: $font-size-xs;
      color: $text-color-placeholder;
    }

    &-price {
      font-size: $font-size-sm;
      font-weight: 600;
      color: $danger-color;
    }
  }

  &__actions {
    display: flex;
    gap: $spacing-sm;
  }

  &__status-text {
    font-size: $font-size-xs;
    color: $text-color-placeholder;
  }
}

.order-goods {
  &__image {
    width: 160rpx;
    height: 160rpx;
    flex-shrink: 0;
  }

  &__info {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  &__name {
    font-size: $font-size-sm;
    font-weight: 500;
    color: $text-color;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__spec {
    font-size: $font-size-xs;
    color: $text-color-placeholder;
  }

  &__bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__price {
    font-size: $font-size-base;
    font-weight: 600;
    color: $danger-color;
  }

  &__quantity {
    font-size: $font-size-xs;
    color: $text-color-placeholder;
  }
}

.load-more {
  padding: $spacing-lg;
  text-align: center;

  &__text {
    font-size: $font-size-xs;
    color: $text-color-placeholder;
  }
}
</style>