<template>
  <view class="coupon-mine-page">
    <gexm-nav-bar title="我的优惠券" />
    <view class="coupon-tabs">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="coupon-tab"
        :class="{ 'is-active': activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        <text class="coupon-tab__text">{{ tab.label }}</text>
        <text v-if="tab.count > 0" class="coupon-tab__badge">{{ tab.count }}</text>
      </view>
    </view>
    <gexm-loading v-if="loading" />
    <gexm-empty v-else-if="couponList.length === 0" description="暂无优惠券" />
    <view v-else class="coupon-list">
      <view v-for="coupon in couponList" :key="coupon.id" class="coupon-card">
        <view class="coupon-card__left" :class="{ 'is-disabled': coupon.status !== 'unused' }">
          <text class="coupon-card__amount">¥{{ coupon.amount }}</text>
          <text class="coupon-card__condition">满{{ coupon.minAmount }}可用</text>
        </view>
        <view class="coupon-card__right">
          <text class="coupon-card__name">{{ coupon.name }}</text>
          <text class="coupon-card__valid">{{ coupon.validPeriod }}</text>
          <text class="coupon-card__status">{{ getStatusText(coupon.status) }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { couponApi } from '@/api'

const userStore = useUserStore()
const loading = ref(true)
const coupons = ref([])
const activeTab = ref('unused')

const tabs = computed(() => [
  {
    key: 'unused',
    label: '未使用',
    count: coupons.value.filter((c) => c.status === 'unused').length,
  },
  { key: 'used', label: '已使用', count: coupons.value.filter((c) => c.status === 'used').length },
  {
    key: 'expired',
    label: '已过期',
    count: coupons.value.filter((c) => c.status === 'expired').length,
  },
])

const couponList = computed(() => {
  return coupons.value.filter((c) => c.status === activeTab.value)
})

onMounted(() => {
  if (!userStore.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }
})

onShow(() => {
  if (userStore.isLoggedIn) {
    fetchCoupons()
  }
})

watch(activeTab, () => {})

async function fetchCoupons() {
  loading.value = true
  try {
    const data = await couponApi.getMine()
    coupons.value = data || []
  } catch (e) {
    console.error('Fetch my coupons error:', e)
    coupons.value = []
  } finally {
    loading.value = false
  }
}

function getStatusText(status) {
  const map = {
    unused: '未使用',
    used: '已使用',
    expired: '已过期',
  }
  return map[status] || status
}
</script>

<style lang="scss" scoped>
.coupon-mine-page {
  min-height: 100vh;
  background: $bg-color-page;
}

.coupon-tabs {
  display: flex;
  background: #fff;
  padding: $spacing-sm 0;
  border-bottom: 1rpx solid $border-color-lighter;
}

.coupon-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $spacing-sm 0;
  position: relative;

  &__text {
    font-size: $font-size-base;
    color: $text-color-secondary;
  }

  &__badge {
    background: $danger-color;
    color: #fff;
    font-size: $font-size-xs;
    padding: 2rpx 12rpx;
    border-radius: 20rpx;
    margin-left: $spacing-xs;
  }

  &.is-active {
    .coupon-tab__text {
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

.coupon-list {
  padding: $spacing-base;
}

.coupon-card {
  display: flex;
  background: #fff;
  border-radius: $border-radius-md;
  overflow: hidden;
  margin-bottom: $spacing-base;
  box-shadow: $shadow-sm;

  &__left {
    width: 200rpx;
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: $spacing-md 0;
    flex-shrink: 0;

    &.is-disabled {
      background: linear-gradient(135deg, #ccc 0%, #999 100%);
    }
  }

  &__amount {
    font-size: 56rpx;
    font-weight: bold;
    color: #fff;
    line-height: 1;
  }

  &__condition {
    font-size: 20rpx;
    color: rgba(255, 255, 255, 0.8);
    margin-top: $spacing-xs;
  }

  &__right {
    flex: 1;
    padding: $spacing-base;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  &__name {
    font-size: $font-size-md;
    font-weight: 600;
    color: $text-color;
  }

  &__valid {
    font-size: $font-size-xs;
    color: $text-color-placeholder;
    margin-top: $spacing-xs;
  }

  &__status {
    font-size: $font-size-sm;
    color: $text-color-placeholder;
    margin-top: $spacing-sm;
  }
}
</style>
