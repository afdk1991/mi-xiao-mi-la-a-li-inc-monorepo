<template>
  <view class="gexm-textarea" :class="{ 'is-focus': isFocus, 'is-disabled': disabled }">
    <view class="gexm-textarea__header" v-if="label">
      <text class="gexm-textarea__label">{{ label }}</text>
      <text v-if="showCount" class="gexm-textarea__count">{{ textLength }}/{{ maxlength }}</text>
    </view>
    <view class="gexm-textarea__wrapper">
      <textarea
        class="gexm-textarea__inner"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :maxlength="maxlength"
        :auto-height="autoHeight"
        :fixed="fixed"
        :adjust-position="adjustPosition"
        :aria-label="label || ariaLabel"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
      />
      <text
        v-if="clearable && modelValue && !disabled"
        class="gexm-textarea__clear"
        @click="handleClear"
      >
        ×
      </text>
    </view>
    <text v-if="error" class="gexm-textarea__error">{{ error }}</text>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
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
    default: 500,
  },
  showCount: {
    type: Boolean,
    default: true,
  },
  clearable: {
    type: Boolean,
    default: false,
  },
  autoHeight: {
    type: Boolean,
    default: false,
  },
  fixed: {
    type: Boolean,
    default: true,
  },
  adjustPosition: {
    type: Boolean,
    default: true,
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

const textLength = computed(() => {
  return props.modelValue.length
})

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
.gexm-textarea {
  width: 100%;
}

.gexm-textarea__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-xs;
}

.gexm-textarea__label {
  font-size: $font-size-sm;
  color: $text-color-secondary;
}

.gexm-textarea__count {
  font-size: $font-size-xs;
  color: $text-color-placeholder;
}

.gexm-textarea__wrapper {
  position: relative;
  background: $bg-color-white;
  border: 1rpx solid $border-color;
  border-radius: $border-radius-base;
  padding: $spacing-sm;
  transition: border-color $transition-fast;
}

.gexm-textarea.is-focus .gexm-textarea__wrapper {
  border-color: $primary-color;
}

.gexm-textarea.is-disabled .gexm-textarea__wrapper {
  background: $bg-color;
  opacity: 0.6;
}

.gexm-textarea__inner {
  width: 100%;
  min-height: 160rpx;
  font-size: $font-size-base;
  color: $text-color;
  line-height: 1.6;
}

.gexm-textarea__clear {
  position: absolute;
  right: $spacing-sm;
  top: $spacing-sm;
  font-size: 36rpx;
  color: $text-color-placeholder;
}

.gexm-textarea__error {
  display: block;
  font-size: $font-size-xs;
  color: $danger-color;
  margin-top: $spacing-xs;
}
</style>