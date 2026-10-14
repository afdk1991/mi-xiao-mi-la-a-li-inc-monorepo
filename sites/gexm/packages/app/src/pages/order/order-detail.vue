<template>
  <view class="order-detail-page">
    <gexm-nav-bar title="订单详情" />

    <view v-if="loading" class="order-detail-loading">
      <gexm-loading />
    </view>

    <template v-else-if="order">
      <view class="status-banner" :class="`is-${order.status}`">
        <text class="status-banner__icon">{{ getStatusIcon(order.status) }}</text>
        <view class="status-banner__info">
          <text class="status-banner__title">{{ getStatusText(order.status) }}</text>
          <text class="status-banner__desc">{{ getStatusDesc(order.status) }}</text>
        </view>
      </view>

      <scroll-view scroll-y class="order-detail-scroll">
        <view class="progress-section">
          <view class="progress-bar">
            <view
              v-for="(step, index) in progressSteps"
              :key="step.key"
              class="progress-step"
              :class="{
                'is-active': step.active,
                'is-current': step.current,
              }"
            >
              <view class="progress-step__dot">
                <text v-if="step.active" class="progress-step__check">✓</text>
                <text v-else class="progress-step__num">{{ index + 1 }}</text>
              </view>
              <text class="progress-step__label">{{ step.label }}</text>
              <text v-if="step.time" class="progress-step__time">{{ step.time }}</text>
            </view>
            <view class="progress-line">
              <view class="progress-line__fill" :style="{ width: progressWidth + '%' }" />
            </view>
          </view>
        </view>

        <view v-if="order.address" class="address-card">
          <view class="address-card__icon">📍</view>
          <view class="address-card__info">
            <view class="address-card__top">
              <text class="address-card__name">{{ order.address.name }}</text>
              <text class="address-card__phone">{{ order.address.phone }}</text>
            </view>
            <text class="address-card__detail">
              {{ order.address.detail || order.address.address }}
            </text>
          </view>
        </view>

        <gexm-card class="goods-card" title="商品信息">
          <view class="goods-list">
            <view
              v-for="item in orderItems"
              :key="item.id"
              class="goods-item"
              @click="goGoodsDetail(item.productId || item.goodsId)"
            >
              <image
                class="goods-item__image"
                :src="item.image || item.productImage || '/static/placeholder.png'"
                mode="aspectFill"
              />
              <view class="goods-item__info">
                <text class="goods-item__name">{{ item.name || item.productName }}</text>
                <text class="goods-item__spec">{{ item.spec || item.skuName || '' }}</text>
                <view class="goods-item__bottom">
                  <text class="goods-item__price">¥{{ (item.price || 0).toFixed(2) }}</text>
                  <text class="goods-item__count">x{{ item.quantity || 1 }}</text>
                </view>
              </view>
            </view>
          </view>
        </gexm-card>

        <gexm-card
          v-if="logistics && logistics.tracks && logistics.tracks.length > 0"
          class="logistics-card"
          title="物流信息"
        >
          <view class="logistics-header">
            <text class="logistics-header__company">{{ logistics.companyName || '物流公司' }}</text>
            <text class="logistics-header__no">快递单号：{{ logistics.trackingNo || '' }}</text>
          </view>
          <view class="logistics-timeline">
            <view
              v-for="(track, index) in logistics.tracks.slice(0, 3)"
              :key="index"
              class="timeline-item"
              :class="{ 'is-first': index === 0 }"
            >
              <view class="timeline-item__dot" />
              <view
                v-if="index < logistics.tracks.slice(0, 3).length - 1"
                class="timeline-item__line"
              />
              <view class="timeline-item__content">
                <text class="timeline-item__desc">{{ track.desc || track.description }}</text>
                <text class="timeline-item__time">{{ track.time }}</text>
              </view>
            </view>
          </view>
          <view
            v-if="logistics.tracks.length > 3"
            class="logistics-more"
            @click="showAllLogistics = !showAllLogistics"
          >
            <text>{{ showAllLogistics ? '收起' : '查看更多' }}</text>
          </view>
          <view v-if="showAllLogistics" class="logistics-timeline">
            <view
              v-for="(track, index) in logistics.tracks.slice(3)"
              :key="'more-' + index"
              class="timeline-item"
            >
              <view class="timeline-item__dot" />
              <view
                v-if="index < logistics.tracks.slice(3).length - 1"
                class="timeline-item__line"
              />
              <view class="timeline-item__content">
                <text class="timeline-item__desc">{{ track.desc || track.description }}</text>
                <text class="timeline-item__time">{{ track.time }}</text>
              </view>
            </view>
          </view>
        </gexm-card>

        <gexm-card
          v-if="order.status === 'refunding' || order.refundStatus"
          class="refund-card"
          title="退款信息"
        >
          <view class="refund-status">
            <text class="refund-status__label">退款状态</text>
            <text class="refund-status__value" :class="`is-${order.refundStatus || 'pending'}`">
              {{ getRefundStatusText(order.refundStatus) }}
            </text>
          </view>
          <view v-if="order.refundReason" class="refund-row">
            <text class="refund-row__label">退款原因</text>
            <text class="refund-row__value">{{ order.refundReason }}</text>
          </view>
          <view v-if="order.refundAmount" class="refund-row">
            <text class="refund-row__label">退款金额</text>
            <text class="refund-row__value">¥{{ (order.refundAmount || 0).toFixed(2) }}</text>
          </view>
        </gexm-card>

        <gexm-card class="amount-card" title="金额明细">
          <view class="amount-row">
            <text class="amount-row__label">商品金额</text>
            <text class="amount-row__value">
              ¥{{ (order.goodsAmount || order.totalAmount || 0).toFixed(2) }}
            </text>
          </view>
          <view class="amount-row">
            <text class="amount-row__label">运费</text>
            <text class="amount-row__value">
              ¥{{ (order.shippingFee || order.freight || 0).toFixed(2) }}
            </text>
          </view>
          <view class="amount-row">
            <text class="amount-row__label">优惠</text>
            <text class="amount-row__value amount-row__value--discount">
              -¥{{ (order.discountAmount || 0).toFixed(2) }}
            </text>
          </view>
          <view class="amount-row amount-row--total">
            <text class="amount-row__label">实付金额</text>
            <text class="amount-row__value amount-row__value--total">
              ¥{{ (order.payAmount || order.totalAmount || 0).toFixed(2) }}
            </text>
          </view>
        </gexm-card>

        <gexm-card class="info-card" title="订单信息">
          <view class="info-row">
            <text class="info-row__label">订单号</text>
            <view class="info-row__value">
              <text class="info-row__text">{{ order.orderNo || order.id }}</text>
              <text class="info-row__copy" @click.stop="copyOrderNo">复制</text>
            </view>
          </view>
          <view class="info-row">
            <text class="info-row__label">下单时间</text>
            <text class="info-row__text">
              {{ formatTime(order.createdAt || order.createTime) }}
            </text>
          </view>
          <view v-if="order.payTime" class="info-row">
            <text class="info-row__label">支付时间</text>
            <text class="info-row__text">{{ formatTime(order.payTime) }}</text>
          </view>
          <view v-if="order.shipTime" class="info-row">
            <text class="info-row__label">发货时间</text>
            <text class="info-row__text">{{ formatTime(order.shipTime) }}</text>
          </view>
          <view v-if="order.completeTime || order.completedAt" class="info-row">
            <text class="info-row__label">完成时间</text>
            <text class="info-row__text">
              {{ formatTime(order.completeTime || order.completedAt) }}
            </text>
          </view>
          <view class="info-row">
            <text class="info-row__label">支付方式</text>
            <text class="info-row__text">
              {{ getPayMethod(order.payMethod || order.paymentMethod) }}
            </text>
          </view>
          <view v-if="order.remark" class="info-row">
            <text class="info-row__label">订单备注</text>
            <text class="info-row__text">{{ order.remark }}</text>
          </view>
        </gexm-card>

        <view class="bottom-space" />
      </scroll-view>

      <view class="bottom-bar">
        <view class="bottom-bar__actions">
          <template v-if="order.status === 'pending'">
            <gexm-button size="medium" type="default" plain @click="cancelOrder">
              取消订单
            </gexm-button>
            <gexm-button size="medium" type="primary" @click="goPay">立即支付</gexm-button>
          </template>
          <template v-else-if="order.status === 'paid'">
            <gexm-button size="medium" type="default" plain @click="openRefundPopup">
              申请退款
            </gexm-button>
            <gexm-button size="medium" type="default" plain @click="handleRemind">
              提醒发货
            </gexm-button>
          </template>
          <template v-else-if="order.status === 'shipped'">
            <gexm-button size="medium" type="default" plain @click="scrollToLogistics">
              查看物流
            </gexm-button>
            <gexm-button size="medium" type="primary" @click="confirmReceive">确认收货</gexm-button>
          </template>
          <template v-else-if="order.status === 'completed'">
            <gexm-button size="medium" type="default" plain @click="buyAgain">再次购买</gexm-button>
            <gexm-button size="medium" type="primary" @click="goReview">去评价</gexm-button>
          </template>
          <template v-else-if="order.status === 'refunding'">
            <gexm-button size="medium" type="primary" @click="viewRefundDetail">
              退款详情
            </gexm-button>
          </template>
          <template v-else-if="order.status === 'cancelled'">
            <gexm-button size="medium" type="primary" @click="buyAgain">重新购买</gexm-button>
          </template>
        </view>
      </view>
    </template>

    <view v-if="showRefundPopup" class="refund-popup" @click="closeRefundPopup">
      <view class="refund-popup__content" @click.stop>
        <view class="refund-popup__header">
          <text class="refund-popup__title">申请退款</text>
          <text class="refund-popup__close" @click="closeRefundPopup">✕</text>
        </view>
        <scroll-view scroll-y class="refund-popup__body">
          <view class="refund-form">
            <view class="form-item">
              <text class="form-item__label">退款金额</text>
              <text class="form-item__value">
                ¥{{ (order?.payAmount || order?.totalAmount || 0).toFixed(2) }}
              </text>
            </view>
            <view class="form-item">
              <text class="form-item__label">
                退款原因
                <text class="form-item__required">*</text>
              </text>
              <view class="form-item__reasons">
                <view
                  v-for="reason in refundReasons"
                  :key="reason"
                  class="reason-tag"
                  :class="{ 'is-active': refundForm.reason === reason }"
                  @click="refundForm.reason = reason"
                >
                  {{ reason }}
                </view>
              </view>
            </view>
            <view class="form-item">
              <text class="form-item__label">退款说明</text>
              <textarea
                v-model="refundForm.description"
                class="form-item__textarea"
                placeholder="请输入退款说明（选填）"
                :maxlength="200"
              ></textarea>
              <text class="form-item__count">{{ refundForm.description.length }}/200</text>
            </view>
          </view>
        </scroll-view>
        <view class="refund-popup__footer">
          <gexm-button
            type="primary"
            size="large"
            block
            :loading="submittingRefund"
            :disabled="!refundForm.reason"
            @click="submitRefund"
          >
            提交申请
          </gexm-button>
        </view>
      </view>
    </view>

    <gexm-empty v-else description="订单不存在" />
  </view>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useOrderStore } from '@/store/order'

