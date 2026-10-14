<template>
  <button
    class="gexm-button"
    :class="[
      `gexm-button--${type}`,
      `gexm-button--${size}`,
      {
        'is-plain': plain,
        'is-round': round,
        'is-disabled': disabled,
        'is-loading': loading,
        'is-block': block,
      },
    ]"
    :disabled="disabled || loading"
    :aria-label="ariaLabel"
    @click="handleClick"
  >
    <text v-if="loading" class="gexm-button__loading">加载中</text>
    <slot v-else></slot>
  </button>
</template>

<script setup>
const props = defineProps({
  type: {
    type: String,
    default: 'primary',
    validator: (val) =>
      ['primary', 'success', 'warning', 'danger', 'info', 'default'].includes(val),
  },
  size: {
    type: String,
    default: 'medium',
    validator: (val) => ['large', 'medium', 'small', 'mini'].includes(val),
  },
  plain: Boolean,
  round: Boolean,
  disabled: Boolean,
  loading: Boolean,
  block: Boolean,
  ariaLabel: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['click'])

function handleClick(e) {
  if (!props.disabled && !props.loading) {
    emit('click', e)
  }
}
</script>

<style lang="scss" scoped>
.gexm-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  background: $bg-color-white;
  border: 1rpx solid $border-color;
  color: $text-color;
  text-align: center;
  box-sizing: border-box;
  outline: none;
  transition: all $duration-fast $ease-out;
  font-weight: $font-weight-medium;
  user-select: none;

  // ===================================
  // 尺寸变体
  // ===================================

  &--large {
    height: $button-height-lg;
    padding: 0 $button-padding-x-lg;
    font-size: $font-size-md;
    border-radius: $radius-md;
  }

  &--medium {
    height: $button-height-base;
    padding: 0 $button-padding-x-base;
    font-size: $font-size-base;
    border-radius: $radius-base;
  }

  &--small {
    height: $button-height-sm;
    padding: 0 $button-padding-x-sm;
    font-size: $font-size-sm;
    border-radius: $radius-base;
  }

  &--mini {
    height: 48rpx;
    padding: 0 $spacing-3;
    font-size: $font-size-xs;
    border-radius: $radius-sm;
  }

  // ===================================
  // 类型变体
  // ===================================

  &--primary {
    background: $primary-color;
    border-color: $primary-color;
    color: $text-color-inverse;

    &.is-plain {
      background: $brand-primary-alpha-10;
      border-color: $primary-color;
      color: $primary-color;
    }

    &:hover:not(.is-disabled) {
      background: $primary-color-light;
      border-color: $primary-color-light;
    }
  }

  &--success {
    background: $color-success;
    border-color: $color-success;
    color: $text-color-inverse;

    &.is-plain {
      background: $color-success-alpha-10;
      border-color: $color-success;
      color: $color-success;
    }

    &:hover:not(.is-disabled) {
      background: $color-success-light;
      border-color: $color-success-light;
    }
  }

  &--warning {
    background: $color-warning;
    border-color: $color-warning;
    color: $text-color-inverse;

    &.is-plain {
      background: $color-warning-alpha-10;
      border-color: $color-warning;
      color: $color-warning-dark;
    }

    &:hover:not(.is-disabled) {
      background: $color-warning-light;
      border-color: $color-warning-light;
    }
  }

  &--danger {
    background: $color-danger;
    border-color: $color-danger;
    color: $text-color-inverse;

    &.is-plain {
      background: $color-danger-alpha-10;
      border-color: $color-danger;
      color: $color-danger;
    }

    &:hover:not(.is-disabled) {
      background: $color-danger-light;
      border-color: $color-danger-light;
    }
  }

  &--info {
    background: $color-info;
    border-color: $color-info;
    color: $text-color-inverse;

    &.is-plain {
      background: $color-info-alpha-10;
      border-color: $color-info;
      color: $color-info;
    }

    &:hover:not(.is-disabled) {
      background: $color-info-light;
      border-color: $color-info-light;
    }
  }

  &--default {
    background: $color-white;
    border-color: $border-color;
    color: $text-color-primary;

    &.is-plain {
      background: transparent;
      border-color: $border-color;
      color: $text-color-secondary;
    }

    &:hover:not(.is-disabled) {
      background: $gray-50;
      border-color: $gray-300;
    }
  }

  // ===================================
  // 状态变体
  // ===================================

  &.is-round {
    border-radius: $radius-full;
  }

  &.is-disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.is-block {
    display: flex;
    width: 100%;
  }

  &.is-loading {
    cursor: wait;
  }

  // ===================================
  // 交互状态
  // ===================================

  &:active:not(.is-disabled) {
    opacity: 0.85;
    transform: scale(0.98);
  }
}

// ===================================
// 加载状态
// ===================================

.gexm-button__loading {
  display: inline-flex;
  align-items: center;
  gap: $spacing-2;
}

// ===================================
// 响应式适配
// ===================================

// 小屏幕优化 (< 375px)
@media screen and (max-width: #{$breakpoint-sm - 1px}) {
  .gexm-button {
    &--large {
      height: $button-height-base;
      padding: 0 $button-padding-x-base;
      font-size: $font-size-base;
    }

    &--medium {
      height: $button-height-sm;
      padding: 0 $button-padding-x-sm;
      font-size: $font-size-sm;
    }

    &--small {
      height: 52rpx;
      padding: 0 $spacing-4;
      font-size: $font-size-xs;
    }
  }
}

// 平板及以上 (> 768px)
@media screen and (min-width: $breakpoint-lg) {
  .gexm-button {
    &:hover:not(.is-disabled):not(:active) {
      opacity: 0.9;
    }
  }
}
</style>
