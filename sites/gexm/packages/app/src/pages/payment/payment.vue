<template>
  <view class="payment-page">
    <gexm-nav-bar title="支付" />

    <view v-if="loading" class="payment-loading">
      <gexm-loading />
    </view>

    <template v-else-if="order && !payResult">
      <view class="payment-content">
        <view class="payment-amount">
          <text class="payment-amount__label">支付金额</text>
          <view class="payment-amount__value">
            <text class="payment-amount__symbol">¥</text>
            <text class="payment-amount__number">
              {{ (order.payAmount || order.totalAmount || 0).toFixed(2) }}
            </text>
          </view>
          <text v-if="order.orderNo" class="payment-amount__order">
            订单号：{{ order.orderNo }}
          </text>
          <view v-if="countdown > 0" class="payment-countdown">
            <text class="payment-countdown__text">支付剩余时间：</text>
            <text class="payment-countdown__time">{{ formatCountdown(countdown) }}</text>
          </view>
        </view>

        <gexm-card class="payment-methods" title="选择支付方式">
          <view
            v-for="method in payMethods"
            :key="method.value"
            class="method-item"
            :class="{
              'is-selected': selectedMethod === method.value,
              'is-disabled': method.disabled,
            }"
            @click="!method.disabled && selectMethod(method.value)"
          >
            <view class="method-item__left">
              <text class="method-item__icon">{{ method.icon }}</text>
              <view class="method-item__info">
                <text class="method-item__name">{{ method.name }}</text>
                <text class="method-item__desc">{{ method.desc }}</text>
              </view>
            </view>
            <view class="method-item__radio">
              <view v-if="selectedMethod === method.value" class="method-item__radio-inner" />
            </view>
          </view>
        </gexm-card>

        <view class="bottom-space" />
      </view>
    </template>

    <view v-else-if="payResult" class="payment-result">
      <view class="payment-result__icon">
        {{ payResult.success ? '✅' : '❌' }}
      </view>
      <text class="payment-result__title">
        {{ payResult.success ? '支付成功' : '支付失败' }}
      </text>
      <text class="payment-result__desc">
        {{ payResult.message || (payResult.success ? '感谢您的购买' : '请重新尝试支付') }}
      </text>
      <view v-if="payResult.success" class="payment-result__amount">
        <text class="payment-result__amount-label">支付金额</text>
        <text class="payment-result__amount-value">
          ¥{{ (order?.payAmount || order?.totalAmount || 0).toFixed(2) }}
        </text>
      </view>
      <view v-if="order?.orderNo && payResult.success" class="payment-result__order">
        <text class="payment-result__order-label">订单编号</text>
        <text class="payment-result__order-no">{{ order.orderNo }}</text>
      </view>
    </view>

    <view v-if="!payResult && !loading" class="bottom-bar">
      <gexm-button
        type="primary"
        size="large"
        block
        :loading="paying"
        :disabled="!selectedMethod || paying || countdown === 0"
        @click="handlePay"
      >
        {{ countdown === 0 ? '订单已超时' : '确认支付' }}
      </gexm-button>
    </view>

    <view v-else-if="payResult" class="bottom-bar">
      <view v-if="payResult.success" class="result-actions">
        <gexm-button type="default" size="large" block style="margin-bottom: 24rpx" @click="goHome">
          返回首页
        </gexm-button>
        <gexm-button type="primary" size="large" block @click="goToOrderDetail">
          查看订单
        </gexm-button>
      </view>
      <view v-else>
        <gexm-button
          type="default"
          size="large"
          block
          style="margin-bottom: 24rpx"
          @click="resetPay"
        >
          重新支付
        </gexm-button>
        <gexm-button type="primary" size="large" block @click="goBackOrOrder">返回</gexm-button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import paymentApi from '@/api/payment'
import { useOrderStore } from '@/store/order'

const orderStore = useOrderStore()

const orderId = ref('')
const order = ref(null)
const selectedMethod = ref('mock')
const paying = ref(false)
const payResult = ref(null)
const loading = ref(false)
const countdown = ref(0)

let countdownTimer = null
let queryTimer = null