const orderStore = useOrderStore()

const orderId = ref('')
const loading = ref(false)
const logistics = ref(null)
const showRefundPopup = ref(false)
const showAllLogistics = ref(false)
const submittingRefund = ref(false)

const refundReasons = [
  '不想要了',
  '商品质量问题',
  '商品与描述不符',
  '发错货/漏发货',
  '包装破损',
  '其他原因',
]

const refundForm = ref({
  reason: '',
  description: '',
})

const order = computed(() => orderStore.currentOrder)
const orderItems = computed(() => orderStore.orderItems)

const statusMap = {
  pending: '待付款',
  paid: '待发货',
  shipped: '待收货',
  completed: '已完成',
  cancelled: '已取消',
  refunding: '退款中',
  refunded: '已退款',
}

const statusDescMap = {
  pending: '请尽快完成支付',
  paid: '商家正在准备发货',
  shipped: '商品已发出，请注意查收',
  completed: '感谢您的购买，欢迎再次光临',
  cancelled: '订单已取消',
  refunding: '退款申请处理中',
  refunded: '退款已完成',
}

const statusIconMap = {
  pending: '💳',
  paid: '📦',
  shipped: '🚚',
  completed: '✅',
  cancelled: '❌',
  refunding: '↩️',
  refunded: '💰',
}

