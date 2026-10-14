<template>
  <view class="amount-card gexm-card">
    <view class="amount-row">
      <text class="amount-row__label">商品金额</text>
      <text class="amount-row__value">¥{{ goodsTotal }}</text>
    </view>
    <view class="amount-row">
      <text class="amount-row__label">运费</text>
      <text class="amount-row__value">¥{{ shippingFee }}</text>
    </view>
    <view v-if="couponSelected" class="amount-row">
      <text class="amount-row__label">优惠券</text>
      <text class="amount-row__value amount-row__value--discount">-¥{{ couponSelected.discount }}</text>
    </view>
    <view v-if="usePoints && pointsToUse > 0" class="amount-row">
      <text class="amount-row__label">积分抵扣</text>
      <text class="amount-row__value amount-row__value--discount">-¥{{ pointsDeduction }}</text>
    </view>
    <view class="amount-row amount-row--total">
      <text class="amount-row__label">实付金额</text>
      <text class="amount-row__value amount-row__value--total">¥{{ finalAmount }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  goodsTotal: number
  shippingFee: number
  couponSelected: { discount: number; id: string } | null
  usePoints: boolean
  pointsToUse: number
}>()

const pointsDeduction = computed(() => {
  return Math.floor(props.pointsToUse / 100)
})

const finalAmount = computed(() => {
  let amount = props.goodsTotal + props.shippingFee
  if (props.couponSelected) {
    amount -= props.couponSelected.discount
  }
  amount -= pointsDeduction.value
  return Math.max(0, amount).toFixed(2)
})
</script>

<style lang="scss" scoped>
.amount-card {
  margin: 0 $spacing-base $spacing-base;
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
</style>
