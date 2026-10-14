<template>
  <view class="gexm-card" :class="{ 'is-shadow': shadow }">
    <view v-if="title || $slots.header" class="gexm-card__header">
      <slot name="header">
        <text class="gexm-card__title">{{ title }}</text>
        <text v-if="extra" class="gexm-card__extra">{{ extra }}</text>
      </slot>
    </view>
    <view class="gexm-card__body">
      <slot></slot>
    </view>
    <view v-if="$slots.footer" class="gexm-card__footer">
      <slot name="footer"></slot>
    </view>
  </view>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: '',
  },
  extra: {
    type: String,
    default: '',
  },
  shadow: {
    type: Boolean,
    default: true,
  },
})
</script>

<style lang="scss" scoped>
.gexm-card {
  background: $bg-color-white;
  border-radius: $border-radius-lg;
  overflow: hidden;

  &.is-shadow {
    box-shadow: $shadow-sm;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $spacing-base;
    border-bottom: 1rpx solid $border-color-lighter;
  }

  &__title {
    font-size: $font-size-md;
    font-weight: 600;
    color: $text-color;
  }

  &__extra {
    font-size: $font-size-sm;
    color: $text-color-secondary;
  }

  &__body {
    padding: $spacing-base;
  }

  &__footer {
    padding: $spacing-sm $spacing-base;
    border-top: 1rpx solid $border-color-lighter;
  }
}
</style>
