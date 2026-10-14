<template>
  <view v-if="visible" class="gexm-loading">
    <view class="gexm-loading__spinner" />
    <text v-if="text" class="gexm-loading__text">{{ text }}</text>
  </view>
</template>

<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: true,
  },
  text: {
    type: String,
    default: '加载中...',
  },
})
</script>

<style lang="scss" scoped>
.gexm-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: $spacing-lg 0;

  &__spinner {
    width: 60rpx;
    height: 60rpx;
    border: 4rpx solid $border-color-lighter;
    border-top-color: $primary-color;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  &__text {
    margin-top: $spacing-sm;
    font-size: $font-size-sm;
    color: $text-color-secondary;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