const payMethods = [
  { value: 'wxpay', name: '微信支付', desc: '推荐使用', icon: '💚', disabled: false },
  { value: 'alipay', name: '支付宝', desc: '支付宝安全支付', icon: '💙', disabled: false },
  { value: 'mock', name: '模拟支付', desc: '开发测试使用', icon: '🧪', disabled: false },
]

function selectMethod(method) {
  selectedMethod.value = method
}

function formatCountdown(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function startCountdown() {
  if (order.value?.status !== 'pending') return

  const expireTime = order.value?.expireTime || order.value?.payExpireTime
  if (expireTime) {
    const expire = new Date(expireTime).getTime()
    const now = Date.now()
    const diff = Math.floor((expire - now) / 1000)
    if (diff > 0) {
      countdown.value = diff
    } else {
      countdown.value = 0
      return
    }
  } else {
    countdown.value = 30 * 60
  }

  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(countdownTimer)
      countdown.value = 0
      handleOrderTimeout()
    }
  }, 1000)
}

async function handleOrderTimeout() {
  try {
    await paymentApi.closePayment(orderId.value)
    uni.showToast({ title: '订单已超时，请重新下单', icon: 'none' })
  } catch (e) {
    console.error('Failed to close payment:', e)
  }
}

async function queryPaymentStatus() {
  try {
    const result = await paymentApi.queryPayment(orderId.value)
    if (result.status === 'paid' || result.paid) {
      clearInterval(queryTimer)
      payResult.value = {
        success: true,
        message: '支付成功',
      }
      uni.showToast({ title: '支付成功', icon: 'success' })
    }
  } catch (e) {
    console.error('Failed to query payment status:', e)
  }
}

function startQueryPolling() {
  if (queryTimer) {
    clearInterval(queryTimer)
  }
  queryTimer = setInterval(() => {
    queryPaymentStatus()
  }, 3000)
}

async function handlePay() {
  if (!selectedMethod.value) {
    uni.showToast({ title: '请选择支付方式', icon: 'none' })
    return
  }

  if (countdown.value <= 0) {
    uni.showToast({ title: '订单已超时', icon: 'none' })
    return
  }

  paying.value = true
  try {
    const result = await paymentApi.pay({
      orderId: orderId.value,
      payChannel: selectedMethod.value,
    })

    if (selectedMethod.value === 'mock') {
      if (result.success !== false) {
        payResult.value = {
          success: true,
          message: result.message || '支付成功',
        }
        uni.showToast({ title: '支付成功', icon: 'success' })
        if (countdownTimer) {
          clearInterval(countdownTimer)
        }
      } else {
        payResult.value = {
          success: false,
          message: result.message || '支付失败',
        }
      }
    } else {
      payResult.value = {
        success: true,
        message: '支付成功',
      }
      startQueryPolling()
    }
  } catch (e) {
    console.error('Payment failed:', e)
    payResult.value = {
      success: false,
      message: e.message || '支付失败，请稍后重试',
    }
  } finally {
    paying.value = false
  }
}

function resetPay() {
  payResult.value = null
}

function goHome() {
  uni.switchTab({
    url: '/pages/index/index',
    fail: () => {
      uni.reLaunch({ url: '/pages/index/index' })
    },
  })
}

function goToOrderDetail() {
  uni.redirectTo({ url: `/pages/order/order-detail?id=${orderId.value}` })
}

function goBackOrOrder() {
  uni.navigateBack({
    fail: () => {
      uni.switchTab({
        url: '/pages/order/order',
        fail: () => {
          uni.reLaunch({ url: '/pages/index/index' })
        },
      })
    },
  })
}

async function fetchOrderDetail() {
  loading.value = true
  try {
    const result = await orderStore.fetchOrderDetail(orderId.value)
    order.value = result

    if (result.status === 'pending') {
      startCountdown()
    }
  } catch (e) {
    console.error('Failed to fetch order detail:', e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

onLoad((options) => {
  orderId.value = options?.orderId || options?.id || ''

  if (orderId.value) {
    fetchOrderDetail()
  }
})

onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
  }
  if (queryTimer) {
    clearInterval(queryTimer)
  }
})
</script>

