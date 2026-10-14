<template>
  <view class="bottom-bar">
    <view class="bottom-bar__info">
      <text class="bottom-bar__label">实付：</text>
      <text class="bottom-bar__price">¥{{ finalAmount }}</text>
    </view>
    <gexm-button type="primary" size="large" @click="submitOrder">提交订单</gexm-button>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  finalAmount: string
}>()

const emit = defineEmits<{
  (e: 'submit'): void
}>()

function submitOrder() {
  emit('submit')
}
</script>

<style lang="scss" scoped>
.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: $bg-color-white;
  padding: $spacing-sm $spacing-base;
  padding-bottom: calc(#{$spacing-sm} + #{$safe-area-bottom});
  border-top: 1rpx solid $border-color-lighter;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 100;

  &__info {
    flex: 1;
    display: flex;
    align-items: baseline;
  }

  &__label {
    font-size: $font-size-sm;
    color: $text-color-secondary;
  }

  &__price {
    font-size: $font-size-xl;
    color: $danger-color;
    font-weight: 600;
  }
}
</style>
