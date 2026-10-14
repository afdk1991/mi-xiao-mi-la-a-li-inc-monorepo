<template>
  <view
    class="gexm-nav-bar"
    :class="{ 'gexm-nav-bar--fixed': fixed }"
    :style="{ paddingTop: statusBarHeight + 'px' }"
  >
    <view class="gexm-nav-bar__content" :style="{ height: navBarHeight + 'px' }">
      <view class="gexm-nav-bar__left" @click="handleBack">
        <text v-if="showBack" class="gexm-nav-bar__back">‹</text>
        <slot name="left"></slot>
      </view>
      <view class="gexm-nav-bar__title">
        <slot name="title">
          <text class="gexm-nav-bar__title-text">{{ title }}</text>
        </slot>
      </view>
      <view class="gexm-nav-bar__right">
        <slot name="right"></slot>
      </view>
    </view>
  </view>
  <view :style="{ height: statusBarHeight + navBarHeight + 'px' }" />
</template>

<script setup>
import { computed } from 'vue'
import { useAppStore } from '../../store/app'

const props = defineProps({
  title: {
    type: String,
    default: '',
  },
  showBack: {
    type: Boolean,
    default: true,
  },
  fixed: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['back'])

const appStore = useAppStore()

const statusBarHeight = computed(() => appStore.statusBarHeight)
const navBarHeight = computed(() => 44)

function handleBack() {
  if (props.showBack) {
    emit('back')
    uni.navigateBack({ fail: () => {} })
  }
}
</script>

<style lang="scss" scoped>
.gexm-nav-bar {
  background: $bg-color-white;
  border-bottom: 1rpx solid $gray-100;

  &--fixed {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: $z-index-fixed;
  }

  &--transparent {
    background: rgba($color-white, 0.9);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  &__content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 $spacing-4;
    height: $nav-bar-height;
  }

  &__left,
  &__right {
    flex: 0 0 160rpx;
    display: flex;
    align-items: center;
    min-height: $nav-bar-height;
  }

  &__left {
    justify-content: flex-start;
    gap: $spacing-1;
  }

  &__right {
    justify-content: flex-end;
    gap: $spacing-2;
  }

  &__back {
    font-size: 52rpx;
    font-weight: $font-weight-light;
    color: $text-color-primary;
    line-height: 1;
    padding: $spacing-2;
    margin-left: -$spacing-2;
    transition: all $duration-fast $ease-out;

    &:active {
      opacity: 0.6;
      transform: scale(0.95);
    }
  }

  &__title {
    flex: 1;
    text-align: center;
    overflow: hidden;
  }

  &__title-text {
    display: inline-block;
    font-size: $nav-bar-title-size;
    font-weight: $font-weight-semibold;
    color: $text-color-primary;
    line-height: $line-height-tight;
    max-width: 400rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

// ===================================
// 响应式适配
// ===================================

// 小屏幕优化 (< 375px)
@media screen and (max-width: #{$breakpoint-sm - 1px}) {
  .gexm-nav-bar {
    &__content {
      padding: 0 $spacing-3;
    }

    &__left,
    &__right {
      flex: 0 0 120rpx;
    }

    &__back {
      font-size: 48rpx;
    }

    &__title-text {
      font-size: 30rpx;
      max-width: 320rpx;
    }
  }
}

// 平板及以上 (> 768px)
@media screen and (min-width: $breakpoint-lg) {
  .gexm-nav-bar {
    &__content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 $spacing-8;
    }

    &__back {
      &:hover {
        opacity: 0.7;
        transform: scale(1.05);
      }
    }
  }
}
</style>
