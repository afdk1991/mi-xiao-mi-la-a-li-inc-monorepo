<template>
  <view class="coupon-card gexm-card" @click="goCoupon">
    <view class="coupon-row">
      <text class="coupon-row__icon">🎫</text>
      <view class="coupon-row__info">
        <text class="coupon-row__label">优惠券</text>
        <text class="coupon-row__value" :class="couponSelected ? '' : 'coupon-row__value--placeholder'">
          {{ couponSelected ? `-¥${couponSelected.discount}` : '暂无可用优惠券' }}
        </text>
      </view>
      <text class="coupon-row__arrow">›</text>
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  couponSelected: { discount: number; id: string } | null
}>()

function goCoupon() {
  uni.navigateTo({ url: '/pages/coupon/coupon-list?select=1' })
}
</script>

<style lang="scss" scoped>
.coupon-card {
  margin: 0 $spacing-base $spacing-base;
}

.coupon-row {
  display: flex;
  align-items: center;

  &__icon {
    font-size: 36rpx;
    margin-right: $spacing-sm;
  }

  &__info {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  &__label {
    font-size: $font-size-base;
    color: $text-color;
  }

  &__value {
    font-size: $font-size-sm;
    color: $danger-color;
    font-weight: 500;
    margin-top: 4rpx;

    &--hint {
      color: $primary-color;
      font-weight: normal;
    }

    &--placeholder {
      color: $text-color-placeholder;
      font-weight: normal;
    }
  }

  &__arrow {
    font-size: $font-size-lg;
    color: $text-color-placeholder;
  }
}
</style>
