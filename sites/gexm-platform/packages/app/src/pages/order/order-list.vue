<template>
  <view class="order-list-page">
    <gexm-nav-bar title="我的订单" />

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
              <view class="skeleton-order-card__goods-item">
                <gexm-skeleton :width="160" :height="160" :circle="false" />
                <view class="skeleton-order-card__goods-info">
                  <gexm-skeleton :width="180" :height="16" />
                  <gexm-skeleton :width="100" :height="12" />
                  <view class="skeleton-order-card__goods-bottom">
                    <gexm-skeleton :width="60" :height="14" />
                    <gexm-skeleton :width="40" :height="14" />
                  </view>
                </view>
              </view>
            </view>
            <view class="skeleton-order-card__footer">
              <gexm-skeleton :width="140" :height="12" />
              <view class="skeleton-order-card__actions">
                <gexm-skeleton :width="60" :height="24" />
                <gexm-skeleton :width="60" :height="24" />
              </view>
            </view>
          </view>
        </view>
      </view>

      <gexm-empty
        v-else-if="orders.length === 0"
        description="暂无订单"
        show-button
        button-text="去逛逛"
        @click="goHome"
      />

      <view v-else class="order-list">
        <view
          v-for="order in orders"
          :key="order.id"
          class="order-card"
          @click="goDetail(order.id)"
        >
          <view class="order-card__header">
            <text class="order-card__no">订单号：{{ order.orderNo || order.id }}</text>
            <text class="order-card__status" :class="`is-${order.status}`">
              {{ getStatusText(order.status) }}
            </text>
          </view>

          <view class="order-card__goods">
            <view
              v-for="item in (order.items || order.orderItems || []).slice(0, 2)"
              :key="item.id"
              class="order-goods"
            >
              <gexm-image-lazy
                class="order-goods__image"
                :src="
                  item.mainImage ||
                  item.productImage ||
                  item.image ||
                  '/static/images/placeholder.svg'
                "
                mode="aspectFill"
                shape="round"
                :lazy="true"
                error-image="/static/images/placeholder.svg"
              />
              <view class="order-goods__info">
                <text class="order-goods__name">{{ item.name || item.productName }}</text>
                <text class="order-goods__spec">{{ item.specsText || item.skuName || '' }}</text>
                <view class="order-goods__bottom">
                  <text class="order-goods__price">
                    ¥{{ (item.price || item.skuPrice || 0).toFixed(2) }}
                  </text>
                  <text class="order-goods__count">x{{ item.quantity || 1 }}</text>
                </view>
              </view>
            </view>
            <view
              v-if="(order.items || order.orderItems || []).length > 2"
              class="order-card__more"
            >
              <text>共{{ (order.items || order.orderItems || []).length }}件商品</text>
            </view>
          </view>

          <view class="order-card__footer">
            <text class="order-card__total">
              共{{ getTotalCount(order) }}件商品 合计：
              <text class="order-card__total-price">
                ¥{{ (order.totalAmount || order.payAmount || 0).toFixed(2) }}
              </text>
            </text>
            <view class="order-card__actions">
              <template v-if="order.status === 'pending'">
                <gexm-button size="mini" type="default" plain @click.stop="cancelOrder(order.id)">
                  取消订单
                </gexm-button>
                <gexm-button size="mini" type="primary" @click.stop="goPay(order.id)">
                  去支付
                </gexm-button>
              </template>
              <template v-else-if="order.status === 'paid'">
                <gexm-button size="mini" type="default" plain @click.stop="applyRefund(order.id)">
                  申请退款
                </gexm-button>
                <gexm-button size="mini" type="default" plain @click.stop="handleRemind(order.id)">
                  提醒发货
                </gexm-button>
              </template>
              <template v-else-if="order.status === 'shipped'">
                <gexm-button size="mini" type="default" plain @click.stop="viewLogistics(order.id)">
                  查看物流
                </gexm-button>
                <gexm-button size="mini" type="primary" @click.stop="confirmReceive(order.id)">
                  确认收货
                </gexm-button>
              </template>
              <template v-else-if="order.status === 'completed'">
                <gexm-button size="mini" type="default" plain @click.stop="buyAgain(order.id)">
                  再次购买
                </gexm-button>
                <gexm-button size="mini" type="primary" @click.stop="goReview(order.id)">
                  去评价
                </gexm-button>
              </template>
              <template v-else-if="order.status === 'refunding'">
                <gexm-button size="mini" type="default" plain @click.stop="viewRefund(order.id)">
                  退款详情
                </gexm-button>
              </template>
              <template v-else-if="order.status === 'cancelled'">
                <gexm-button size="mini" type="primary" @click.stop="buyAgain(order.id)">
                  重新购买
                </gexm-button>
              </template>
            </view>
          </view>
        </view>
      </view>

      <view v-if="loadingMore" class="order-loadmore">
        <gexm-loading size="small" />
        <text class="order-loadmore__text">加载中...</text>
      </view>

      <view v-if="!hasMore && orders.length > 0" class="order-nomore">
        <text>没有更多了</text>
      </view>

      <view class="order-bottom-space" />
    </scroll-view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useOrderStore } from '@/store/order'
