<template>
  <view v-if="error" class="gexm-error-handler" :class="[`gexm-error-handler--${error.type}`]">
    <view class="gexm-error-handler__icon">
      <text v-if="error.type === 'network'">📡</text>
      <text v-else-if="error.type === 'server'">🔧</text>
      <text v-else-if="error.type === 'auth'">🔒</text>
      <text v-else>⚠️</text>
    </view>
    <text class="gexm-error-handler__title">{{ error.title }}</text>
    <text class="gexm-error-handler__message">{{ error.message }}</text>
    <view v-if="error.actions && error.actions.length > 0" class="gexm-error-handler__actions">
      <button
        v-for="(action, index) in error.actions"
        :key="index"
        class="gexm-error-handler__action-btn"
        :class="[`gexm-error-handler__action-btn--${action.type}`]"
        @click="handleAction(action)"
      >
        {{ action.label }}
      </button>
    </view>
  </view>
</template>

<script setup>
import { watch } from 'vue'

const props = defineProps({
  error: {
    type: Object,
    default: null,
    validator: (val) => {
      if (!val) return true
      return val.type && val.message
    },
  },
})

const emit = defineEmits(['action'])

function handleAction(action) {
  if (action.callback) {
    action.callback()
  }
  emit('action', action)
}

watch(
  () => props.error,
  (newError) => {
    if (newError) {
      console.error('Global error:', newError)
    }
  }
)
</script>

<style lang="scss" scoped>
.gexm-error-handler {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9998;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $spacing-lg $spacing-md;
  background: $bg-color-white;
  border-bottom: 2rpx solid $gray-100;
  animation: slideDown 0.3s ease-out;

  &__icon {
    font-size: 80rpx;
    margin-bottom: $spacing-sm;
  }

  &__title {
    font-size: $font-size-lg;
    font-weight: $font-weight-semibold;
    color: $text-color-primary;
    margin-bottom: $spacing-xs;
  }

  &__message {
    font-size: $font-size-sm;
    color: $text-color-secondary;
    text-align: center;
    margin-bottom: $spacing-md;
  }

  &__actions {
    display: flex;
    gap: $spacing-md;
  }

  &__action-btn {
    padding: $spacing-sm $spacing-lg;
    border-radius: $border-radius-lg;
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
    transition: all $duration-fast;
    border: none;

    &--primary {
      background: $primary-color;
      color: $color-white;
    }

    &--secondary {
      background: $gray-100;
      color: $text-color-secondary;
    }

    &--outline {
      background: transparent;
      color: $primary-color;
      border: 2rpx solid $primary-color;
    }

    &:active {
      opacity: 0.8;
      transform: scale(0.98);
    }
  }

  &--network {
    background: linear-gradient(135deg, rgba($primary-color, 0.2) 0%, $bg-color-white 100%);
  }

  &--server {
    background: linear-gradient(135deg, rgba($color-warning, 0.2) 0%, $bg-color-white 100%);
  }

  &--auth {
    background: linear-gradient(135deg, rgba($color-danger, 0.2) 0%, $bg-color-white 100%);
  }
}

@keyframes slideDown {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
