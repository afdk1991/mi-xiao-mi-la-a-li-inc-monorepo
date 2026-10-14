<template>
  <view class="gexm-input" :class="{ 'is-focus': isFocus, 'is-disabled': disabled }">
    <text v-if="label" class="gexm-input__label">{{ label }}</text>
    <view class="gexm-input__wrapper">
      <text v-if="prefixIcon" class="gexm-input__prefix">{{ prefixIcon }}</text>
      <input
        class="gexm-input__inner"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :maxlength="maxlength"
        :password="type === 'password'"
        :aria-label="label || ariaLabel"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
      />
      <text
        v-if="clearable && modelValue && !disabled"
        class="gexm-input__clear"
        @click="handleClear"
      >
        ×
      </text>
      <text v-if="suffixIcon" class="gexm-input__suffix">{{ suffixIcon }}</text>
    </view>
    <text v-if="error" class="gexm-input__error">{{ error }}</text>
  </view>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  modelValue: {
    type: [String, Number],
    default: '',
  },
  type: {
    type: String,
    default: 'text',
  },
  label: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: '',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  maxlength: {
    type: Number,
    default: 140,
  },
  clearable: {
    type: Boolean,
    default: false,
  },
  prefixIcon: {
    type: String,
    default: '',
  },
  suffixIcon: {
    type: String,
    default: '',
  },
  error: {
    type: String,
    default: '',
  },
  ariaLabel: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue', 'focus', 'blur', 'clear'])

const isFocus = ref(false)

function handleInput(e) {
  emit('update:modelValue', e.detail.value)
}

function handleFocus(e) {
  isFocus.value = true
  emit('focus', e)
}

function handleBlur(e) {
  isFocus.value = false
  emit('blur', e)
}

function handleClear() {
  emit('update:modelValue', '')
  emit('clear')
}
</script>

<style lang="scss" scoped>
.gexm-input {
  width: 100%;

  &__label {
    display: block;
    font-size: $font-size-sm;
    color: $text-color-secondary;
    margin-bottom: $spacing-xs;
  }

  &__wrapper {
    display: flex;
    align-items: center;
    background: $bg-color-white;
    border: 1rpx solid $border-color;
    border-radius: $border-radius-base;
    padding: 0 $spacing-sm;
    transition: border-color $transition-fast;
  }

  &.is-focus &__wrapper {
    border-color: $primary-color;
  }

  &.is-disabled &__wrapper {
    background: $bg-color;
    opacity: 0.6;
  }

  &__prefix,
  &__suffix {
    font-size: $font-size-base;
    color: $text-color-placeholder;
    padding: 0 $spacing-xs;
  }

  &__inner {
    flex: 1;
    height: 80rpx;
    font-size: $font-size-base;
    color: $text-color;
  }

  &__clear {
    font-size: 36rpx;
    color: $text-color-placeholder;
    padding: 0 $spacing-xs;
  }

  &__error {
    display: block;
    font-size: $font-size-xs;
    color: $danger-color;
    margin-top: $spacing-xs;
  }
}
</style>