import GexmSkeleton from '@/components/gexm-skeleton'

const orderStore = useOrderStore()

const tabs = [
  { label: '全部', value: '' },
  { label: '待付款', value: 'pending' },
  { label: '待发货', value: 'paid' },
  { label: '待收货', value: 'shipped' },
  { label: '已完成', value: 'completed' },
  { label: '退款', value: 'refunding' },
]

const activeTab = ref('')
const orders = ref([])
const loading = ref(false)
const refreshing = ref(false)
const loadingMore = ref(false)
const page = ref(1)
const pageSize = 10
const hasMore = ref(true)

const statusMap = {
  pending: '待付款',
  paid: '待发货',
  shipped: '待收货',
  completed: '已完成',
  cancelled: '已取消',
  refunding: '退款中',
  refunded: '已退款',
}

function getStatusText(status) {
  return statusMap[status] || status
}

function getTotalCount(order) {
  const items = order.items || order.orderItems || []
  return items.reduce((sum, item) => sum + (item.quantity || 1), 0)
}

function handleTabChange(value) {
  activeTab.value = value
  page.value = 1
  hasMore.value = true
  orders.value = []
  fetchOrders()
}

async function fetchOrders() {
  if (loading.value) return

  loading.value = true
  try {
    const params = {
      page: page.value,
      pageSize: pageSize,
    }
    if (activeTab.value) {
      params.status = activeTab.value
    }

    const result = await orderStore.fetchOrders(params)
    const list = result.data || []

    if (page.value === 1) {
      orders.value = list
    } else {
      orders.value = [...orders.value, ...list]
    }

    hasMore.value = list.length === pageSize
  } catch (e) {
    console.error('Failed to fetch orders:', e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
    refreshing.value = false
    loadingMore.value = false
  }
}

function onRefresh() {
  page.value = 1
  hasMore.value = true
  refreshing.value = true
  fetchOrders()
}

let loadMoreTimer = null
let lastLoadMoreTime = 0

function loadMore() {
  const now = Date.now()
  if (now - lastLoadMoreTime < 300) return
  if (!hasMore.value || loading.value || loadingMore.value) return

  if (loadMoreTimer) {
    clearTimeout(loadMoreTimer)
  }

  loadMoreTimer = setTimeout(() => {
    lastLoadMoreTime = Date.now()
    loadingMore.value = true
    page.value++
    fetchOrders()
  }, 100)
}

function goDetail(orderId) {
  uni.navigateTo({ url: `/pages/order/order-detail?id=${orderId}` })
}

function goPay(orderId) {
  uni.navigateTo({ url: `/pages/payment/payment?orderId=${orderId}` })
}

async function cancelOrder(orderId) {
  uni.showModal({
    title: '提示',
    content: '确定要取消该订单吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await orderStore.cancelOrder(orderId)
          uni.showToast({ title: '取消成功', icon: 'success' })
          page.value = 1
          fetchOrders()
        } catch (e) {
          console.error('Failed to cancel order:', e)
          uni.showToast({ title: '取消失败', icon: 'none' })
        }
      }
    },
  })
}

function handleRemind(_orderId) {
  uni.showToast({ title: '已提醒商家发货', icon: 'success' })
}

function viewLogistics(orderId) {
  uni.navigateTo({ url: `/pages/order/order-detail?id=${orderId}&tab=logistics` })
}

async function confirmReceive(orderId) {
  uni.showModal({
    title: '提示',
    content: '确定已收到商品吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await orderStore.confirmOrder(orderId)
          uni.showToast({ title: '确认成功', icon: 'success' })
          page.value = 1
          fetchOrders()
        } catch (e) {
          console.error('Failed to confirm order:', e)
          uni.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    },
  })
}

function goReview(orderId) {
  uni.navigateTo({ url: `/pages/review/review-publish?orderId=${orderId}` })
}