const refundStatusMap = {
  pending: '处理中',
  approved: '已同意',
  rejected: '已拒绝',
  completed: '已完成',
}

const progressSteps = computed(() => {
  const steps = [
    { key: 'pending', label: '提交订单', active: true, current: false, time: '' },
    { key: 'paid', label: '付款成功', active: false, current: false, time: '' },
    { key: 'shipped', label: '商品发货', active: false, current: false, time: '' },
    { key: 'completed', label: '交易完成', active: false, current: false, time: '' },
  ]

  const currentStatus = order.value?.status
  const statusOrder = ['pending', 'paid', 'shipped', 'completed']
  const currentIndex = statusOrder.indexOf(currentStatus)

  steps[0].time = formatTime(order.value?.createdAt || order.value?.createTime)

  if (
    currentIndex >= 1 ||
    currentStatus === 'paid' ||
    currentStatus === 'shipped' ||
    currentStatus === 'completed'
  ) {
    steps[1].active = true
    steps[1].time = formatTime(order.value?.payTime)
  }

  if (currentIndex >= 2 || currentStatus === 'shipped' || currentStatus === 'completed') {
    steps[2].active = true
    steps[2].time = formatTime(order.value?.shipTime)
  }

  if (currentIndex >= 3 || currentStatus === 'completed') {
    steps[3].active = true
    steps[3].time = formatTime(order.value?.completeTime || order.value?.completedAt)
  }

  if (currentStatus && statusOrder.includes(currentStatus)) {
    steps[currentIndex].current = true
  }

  return steps
})

