<template>
  <view class="gexm-tab-bar">
    <view
      v-for="(item, index) in tabs"
      :key="index"
      class="gexm-tab-bar__item"
      :class="{ 'is-active': activeIndex === index }"
      @click="handleTabClick(index)"
    >
      <text class="gexm-tab-bar__text">{{ item.label }}</text>
      <view v-if="item.badge" class="gexm-tab-bar__badge">{{ item.badge }}</view>
    </view>
    <view class="gexm-tab-bar__indicator" :style="indicatorStyle"></view>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  tabs: {
    type: Array,
    default: () => [],
  },
  activeIndex: {
    type: Number,
    default: 0,
  },
  animated: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['change'])

const indicatorStyle = computed(() => {
  if (!props.animated || props.activeIndex >= props.tabs.length) {
    return { display: 'none' }
  }
  return {
    transform: `translateX(${props.activeIndex * 100}%)`,
  }
})

function handleTabClick(index) {
  if (index !== props.activeIndex) {
    emit('change', index)
  }
}
</script>

<style lang="scss" scoped>
.gexm-tab-bar {
  display: flex;
  align-items: center;
  background: $bg-color-white;
  border-bottom: 1rpx solid $border-color;
  position: relative;
}

.gexm-tab-bar__item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  position: relative;
  cursor: pointer;

  &.is-active {
    .gexm-tab-bar__text {
      color: $primary-color;
      font-weight: $font-weight-medium;
    }
  }
}

.gexm-tab-bar__text {
  font-size: $font-size-base;
  color: $text-color-secondary;
  transition: color $transition-fast;
}

.gexm-tab-bar__badge {
  position: absolute;
  top: 16rpx;
  right: 24rpx;
  min-width: 32rpx;
  height: 32rpx;
  padding: 0 8rpx;
  background: $danger-color;
  color: $text-color-inverse;
  font-size: $font-size-xs;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gexm-tab-bar__indicator {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 25%;
  height: 6rpx;
  background: $primary-color;
  border-radius: 3rpx;
  transition: transform $transition-base;
}
</style>