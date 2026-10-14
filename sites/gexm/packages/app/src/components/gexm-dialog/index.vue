<template>
  <view v-if="visible" class="gexm-dialog__mask" @click="handleMaskClick">
    <view class="gexm-dialog" :class="[`gexm-dialog--${type}`]" @click.stop>
      <view v-if="title" class="gexm-dialog__header">
        <text class="gexm-dialog__title">{{ title }}</text>
        <text v-if="closable" class="gexm-dialog__close" @click="handleClose">×</text>
      </view>
      <view class="gexm-dialog__body">
        <slot>
          <text class="gexm-dialog__content">{{ message }}</text>
        </slot>
      </view>
      <view v-if="showFooter" class="gexm-dialog__footer">
        <button
          v-if="showCancel"
          class="gexm-dialog__btn gexm-dialog__btn--cancel"
          @click="handleCancel"
        >
          {{ cancelText }}
        </button>
        <button
          class="gexm-dialog__btn gexm-dialog__btn--confirm"
          :class="{ 'is-loading': loading }"
          :disabled="loading"
          @click="handleConfirm"
        >
          {{ confirmText }}
        </button>
      </view>
    </view>
  </view>
</template>

<script setup>
const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: '',
  },
  message: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    default: 'default',
    validator: (val) => ['default', 'success', 'warning', 'danger'].includes(val),
  },
  confirmText: {
    type: String,
    default: '确定',
  },
  cancelText: {
    type: String,
    default: '取消',
  },
  showCancel: {
    type: Boolean,
    default: true,
  },
  showFooter: {
    type: Boolean,
    default: true,
  },
  closable: {
    type: Boolean,
    default: false,
  },
  maskClosable: {
    type: Boolean,
    default: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:visible', 'confirm', 'cancel', 'close'])

function handleClose() {
  emit('update:visible', false)
  emit('close')
}

function handleMaskClick() {
  if (props.maskClosable) {
    handleClose()
  }
}

function handleConfirm() {
  emit('confirm')
}

function handleCancel() {
  emit('cancel')
  emit('update:visible', false)
}
</script>

<style lang="scss" scoped>
.gexm-dialog__mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gexm-dialog {
  width: 600rpx;
  background: $bg-color-white;
  border-radius: $border-radius-lg;
  overflow: hidden;
  animation: dialogFadeIn 0.2s ease-out;
}

@keyframes dialogFadeIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.gexm-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-md;
  border-bottom: 1rpx solid $border-color-light;
}

.gexm-dialog__title {
  font-size: $font-size-md;
  font-weight: $font-weight-medium;
  color: $text-color;
}

.gexm-dialog__close {
  font-size: 40rpx;
  color: $text-color-placeholder;
}

.gexm-dialog__body {
  padding: $spacing-lg;
  min-height: 120rpx;
}

.gexm-dialog__content {
  font-size: $font-size-base;
  color: $text-color-secondary;
  line-height: 1.6;
  text-align: center;
}

.gexm-dialog__footer {
  display: flex;
  border-top: 1rpx solid $border-color-light;
}

.gexm-dialog__btn {
  flex: 1;
  height: 88rpx;
  font-size: $font-size-base;
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;

  &--cancel {
    color: $text-color-secondary;
    border-right: 1rpx solid $border-color-light;
  }

  &--confirm {
    color: $primary-color;
  }

  &.is-loading {
    opacity: 0.6;
  }
}

.gexm-dialog--success .gexm-dialog__btn--confirm {
  color: $color-success;
}

.gexm-dialog--warning .gexm-dialog__btn--confirm {
  color: $color-warning;
}

.gexm-dialog--danger .gexm-dialog__btn--confirm {
  color: $danger-color;
}
</style>