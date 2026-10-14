<template>
  <view class="logistics-page">
    <gexm-nav-bar title="物流追踪" />

    <view v-if="loading" class="logistics-loading">
      <gexm-loading />
    </view>

    <template v-else-if="logistics">
      <view class="logistics-header-card">
        <view class="logistics-header__icon">🚚</view>
        <view class="logistics-header__info">
          <text class="logistics-header__company">{{ logistics.companyName || '物流公司' }}</text>
          <text class="logistics-header__no">快递单号：{{ logistics.trackingNo || '-' }}</text>
        </view>
        <view class="logistics-header__status" :class="`is-${currentStatus}`">
          {{ currentStatusText }}
        </view>
      </view>

      <view class="logistics-progress">
        <view class="progress-track">
          <view class="progress-track__line" :style="{ height: progressHeight + 'rpx' }">
            <view class="progress-track__fill" :style="{ height: progressFillHeight + 'rpx' }" />
          </view>
        </view>
        <view class="progress-steps">
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
            <view class="progress-step__content">
              <text class="progress-step__label">{{ step.label }}</text>
              <text v-if="step.time" class="progress-step__time">{{ step.time }}</text>
            </view>
          </view>
        </view>
      </view>

      <gexm-card class="logistics-timeline-card" title="物流详情">
        <view class="timeline">
          <view
            v-for="(track, index) in logistics.tracks"
            :key="index"
            class="timeline-item"
            :class="{ 'is-first': index === 0 }"
          >
            <view class="timeline-item__left">
              <view class="timeline-item__dot" />
              <view v-if="index < logistics.tracks.length - 1" class="timeline-item__line" />
            </view>
            <view class="timeline-item__right">
              <text class="timeline-item__desc">
                {{ track.desc || track.description || track.message }}
              </text>
              <text class="timeline-item__time">{{ formatTime(track.time) }}</text>
            </view>
          </view>
        </view>
      </gexm-card>

      <gexm-card class="logistics-info-card" title="收货信息">
        <view class="info-row">
          <text class="info-row__label">收件人</text>
          <text class="info-row__value">{{ orderInfo?.address?.name || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="info-row__label">联系电话</text>
          <text class="info-row__value">{{ orderInfo?.address?.phone || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="info-row__label">收货地址</text>
          <text class="info-row__value info-row__value--long">
            {{ orderInfo?.address?.detail || orderInfo?.address?.address || '-' }}
          </text>
        </view>
      </gexm-card>

      <view class="bottom-space" />
    </template>

    <gexm-empty v-else description="暂无物流信息" />
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useOrderStore } from '@/store/order'

const orderStore = useOrderStore()

const orderId = ref('')
const loading = ref(false)
const logistics = ref(null)
const orderInfo = ref(null)

const progressSteps = computed(() => {
  const steps = [
    { key: 'pending', label: '订单已提交', active: false, current: false, time: '' },
    { key: 'paid', label: '订单已付款', active: false, current: false, time: '' },
    { key: 'shipped', label: '已发货', active: false, current: false, time: '' },
    { key: 'in_transit', label: '运输中', active: false, current: false, time: '' },
    { key: 'delivered', label: '已送达', active: false, current: false, time: '' },
  ]

  const tracks = logistics.value?.tracks || []
  if (tracks.length === 0) {
    steps[0].active = true
    steps[0].current = true
    return steps
  }

  const firstTrack = tracks[0]
  const firstDesc = (firstTrack.desc || firstTrack.description || '').toLowerCase()

  let activeIndex = 0

  if (firstDesc.includes('签收') || firstDesc.includes('送达') || firstDesc.includes('签收成功')) {
    activeIndex = 4
    steps[4].time = formatTime(firstTrack.time)
  } else if (
    firstDesc.includes('派送') ||
    firstDesc.includes('派送中') ||
    firstDesc.includes('派件')
  ) {
    activeIndex = 3
    steps[3].time = formatTime(firstTrack.time)
  } else if (
    firstDesc.includes('发货') ||
    firstDesc.includes('已揽收') ||
    firstDesc.includes('揽收')
  ) {
    activeIndex = 2
    steps[2].time = formatTime(firstTrack.time)
  }

  for (let i = 0; i <= activeIndex; i++) {
    steps[i].active = true
  }
  steps[activeIndex].current = true

  if (orderInfo.value) {
    steps[0].time = formatTime(orderInfo.value.createdAt || orderInfo.value.createTime)
    if (orderInfo.value.payTime) {
      steps[1].time = formatTime(orderInfo.value.payTime)
      steps[1].active = true
    }
    if (orderInfo.value.shipTime) {
      steps[2].time = formatTime(orderInfo.value.shipTime)
    }
  }

  return steps
})

const currentStatus = computed(() => {
  const tracks = logistics.value?.tracks || []
  if (tracks.length === 0) return 'pending'

  const firstDesc = (tracks[0].desc || tracks[0].description || '').toLowerCase()
  if (firstDesc.includes('签收') || firstDesc.includes('送达')) return 'delivered'
  if (firstDesc.includes('派送') || firstDesc.includes('派件')) return 'delivering'
  if (firstDesc.includes('发货') || firstDesc.includes('揽收') || firstDesc.includes('运输')) {
    return 'shipping'
  }
  return 'pending'
})

const currentStatusText = computed(() => {
  const statusMap = {
    pending: '待发货',
    shipping: '运输中',
    delivering: '派送中',
    delivered: '已签收',
  }
  return statusMap[currentStatus.value] || '处理中'
})

const progressHeight = computed(() => {
  return progressSteps.value.length * 100
})

const progressFillHeight = computed(() => {
  const activeCount = progressSteps.value.filter((s) => s.active).length
  return ((activeCount - 1) / (progressSteps.value.length - 1)) * progressHeight.value
})

function formatTime(time) {
  if (!time) return '-'
  const date = new Date(time)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

async function fetchLogistics() {
  loading.value = true
  try {
    const result = await orderStore.fetchLogistics(orderId.value)
    logistics.value = result

    await orderStore.fetchOrderDetail(orderId.value)
    orderInfo.value = orderStore.currentOrder
  } catch (e) {
    console.error('Failed to fetch logistics:', e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

onLoad((options) => {
  orderId.value = options?.id || ''
  if (orderId.value) {
    fetchLogistics()
  }
})

onMounted(() => {})
</script>

<style lang="scss" scoped>
.logistics-page {
  min-height: 100vh;
  background: $bg-color-page;
}

.logistics-loading {
  display: flex;
  justify-content: center;
  padding: $spacing-xl 0;
}

.logistics-header-card {
  background: linear-gradient(135deg, $primary-color 0%, #66b1ff 100%);
  margin: $spacing-base;
  padding: $spacing-lg;
  border-radius: $border-radius-lg;
  display: flex;
  align-items: center;
  color: #fff;
  box-shadow: $shadow-md;
}

.logistics-header__icon {
  font-size: 64rpx;
  margin-right: $spacing-base;
}

.logistics-header__info {
  flex: 1;
}

.logistics-header__company {
  display: block;
  font-size: $font-size-lg;
  font-weight: 600;
  margin-bottom: 8rpx;
}

.logistics-header__no {
  font-size: $font-size-sm;
  opacity: 0.8;
}

.logistics-header__status {
  padding: $spacing-xs $spacing-base;
  border-radius: $border-radius-sm;
  font-size: $font-size-xs;
  font-weight: 500;

  &.is-pending {
    background: rgba(255, 193, 7, 0.2);
    color: #fff;
  }

  &.is-shipping,
  &.is-delivering {
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
  }

  &.is-delivered {
    background: rgba(103, 194, 58, 0.2);
    color: #fff;
  }
}

.logistics-progress {
  background: $bg-color-white;
  margin: $spacing-base;
  padding: $spacing-lg;
  border-radius: $border-radius-lg;
  box-shadow: $shadow-sm;
}

.progress-track {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  z-index: 0;
}

.progress-track__line {
  width: 6rpx;
  background: $border-color-lighter;
  border-radius: 3rpx;
}

.progress-track__fill {
  width: 100%;
  background: $primary-color;
  border-radius: 3rpx;
  transition: height 0.3s ease;
}

.progress-steps {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
}

.progress-step {
  display: flex;
  align-items: center;
  padding: $spacing-sm 0;
  position: relative;

  &__dot {
    width: 48rpx;
    height: 48rpx;
    border-radius: 50%;
    background: $bg-color-white;
    border: 4rpx solid $border-color-lighter;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: $spacing-base;
    flex-shrink: 0;
    transition: all 0.3s ease;
  }

  &__num {
    font-size: $font-size-xs;
    color: $text-color-placeholder;
  }

  &__check {
    font-size: $font-size-base;
    color: $bg-color-white;
  }

  &__content {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  &__label {
    font-size: $font-size-sm;
    color: $text-color-secondary;
  }

  &__time {
    font-size: 22rpx;
    color: $text-color-placeholder;
    margin-top: 4rpx;
  }

  &.is-active &__dot {
    border-color: $primary-color;
    background: $primary-color;
  }

  &.is-active &__label {
    color: $text-color;
    font-weight: 500;
  }

  &.is-current &__dot {
    transform: scale(1.15);
    box-shadow: 0 0 0 8rpx rgba(64, 158, 255, 0.2);
  }
}

.logistics-timeline-card,
.logistics-info-card {
  margin: $spacing-base;
}

.timeline {
  padding-left: $spacing-sm;
}

.timeline-item {
  display: flex;
  padding-bottom: $spacing-lg;
  position: relative;

  &:last-child {
    padding-bottom: 0;

    .timeline-item__line {
      display: none;
    }
  }

  &__left {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 32rpx;
    flex-shrink: 0;
  }

  &__dot {
    width: 20rpx;
    height: 20rpx;
    border-radius: 50%;
    background: $border-color;
    flex-shrink: 0;
  }

  &__line {
    width: 4rpx;
    flex: 1;
    background: $border-color-lighter;
    margin: 8rpx 0;
    min-height: 40rpx;
  }

  &__right {
    flex: 1;
    padding-left: $spacing-base;
    display: flex;
    flex-direction: column;
  }

  &__desc {
    font-size: $font-size-sm;
    color: $text-color-secondary;
    line-height: 1.4;
  }

  &__time {
    font-size: 22rpx;
    color: $text-color-placeholder;
    margin-top: 8rpx;
  }

  &.is-first {
    .timeline-item__dot {
      background: $success-color;
      width: 24rpx;
      height: 24rpx;
    }

    .timeline-item__desc {
      color: $text-color;
      font-weight: 500;
    }
  }
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: $spacing-sm 0;

  &__label {
    font-size: $font-size-sm;
    color: $text-color-secondary;
    flex-shrink: 0;
    width: 140rpx;
  }

  &__value {
    font-size: $font-size-sm;
    color: $text-color;
    text-align: right;
    flex: 1;

    &--long {
      text-align: left;
    }
  }
}

.bottom-space {
  height: 80rpx;
}
</style>
