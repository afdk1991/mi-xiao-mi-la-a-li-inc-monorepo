<template>
  <view class="gexm-select" :class="{ 'is-focus': isFocus, 'is-disabled': disabled }">
    <text v-if="label" class="gexm-select__label">{{ label }}</text>
    <view class="gexm-select__wrapper" @click="handleClick">
      <text class="gexm-select__value">{{ selectedLabel || placeholder }}</text>
      <text class="gexm-select__arrow">▼</text>
    </view>
    <text v-if="error" class="gexm-select__error">{{ error }}</text>

    <view v-if="visible" class="gexm-select__dropdown-mask" @click="handleClose">
      <view class="gexm-select__dropdown">
        <view
          v-for="(option, index) in options"
          :key="index"
          class="gexm-select__option"
          :class="{ 'is-selected': modelValue === option.value }"
          @click="handleSelect(option)"
        >
          <text class="gexm-select__option-text">{{ option.label }}</text>
          <text v-if="modelValue === option.value" class="gexm-select__option-check">✓</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: '',
  },
  label: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: '请选择',
  },
  options: {
    type: Array,
    default: () => [],
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue', 'change'])

const isFocus = ref(false)
const visible = ref(false)

const selectedLabel = computed(() => {
  const option = props.options.find((o) => o.value === props.modelValue)
  return option ? option.label : ''
})

function handleClick() {
  if (!props.disabled) {
    visible.value = !visible.value
    isFocus.value = visible.value
  }
}

function handleClose() {
  visible.value = false
  isFocus.value = false
}

function handleSelect(option) {
  emit('update:modelValue', option.value)
  emit('change', option)
  visible.value = false
  isFocus.value = false
}
</script>

<style lang="scss" scoped>
.gexm-select {
  width: 100%;
  position: relative;
}

.gexm-select__label {
  display: block;
  font-size: $font-size-sm;
  color: $text-color-secondary;
  margin-bottom: $spacing-xs;
}

.gexm-select__wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: $bg-color-white;
  border: 1rpx solid $border-color;
  border-radius: $border-radius-base;
  padding: 0 $spacing-sm;
  height: 80rpx;
  transition: border-color $transition-fast;
}

.gexm-select.is-focus .gexm-select__wrapper {
  border-color: $primary-color;
}

.gexm-select.is-disabled .gexm-select__wrapper {
  background: $bg-color;
  opacity: 0.6;
}

.gexm-select__value {
  font-size: $font-size-base;
  color: $text-color;
  flex: 1;
  text-align: left;
}

.gexm-select__arrow {
  font-size: $font-size-xs;
  color: $text-color-placeholder;
  transition: transform $transition-fast;
}

.gexm-select__error {
  display: block;
  font-size: $font-size-xs;
  color: $danger-color;
  margin-top: $spacing-xs;
}

.gexm-select__dropdown-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
}

.gexm-select__dropdown {
  width: 100%;
  background: $bg-color-white;
  border-radius: $border-radius-lg $border-radius-lg 0 0;
  padding-bottom: env(safe-area-inset-bottom);
  animation: slideUp 0.2s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.gexm-select__option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 $spacing-md;
  border-bottom: 1rpx solid $border-color-light;

  &:last-child {
    border-bottom: none;
  }

  &.is-selected {
    .gexm-select__option-text {
      color: $primary-color;
    }
  }
}

.gexm-select__option-text {
  font-size: $font-size-base;
  color: $text-color;
}

.gexm-select__option-check {
  font-size: $font-size-base;
  color: $primary-color;
}
</style>