async function buyAgain(orderId) {
  try {
    await orderStore.buyAgain(orderId)
    uni.showToast({ title: '已加入购物车', icon: 'success' })
    setTimeout(() => {
      uni.switchTab({ url: '/pages/cart/cart' })
    }, 1000)
  } catch (e) {
    console.error('Failed to buy again:', e)
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

function applyRefund(orderId) {
  uni.navigateTo({ url: `/pages/order/order-detail?id=${orderId}&tab=refund` })
}

function viewRefund(orderId) {
  uni.navigateTo({ url: `/pages/order/order-detail?id=${orderId}&tab=refund` })
}

function goHome() {
  uni.switchTab({ url: '/pages/index/index' })
}

onShow(() => {
  if (orders.value.length > 0) {
    page.value = 1
    hasMore.value = true
    fetchOrders()
  }
})
</script>

<style lang="scss" scoped>
.order-list-page {
  min-height: 100vh;
  background: $bg-color-page;
}

.order-tabs {
  display: flex;
  background: $bg-color-white;
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1rpx solid $border-color-lighter;

  &__item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: $spacing-base 0;
    position: relative;
  }

  &__text {
    font-size: $font-size-base;
    color: $text-color-secondary;
    transition: color $transition-fast;
  }

  &__item.is-active &__text {
    color: $primary-color;
    font-weight: 600;
  }

  &__indicator {
    position: absolute;
    bottom: 12rpx;
    width: 48rpx;
    height: 6rpx;
    background: $primary-color;
    border-radius: 3rpx;
  }
}

.order-scroll {
  height: calc(100vh - 88rpx - 88rpx);
}

.order-loading {
  display: flex;
  justify-content: center;
  padding: $spacing-xl 0;
}

.skeleton-order-list {
  width: 100%;
  padding: $spacing-base;
}

.skeleton-order-card {
  background: $bg-color-white;
  border-radius: $border-radius-lg;
  margin-bottom: $spacing-base;
  padding: $spacing-base;
  overflow: hidden;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: $spacing-base;
    border-bottom: 1rpx solid $border-color-lighter;
  }

  &__goods {
    padding: $spacing-base 0;
  }

  &__goods-item {
    display: flex;
  }

  &__goods-info {
    flex: 1;
    margin-left: $spacing-base;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
  }

  &__goods-bottom {
    display: flex;
    justify-content: space-between;
    margin-top: auto;
  }

  &__footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: $spacing-base;
    border-top: 1rpx solid $border-color-lighter;
  }

  &__actions {
    display: flex;
    gap: $spacing-sm;
  }
}

.order-list {
  padding: $spacing-base;
}

.order-card {
  background: $bg-color-white;
  border-radius: $border-radius-lg;
  margin-bottom: $spacing-base;
  overflow: hidden;
  box-shadow: $shadow-sm;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: $spacing-base;
    border-bottom: 1rpx solid $border-color-lighter;
  }

  &__no {
    font-size: $font-size-sm;
    color: $text-color-secondary;
  }

  &__status {
    font-size: $font-size-sm;
    font-weight: 500;

    &.is-pending {
      color: $warning-color;
    }

    &.is-paid {
      color: $primary-color;
    }

    &.is-shipped {
      color: $success-color;
    }

    &.is-completed {
      color: $info-color;
    }

    &.is-cancelled {
      color: $text-color-placeholder;
    }

    &.is-refunding {
      color: $danger-color;
    }

    &.is-refunded {
      color: $danger-color;
    }
  }

  &__goods {
    padding: $spacing-base;
  }

  &__more {
    text-align: right;
    padding: 0 $spacing-base $spacing-sm;
    font-size: $font-size-sm;
    color: $text-color-placeholder;
  }

  &__footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: $spacing-sm $spacing-base $spacing-base;
    border-top: 1rpx solid $border-color-lighter;
  }

  &__total {
    font-size: $font-size-sm;
    color: $text-color-secondary;
  }

  &__total-price {
    font-size: $font-size-md;
    color: $danger-color;
    font-weight: 600;
  }

  &__actions {
    display: flex;
    gap: $spacing-sm;
  }
}

.order-goods {
  display: flex;
  margin-bottom: $spacing-base;

  &:last-child {
    margin-bottom: 0;
  }

  &__image {
    width: 160rpx;
    height: 160rpx;
    border-radius: $border-radius-base;
    background: $bg-color;
    flex-shrink: 0;
  }

  &__info {
    flex: 1;
    margin-left: $spacing-base;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  &__name {
    font-size: $font-size-base;
    color: $text-color;
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  &__spec {
    font-size: $font-size-xs;
    color: $text-color-placeholder;
    margin-top: 8rpx;
  }

  &__bottom {
    margin-top: auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__price {
    font-size: $font-size-base;
    color: $danger-color;
    font-weight: 500;
  }

  &__count {
    font-size: $font-size-sm;
    color: $text-color-placeholder;
  }
}

.order-loadmore {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $spacing-base 0;
  gap: $spacing-sm;

  &__text {
    font-size: $font-size-sm;
    color: $text-color-placeholder;
  }
}

.order-nomore {
  text-align: center;
  padding: $spacing-base 0;
  font-size: $font-size-sm;
  color: $text-color-placeholder;
}

.order-bottom-space {
  height: 40rpx;
}
</style>