<style lang="scss" scoped>
.payment-page {
  min-height: 100vh;
  background: $bg-color-page;
  display: flex;
  flex-direction: column;
}

.payment-loading {
  display: flex;
  justify-content: center;
  padding: $spacing-xl 0;
  flex: 1;
}

.payment-content {
  flex: 1;
}

.payment-amount {
  background: $bg-color-white;
  padding: $spacing-xl $spacing-base;
  text-align: center;
  margin-bottom: $spacing-base;

  &__label {
    display: block;
    font-size: $font-size-base;
    color: $text-color-secondary;
    margin-bottom: $spacing-sm;
  }

  &__value {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    margin-bottom: $spacing-sm;
  }

  &__symbol {
    font-size: $font-size-lg;
    color: $danger-color;
    font-weight: 600;
    margin-top: 8rpx;
  }

  &__number {
    font-size: 80rpx;
    color: $danger-color;
    font-weight: bold;
    line-height: 1;
  }

  &__order {
    font-size: $font-size-sm;
    color: $text-color-placeholder;
    display: block;
    margin-bottom: $spacing-base;
  }
}

.payment-countdown {
  display: flex;
  justify-content: center;
  align-items: center;
  padding-top: $spacing-sm;
  border-top: 1rpx solid $border-color-lighter;
  margin-top: $spacing-base;

  &__text {
    font-size: $font-size-sm;
    color: $text-color-secondary;
  }

  &__time {
    font-size: $font-size-base;
    color: $danger-color;
    font-weight: 600;
    margin-left: $spacing-xs;
  }
}

.payment-methods {
  margin: 0 $spacing-base;
}

.method-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-base 0;
  border-bottom: 1rpx solid $border-color-lighter;

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  &:first-child {
    padding-top: 0;
  }

  &__left {
    display: flex;
    align-items: center;
  }

  &__icon {
    font-size: 56rpx;
    margin-right: $spacing-base;
  }

  &__info {
    display: flex;
    flex-direction: column;
  }

  &__name {
    font-size: $font-size-base;
    color: $text-color;
    font-weight: 500;
  }

  &__desc {
    font-size: $font-size-xs;
    color: $text-color-placeholder;
    margin-top: 4rpx;
  }

  &__radio {
    width: 40rpx;
    height: 40rpx;
    border: 2rpx solid $border-color;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &.is-selected &__radio {
    border-color: $primary-color;
  }

  &__radio-inner {
    width: 24rpx;
    height: 24rpx;
    background: $primary-color;
    border-radius: 50%;
  }

  &.is-disabled {
    opacity: 0.5;
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
}

.payment-result {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 120rpx;

  &__icon {
    font-size: 160rpx;
    margin-bottom: $spacing-lg;
  }

  &__title {
    font-size: $font-size-xl;
    font-weight: 600;
    color: $text-color;
    margin-bottom: $spacing-sm;
  }

  &__desc {
    font-size: $font-size-sm;
    color: $text-color-secondary;
    margin-bottom: $spacing-xl;
  }

  &__amount {
    background: $bg-color-white;
    border-radius: $border-radius-lg;
    padding: $spacing-lg $spacing-xl;
    text-align: center;
    box-shadow: $shadow-sm;
  }

  &__amount-label {
    display: block;
    font-size: $font-size-sm;
    color: $text-color-secondary;
    margin-bottom: $spacing-xs;
  }

  &__amount-value {
    font-size: $font-size-xl;
    color: $danger-color;
    font-weight: 600;
  }
}

.payment-result__order {
  margin-top: $spacing-lg;
  padding: $spacing-base $spacing-lg;
  background: $bg-color-white;
  border-radius: $border-radius-base;
  text-align: center;

  &-label {
    display: block;
    font-size: $font-size-xs;
    color: $text-color-placeholder;
    margin-bottom: $spacing-xs;
  }

  &-no {
    font-size: $font-size-sm;
    color: $text-color-secondary;
    font-family: monospace;
  }
}

.result-actions {
  width: 100%;
}
</style>