const progressWidth = computed(() => {
  const currentStatus = order.value?.status
  const statusOrder = ['pending', 'paid', 'shipped', 'completed']
  const currentIndex = statusOrder.indexOf(currentStatus)
  if (currentIndex < 0) return 0
  return (currentIndex / 3) * 100
})

function getStatusText(status) {
  return statusMap[status] || status
}

function getStatusDesc(status) {
  return statusDescMap[status] || ''
}

function getStatusIcon(status) {
  return statusIconMap[status] || '📋'
}

function getRefundStatusText(status) {
  return refundStatusMap[status] || '处理中'
}

function getPayMethod(method) {
  const methodMap = {
    wechat: '微信支付',
    alipay: '支付宝',
    mock: '模拟支付',
  }
  return methodMap[method] || method || '待支付'
}

function formatTime(time) {
  if (!time) return ''
  const date = new Date(time)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

function copyOrderNo() {
  const orderNo = order.value?.orderNo || order.value?.id || ''
  uni.setClipboardData({
    data: orderNo,
    success: () => {
      uni.showToast({ title: '复制成功', icon: 'success' })
    },
  })
}

function goGoodsDetail(goodsId) {
  if (!goodsId) return
  uni.navigateTo({ url: `/pages/product/detail?id=${goodsId}` })
}

function goPay() {
  uni.navigateTo({ url: `/pages/payment/payment?orderId=${orderId.value}` })
}

async function cancelOrder() {
  uni.showModal({
    title: '提示',
    content: '确定要取消该订单吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await orderStore.cancelOrder(orderId.value)
          uni.showToast({ title: '取消成功', icon: 'success' })
          fetchOrderDetail()
        } catch (e) {
          console.error('Failed to cancel order:', e)
          uni.showToast({ title: '取消失败', icon: 'none' })
        }
      }
    },
  })
}

function handleRemind() {
  uni.showToast({ title: '已提醒商家发货', icon: 'success' })
}

function scrollToLogistics() {
  uni.showToast({ title: '物流信息已在上方展示', icon: 'none' })
}

async function confirmReceive() {
  uni.showModal({
    title: '提示',
    content: '确定已收到商品吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await orderStore.confirmOrder(orderId.value)
          uni.showToast({ title: '确认成功', icon: 'success' })
          fetchOrderDetail()
        } catch (e) {
          console.error('Failed to confirm order:', e)
          uni.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    },
  })
}

function goReview() {
  uni.navigateTo({ url: `/pages/review/review-publish?orderId=${orderId.value}` })
}

