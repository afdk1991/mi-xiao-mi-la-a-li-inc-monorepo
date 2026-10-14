<template>
  <view
    class="gexm-list-item"
    :class="{ 'is-clickable': clickable, 'is-arrow': arrow }"
    @click="handleClick"
  >
    <view v-if="icon" class="gexm-list-item__icon">
      <text>{{ icon }}</text>
    </view>
    <view class="gexm-list-item__content">
      <text class="gexm-list-item__title">{{ title }}</text>
      <text v-if="desc" class="gexm-list-item__desc">{{ desc }}</text>
    </view>
    <view v-if="$slots.right" class="gexm-list-item__right">
      <slot name="right"></slot>
    </view>
    <text v-else-if="value" class="gexm-list-item__value">{{ value }}</text>
    <text v-if="arrow" class="gexm-list-item__arrow">›</text>
  </view>
</template>

<script setup>
const props = defineProps({
  icon: {
    type: String,
    default: '',
  },
  title: {
    type: String,
    default: '',
  },
  desc: {
    type: String,
    default: '',
  },
  value: {
    type: String,
    default: '',
  },
  arrow: {
    type: Boolean,
    default: false,
  },
  clickable: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['click'])

function handleClick() {
  if (props.clickable) {
    emit('click')
  }
}
</script>

<style lang="scss" scoped>
.gexm-list-item {
  display: flex;
  align-items: center;
  padding: $spacing-base;
  background: $bg-color-white;
  border-bottom: 1rpx solid $border-color-lighter;

  &.is-clickable:active {
    background: $bg-color;
  }

  &__icon {
    width: 64rpx;
    height: 64rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: $spacing-sm;
    font-size: $font-size-lg;
  }

  &__content {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  &__title {
    font-size: $font-size-base;
    color: $text-color;
  }

  &__desc {
    font-size: $font-size-xs;
    color: $text-color-placeholder;
    margin-top: 4rpx;
  }

  &__right {
    display: flex;
    align-items: center;
  }

  &__value {
    font-size: $font-size-sm;
    color: $text-color-secondary;
    margin-right: $spacing-xs;
  }

  &__arrow {
    font-size: $font-size-lg;
    color: $text-color-placeholder;
    margin-left: $spacing-xs;
  }
}
</style>
