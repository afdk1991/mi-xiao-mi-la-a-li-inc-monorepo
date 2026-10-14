<template>
  <view class="coupon-select-page">
    <gexm-nav-bar title="选择优惠券" @back="handleBack" />
    <gexm-loading v-if="loading" />
    <gexm-empty v-else-if="availableCoupons.length === 0" description="暂无可用优惠券" />
    <view v-else class="coupon-list">
      <view class="coupon-item" @click="selectCoupon(null)">
        <view class="coupon-item__radio">
          <view
            class="coupon-item__radio-inner"
            :class="{ 'coupon-item__radio-inner--checked': !selectedCoupon }"
          />
        </view>
        <view class="coupon-item__content">
          <text class="coupon-item__label">不使用优惠券</text>
        </view>
      </view>
      <view
        v-for="coupon in availableCoupons"
        :key="coupon.id"
        class="coupon-card"
        @click="selectCoupon(coupon)"
      >
        <view class="coupon-card__radio">
          <view
            class="coupon-card__radio-inner"
            :class="{ 'coupon-card__radio-inner--checked': selectedCoupon?.id === coupon.id }"
          />
        </view>
        <view class="coupon-card__left">
          <text class="coupon-card__amount">
            {{ coupon.type === 'fixed' ? '¥' : '' }}{{ coupon.value }}
          </text>
          <text class="coupon-card__type">{{ coupon.type === 'fixed' ? '满减券' : '折扣券' }}</text>
        </view>
        <view class="coupon-card__right">
          <text class="coupon-card__name">{{ coupon.name }}</text>
          <text class="coupon-card__condition">满{{ coupon.minAmount }}可用</text>
          <text class="coupon-card__valid">{{ coupon.validFrom }} - {{ coupon.validTo }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useCouponStore } from '@/store/coupon'
import { useUserStore } from '@/store/user'

const couponStore = useCouponStore()
const userStore = useUserStore()
const loading = ref(true)

const selectedCoupon = computed(() => couponStore.selectedCoupon)
const availableCoupons = computed(() => couponStore.availableCoupons)

onMounted(() => {
  if (!userStore.isLoggedIn) {
    uni.navigateBack()
    return
  }
})

onShow(() => {
  if (userStore.isLoggedIn) {
    fetchCoupons()
  }
})

async function fetchCoupons() {
  loading.value = true
  try {
    await couponStore.fetchMyCoupons()
  } catch (e) {
    console.error('Fetch coupons error:', e)
  } finally {
    loading.value = false
  }
}

function selectCoupon(coupon) {
  couponStore.selectCoupon(coupon)
  uni.navigateBack()
}

function handleBack() {
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
.coupon-select-page {
  min-height: 100vh;
  background: $bg-color-page;
}

.coupon-list {
  padding: $spacing-base;
}

.coupon-item {
  display: flex;
  align-items: center;
  background: $bg-color-white;
  padding: $spacing-base;
  border-radius: $border-radius-lg;
  margin-bottom: $spacing-base;
  box-shadow: $shadow-sm;

  &__radio {
    width: 44rpx;
    height: 44rpx;
    border-radius: 50%;
    border: 2rpx solid $border-color;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: $spacing-base;
    flex-shrink: 0;
  }

  &__radio-inner {
    width: 28rpx;
    height: 28rpx;
    border-radius: 50%;
    background: transparent;
    transition: all 0.2s;

    &--checked {
      background: $primary-color;
    }
  }

  &__content {
    flex: 1;
  }

  &__label {
    font-size: $font-size-base;
    color: $text-color;
  }
}

.coupon-card {
  display: flex;
  align-items: center;
  background: $bg-color-white;
  border-radius: $border-radius-lg;
  overflow: hidden;
  margin-bottom: $spacing-base;
  box-shadow: $shadow-sm;

  &__radio {
    width: 44rpx;
    height: 44rpx;
    border-radius: 50%;
    border: 2rpx solid $border-color;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 $spacing-base;
    flex-shrink: 0;
  }

  &__radio-inner {
    width: 28rpx;
    height: 28rpx;
    border-radius: 50%;
    background: transparent;
    transition: all 0.2s;

    &--checked {
      background: $primary-color;
    }
  }

  &__left {
    width: 160rpx;
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: $spacing-md 0;
    flex-shrink: 0;
  }

  &__amount {
    font-size: 48rpx;
    font-weight: bold;
    color: #fff;
    line-height: 1;
  }

  &__type {
    font-size: 18rpx;
    color: rgba(255, 255, 255, 0.8);
    margin-top: 4rpx;
  }

  &__right {
    flex: 1;
    padding: $spacing-base;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  &__name {
    font-size: $font-size-md;
    font-weight: 600;
    color: $text-color;
  }

  &__condition {
    font-size: $font-size-xs;
    color: $text-color-secondary;
    margin-top: 4rpx;
  }

  &__valid {
    font-size: $font-size-xs;
    color: $text-color-placeholder;
    margin-top: 4rpx;
  }
}
</style>
