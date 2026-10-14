<template>
  <view class="gexm-date-picker" :class="{ 'is-focus': isFocus, 'is-disabled': disabled }">
    <text v-if="label" class="gexm-date-picker__label">{{ label }}</text>
    <view class="gexm-date-picker__wrapper" @click="handleClick">
      <text class="gexm-date-picker__value">{{ formattedDate || placeholder }}</text>
      <text class="gexm-date-picker__icon">📅</text>
    </view>
    <text v-if="error" class="gexm-date-picker__error">{{ error }}</text>

    <view v-if="visible" class="gexm-date-picker__mask" @click="handleClose">
      <view class="gexm-date-picker__picker">
        <view class="gexm-date-picker__header">
          <text class="gexm-date-picker__cancel" @click="handleClose">取消</text>
          <text class="gexm-date-picker__confirm" @click="handleConfirm">确定</text>
        </view>
        <view class="gexm-date-picker__body">
          <view class="gexm-date-picker__nav">
            <text class="gexm-date-picker__nav-btn" @click="prevMonth">‹</text>
            <text class="gexm-date-picker__nav-title">{{ currentYear }}年{{ currentMonth }}月</text>
            <text class="gexm-date-picker__nav-btn" @click="nextMonth">›</text>
          </view>
          <view class="gexm-date-picker__weekdays">
            <text v-for="day in weekdays" :key="day" class="gexm-date-picker__weekday">{{ day }}</text>
          </view>
          <view class="gexm-date-picker__days">
            <view
              v-for="(day, index) in calendarDays"
              :key="index"
              class="gexm-date-picker__day"
              :class="{
                'is-empty': !day,
                'is-today': isToday(day),
                'is-selected': isSelected(day),
                'is-disabled': isDisabled(day),
                'is-past': isPast(day),
              }"
              @click="handleDayClick(day)"
            >
              <text>{{ day || '' }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
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
    default: '请选择日期',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  minDate: {
    type: String,
    default: '',
  },
  maxDate: {
    type: String,
    default: '',
  },
  disablePast: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue', 'change'])

const weekdays = ['日', '一', '二', '三', '四', '五', '六']

const isFocus = ref(false)
const visible = ref(false)

const now = new Date()
const currentYear = ref(now.getFullYear())
const currentMonth = ref(now.getMonth() + 1)

if (props.modelValue) {
  const date = new Date(props.modelValue)
  currentYear.value = date.getFullYear()
  currentMonth.value = date.getMonth() + 1
}

const formattedDate = computed(() => {
  if (!props.modelValue) return ''
  const date = new Date(props.modelValue)
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
})

const calendarDays = computed(() => {
  const year = currentYear.value
  const month = currentMonth.value
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const daysInMonth = lastDay.getDate()
  const startDayOfWeek = firstDay.getDay()

  const days = []
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i)
  }
  return days
})

function isToday(day) {
  if (!day) return false
  const date = new Date(currentYear.value, currentMonth.value - 1, day)
  const today = new Date()
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  )
}

function isSelected(day) {
  if (!day || !props.modelValue) return false
  const selectedDate = new Date(props.modelValue)
  return (
    selectedDate.getFullYear() === currentYear.value &&
    selectedDate.getMonth() + 1 === currentMonth.value &&
    selectedDate.getDate() === day
  )
}

function isPast(day) {
  if (!day) return false
  const date = new Date(currentYear.value, currentMonth.value - 1, day)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date < today
}

function isDisabled(day) {
  if (!day) return true
  if (props.disablePast && isPast(day)) return true
  if (props.minDate) {
    const min = new Date(props.minDate)
    const date = new Date(currentYear.value, currentMonth.value - 1, day)
    if (date < min) return true
  }
  if (props.maxDate) {
    const max = new Date(props.maxDate)
    const date = new Date(currentYear.value, currentMonth.value - 1, day)
    if (date > max) return true
  }
  return false
}

function handleClick() {
  if (!props.disabled) {
    visible.value = true
    isFocus.value = true
  }
}

function handleClose() {
  visible.value = false
  isFocus.value = false
}

function handleConfirm() {
  emit('change', props.modelValue)
  handleClose()
}

function handleDayClick(day) {
  if (isDisabled(day)) return
  const date = new Date(currentYear.value, currentMonth.value - 1, day)
  const formatted = date.toISOString().split('T')[0]
  emit('update:modelValue', formatted)
}

function prevMonth() {
  if (currentMonth.value === 1) {
    currentMonth.value = 12
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

function nextMonth() {
  if (currentMonth.value === 12) {
    currentMonth.value = 1
    currentYear.value++
  } else {
    currentMonth.value++
  }
}
</script>

<style lang="scss" scoped>
.gexm-date-picker {
  width: 100%;
  position: relative;
}

.gexm-date-picker__label {
  display: block;
  font-size: $font-size-sm;
  color: $text-color-secondary;
  margin-bottom: $spacing-xs;
}

.gexm-date-picker__wrapper {
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

.gexm-date-picker.is-focus .gexm-date-picker__wrapper {
  border-color: $primary-color;
}

.gexm-date-picker.is-disabled .gexm-date-picker__wrapper {
  background: $bg-color;
  opacity: 0.6;
}

.gexm-date-picker__value {
  font-size: $font-size-base;
  color: $text-color;
  flex: 1;
  text-align: left;
}

.gexm-date-picker__icon {
  font-size: $font-size-base;
}

.gexm-date-picker__error {
  display: block;
  font-size: $font-size-xs;
  color: $danger-color;
  margin-top: $spacing-xs;
}

.gexm-date-picker__mask {
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

.gexm-date-picker__picker {
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

.gexm-date-picker__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-md;
  border-bottom: 1rpx solid $border-color-light;
}

.gexm-date-picker__cancel {
  font-size: $font-size-base;
  color: $text-color-secondary;
}

.gexm-date-picker__confirm {
  font-size: $font-size-base;
  color: $primary-color;
}

.gexm-date-picker__body {
  padding: $spacing-md;
}

.gexm-date-picker__nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-md;
}

.gexm-date-picker__nav-btn {
  font-size: $font-size-lg;
  color: $text-color-secondary;
}

.gexm-date-picker__nav-title {
  font-size: $font-size-base;
  font-weight: $font-weight-medium;
  color: $text-color;
}

.gexm-date-picker__weekdays {
  display: flex;
  margin-bottom: $spacing-sm;
}

.gexm-date-picker__weekday {
  flex: 1;
  text-align: center;
  font-size: $font-size-xs;
  color: $text-color-placeholder;
}

.gexm-date-picker__days {
  display: flex;
  flex-wrap: wrap;
}

.gexm-date-picker__day {
  width: calc(100% / 7);
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: $font-size-sm;
  color: $text-color;
  cursor: pointer;

  &.is-empty {
    pointer-events: none;
  }

  &.is-today {
    color: $primary-color;
    font-weight: $font-weight-medium;
  }

  &.is-selected {
    background: $primary-color;
    color: $text-color-inverse;
    border-radius: 50%;
  }

  &.is-disabled {
    color: $text-color-placeholder;
    opacity: 0.5;
    pointer-events: none;
  }

  &.is-past {
    color: $text-color-placeholder;
  }
}
</style>