async function buyAgain() {
  try {
    await orderStore.buyAgain(orderId.value)
    uni.showToast({ title: '已加入购物车', icon: 'success' })
    setTimeout(() => {
      uni.switchTab({ url: '/pages/cart/cart' })
    }, 1000)
  } catch (e) {
    console.error('Failed to buy again:', e)
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

function openRefundPopup() {
  refundForm.value = { reason: '', description: '' }
  showRefundPopup.value = true
}

function closeRefundPopup() {
  showRefundPopup.value = false
}

async function submitRefund() {
  if (!refundForm.value.reason) {
    uni.showToast({ title: '请选择退款原因', icon: 'none' })
    return
  }

  submittingRefund.value = true
  try {
    await orderStore.applyRefund(orderId.value, {
      reason: refundForm.value.reason,
      description: refundForm.value.description,
    })
    uni.showToast({ title: '申请已提交', icon: 'success' })
    showRefundPopup.value = false
    fetchOrderDetail()
  } catch (e) {
    console.error('Failed to apply refund:', e)
    uni.showToast({ title: '提交失败', icon: 'none' })
  } finally {
    submittingRefund.value = false
  }
}

function viewRefundDetail() {
  uni.showToast({ title: '退款详情功能开发中', icon: 'none' })
}

async function fetchLogistics() {
  try {
    const result = await orderStore.fetchLogistics(orderId.value)
    logistics.value = result
  } catch (e) {
    console.error('Failed to fetch logistics:', e)
  }
}

async function fetchOrderDetail() {
  loading.value = true
  try {
    await orderStore.fetchOrderDetail(orderId.value)

    if (order.value?.status === 'shipped' || order.value?.status === 'completed') {
      fetchLogistics()
    }
  } catch (e) {
    console.error('Failed to fetch order detail:', e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

onLoad((options) => {
  orderId.value = options?.id || ''

  if (orderId.value) {
    fetchOrderDetail()
  }

  if (options?.tab === 'refund') {
    setTimeout(() => {
      if (order.value?.status === 'paid') {
        openRefundPopup()
      }
    }, 500)
  }
})

onUnmounted(() => {
  orderStore.clearCurrentOrder()
})
</script>

<style lang="scss" scoped>
.order-detail-page {
  min-height: 100vh;
  background: $bg-color-page;
  display: flex;
  flex-direction: column;
}

.order-detail-loading {
  display: flex;
  justify-content: center;
  padding: $spacing-xl 0;
  flex: 1;
}

.status-banner {
  display: flex;
  align-items: center;
  padding: $spacing-lg $spacing-base;
  color: #fff;

  &.is-pending {
    background: linear-gradient(135deg, $warning-color, #f5a623);
  }

  &.is-paid {
    background: linear-gradient(135deg, $primary-color, #66b1ff);
  }

  &.is-shipped {
    background: linear-gradient(135deg, $success-color, #85ce61);
  }

  &.is-completed {
    background: linear-gradient(135deg, $info-color, #b1b3b8);
  }

  &.is-cancelled {
    background: linear-gradient(135deg, $text-color-placeholder, #d3d4d6);
  }

  &.is-refunding {
    background: linear-gradient(135deg, $danger-color, #ff8787);
  }

  &.is-refunded {
    background: linear-gradient(135deg, $danger-color, #ff8787);
  }

  &__icon {
    font-size: 80rpx;
    margin-right: $spacing-base;
  }

  &__info {
    flex: 1;
  }

  &__title {
    display: block;
    font-size: $font-size-lg;
    font-weight: 600;
    margin-bottom: 8rpx;
  }

  &__desc {
    font-size: $font-size-sm;
    opacity: 0.9;
  }
}

.order-detail-scroll {
  flex: 1;
  height: 0;
}

.progress-section {
  background: $bg-color-white;
  padding: $spacing-lg $spacing-base;
  margin-bottom: $spacing-base;
}

.progress-bar {
  position: relative;
  display: flex;
  justify-content: space-between;
  padding: 0 20rpx;
}

.progress-line {
  position: absolute;
  top: 30rpx;
  left: 60rpx;
  right: 60rpx;
  height: 4rpx;
  background: $border-color-lighter;
  z-index: 0;

  &__fill {
    height: 100%;
    background: $primary-color;
    transition: width 0.3s ease;
  }
}

.progress-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 1;
  width: 100rpx;

  &__dot {
    width: 60rpx;
    height: 60rpx;
    border-radius: 50%;
    background: $bg-color-white;
    border: 4rpx solid $border-color-lighter;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: $spacing-sm;
    transition: all 0.3s ease;
  }

  &__num {
    font-size: $font-size-sm;
    color: $text-color-placeholder;
  }

  &__check {
    font-size: $font-size-base;
    color: $bg-color-white;
  }

  &__label {
    font-size: $font-size-xs;
    color: $text-color-secondary;
    white-space: nowrap;
    margin-bottom: 4rpx;
  }

  &__time {
    font-size: 20rpx;
    color: $text-color-placeholder;
    white-space: nowrap;
  }

  &.is-active &__dot {
    border-color: $primary-color;
    background: $primary-color;
  }

  &.is-active &__label {
    color: $primary-color;
    font-weight: 500;
  }

  &.is-current &__dot {
    transform: scale(1.1);
    box-shadow: 0 0 0 8rpx rgba(64, 158, 255, 0.2);
  }
}

.address-card {
  display: flex;
  align-items: center;
  background: $bg-color-white;
  padding: $spacing-base;
  margin: 0 $spacing-base $spacing-base;
  border-radius: $border-radius-lg;
  box-shadow: $shadow-sm;

  &__icon {
    font-size: 48rpx;
    margin-right: $spacing-base;
  }

  &__info {
    flex: 1;
    min-width: 0;
  }

  &__top {
    display: flex;
    align-items: center;
    margin-bottom: 8rpx;
  }

  &__name {
    font-size: $font-size-base;
    font-weight: 600;
    color: $text-color;
    margin-right: $spacing-base;
  }

  &__phone {
    font-size: $font-size-sm;
    color: $text-color-secondary;
  }

  &__detail {
    font-size: $font-size-sm;
    color: $text-color-secondary;
    line-height: 1.4;
  }
}

.goods-card,
.amount-card,
.info-card,
.logistics-card,
.refund-card {
  margin: 0 $spacing-base $spacing-base;
}

.goods-list {
  padding: 0;
}

.goods-item {
  display: flex;
  padding: $spacing-base 0;
  border-bottom: 1rpx solid $border-color-lighter;

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  &:first-child {
    padding-top: 0;
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

.logistics-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-base;
  padding-bottom: $spacing-sm;
  border-bottom: 1rpx solid $border-color-lighter;

  &__company {
    font-size: $font-size-base;
    font-weight: 500;
    color: $text-color;
  }

  &__no {
    font-size: $font-size-xs;
    color: $text-color-secondary;
  }
}

.logistics-timeline {
  padding-left: $spacing-sm;
}

.timeline-item {
  position: relative;
  padding-left: $spacing-lg;
  padding-bottom: $spacing-base;

  &:last-child {
    padding-bottom: 0;
  }

  &__dot {
    position: absolute;
    left: 0;
    top: 8rpx;
    width: 16rpx;
    height: 16rpx;
    border-radius: 50%;
    background: $border-color;
  }

  &__line {
    position: absolute;
    left: 7rpx;
    top: 24rpx;
    width: 2rpx;
    bottom: 0;
    background: $border-color-lighter;
  }

  &__content {
    display: flex;
    flex-direction: column;
  }

  &__desc {
    font-size: $font-size-sm;
    color: $text-color-secondary;
    line-height: 1.4;
  }

  &__time {
    font-size: $font-size-xs;
    color: $text-color-placeholder;
    margin-top: 4rpx;
  }

  &.is-first {
    .timeline-item__dot {
      background: $success-color;
      width: 20rpx;
      height: 20rpx;
      left: -2rpx;
    }

    .timeline-item__desc {
      color: $text-color;
      font-weight: 500;
    }
  }
}

.logistics-more {
  text-align: center;
  padding-top: $spacing-sm;
  margin-top: $spacing-sm;
  border-top: 1rpx solid $border-color-lighter;

  text {
    font-size: $font-size-xs;
    color: $primary-color;
  }
}

.refund-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: $spacing-sm;
  margin-bottom: $spacing-sm;
  border-bottom: 1rpx solid $border-color-lighter;

  &__label {
    font-size: $font-size-sm;
    color: $text-color-secondary;
  }

  &__value {
    font-size: $font-size-sm;
    font-weight: 500;

    &.is-pending {
      color: $warning-color;
    }

    &.is-approved {
      color: $primary-color;
    }

    &.is-rejected {
      color: $danger-color;
    }

    &.is-completed {
      color: $success-color;
    }
  }
}

.refund-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-xs 0;

  &__label {
    font-size: $font-size-sm;
    color: $text-color-secondary;
  }

  &__value {
    font-size: $font-size-sm;
    color: $text-color;
    text-align: right;
  }
}

.amount-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-sm 0;

  &--total {
    padding-top: $spacing-base;
    margin-top: $spacing-sm;
    border-top: 1rpx solid $border-color-lighter;
  }

  &__label {
    font-size: $font-size-sm;
    color: $text-color-secondary;
  }

  &__value {
    font-size: $font-size-sm;
    color: $text-color;

    &--discount {
      color: $danger-color;
    }

    &--total {
      font-size: $font-size-md;
      color: $danger-color;
      font-weight: 600;
    }
  }
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-sm 0;

  &__label {
    font-size: $font-size-sm;
    color: $text-color-secondary;
    flex-shrink: 0;
  }

  &__value {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
  }

  &__text {
    font-size: $font-size-sm;
    color: $text-color;
    text-align: right;
  }

  &__copy {
    font-size: $font-size-xs;
    color: $primary-color;
    padding: 4rpx 16rpx;
    border: 1rpx solid $primary-color;
    border-radius: $border-radius-sm;
  }
}

.bottom-space {
  height: 140rpx;
}

.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: $bg-color-white;
  padding: $spacing-sm $spacing-base;
  padding-bottom: calc(#{$spacing-sm} + #{$safe-area-bottom});
  border-top: 1rpx solid $border-color-lighter;
  z-index: 100;

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: $spacing-sm;
  }
}

.refund-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;

  &__content {
    width: 100%;
    max-height: 80vh;
    background: $bg-color-white;
    border-radius: $border-radius-lg $border-radius-lg 0 0;
    display: flex;
    flex-direction: column;
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: $spacing-base;
    border-bottom: 1rpx solid $border-color-lighter;
  }

  &__title {
    font-size: $font-size-md;
    font-weight: 600;
    color: $text-color;
  }

  &__close {
    font-size: $font-size-lg;
    color: $text-color-placeholder;
    padding: $spacing-xs;
  }

  &__body {
    flex: 1;
    padding: $spacing-base;
    overflow-y: auto;
  }

  &__footer {
    padding: $spacing-base;
    padding-bottom: calc(#{$spacing-base} + #{$safe-area-bottom});
    border-top: 1rpx solid $border-color-lighter;
  }
}

.refund-form {
  & .form-item {
    margin-bottom: $spacing-lg;

    &:last-child {
      margin-bottom: 0;
    }

    &__label {
      display: block;
      font-size: $font-size-base;
      color: $text-color;
      margin-bottom: $spacing-sm;
      font-weight: 500;
    }

    &__required {
      color: $danger-color;
    }

    &__value {
      font-size: $font-size-lg;
      color: $danger-color;
      font-weight: 600;
    }

    &__reasons {
      display: flex;
      flex-wrap: wrap;
      gap: $spacing-sm;
    }

    &__textarea {
      width: 100%;
      min-height: 160rpx;
      padding: $spacing-sm;
      font-size: $font-size-sm;
      color: $text-color;
      background: $bg-color-page;
      border-radius: $border-radius-base;
      box-sizing: border-box;
    }

    &__count {
      display: block;
      text-align: right;
      font-size: $font-size-xs;
      color: $text-color-placeholder;
      margin-top: 4rpx;
    }
  }
}

.reason-tag {
  padding: $spacing-xs $spacing-base;
  font-size: $font-size-sm;
  color: $text-color-secondary;
  background: $bg-color-page;
  border-radius: $border-radius-sm;
  border: 1rpx solid transparent;
  transition: all 0.2s ease;

  &.is-active {
    color: $primary-color;
    background: rgba(64, 158, 255, 0.1);
    border-color: $primary-color;
  }
}
</style>
