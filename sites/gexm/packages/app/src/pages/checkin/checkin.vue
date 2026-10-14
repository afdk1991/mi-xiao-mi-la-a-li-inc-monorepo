<template>
  <view class="checkin-page">
    <gexm-nav-bar title="每日签到" />
    <gexm-loading v-if="loading" />
    <view v-else class="checkin-content">
      <view class="checkin-header">
        <view class="checkin-btn" :class="{ 'is-checked': checkedToday }" @click="handleCheckin">
          <text class="checkin-btn__icon">{{ checkedToday ? '✓' : '📅' }}</text>
          <text class="checkin-btn__text">{{ checkedToday ? '今日已签到' : '立即签到' }}</text>
        </view>
        <view class="checkin-stats">
          <view class="checkin-stat">
            <text class="checkin-stat__num">{{ continuousDays }}</text>
            <text class="checkin-stat__label">连续签到</text>
          </view>
          <view class="checkin-stat">
            <text class="checkin-stat__num">{{ totalDays }}</text>
            <text class="checkin-stat__label">累计签到</text>
          </view>
        </view>
      </view>

      <gexm-card title="签到奖励" class="reward-card">
        <view class="reward-list">
          <view
            v-for="(reward, index) in rewards"
            :key="index"
            class="reward-item"
            :class="{ 'is-active': continuousDays >= reward.days }"
          >
            <text class="reward-item__days">{{ reward.days }}天</text>
            <text class="reward-item__icon">{{ reward.icon }}</text>
            <text class="reward-item__desc">{{ reward.desc }}</text>
          </view>
        </view>
      </gexm-card>

      <gexm-card title="签到日历" class="calendar-card">
        <view class="calendar-header">
          <text class="calendar-header__btn" @click="prevMonth">‹</text>
          <text class="calendar-header__title">{{ currentYear }}年{{ currentMonth }}月</text>
          <text class="calendar-header__btn" @click="nextMonth">›</text>
        </view>
        <view class="calendar-weekdays">
          <text v-for="day in weekdays" :key="day" class="calendar-weekday">{{ day }}</text>
        </view>
        <view class="calendar-days">
          <view
            v-for="(day, index) in calendarDays"
            :key="index"
            class="calendar-day"
            :class="{
              'is-empty': !day.date,
              'is-past': day.isPast && !day.checked,
              'is-checked': day.checked,
              'is-today': day.isToday,
              'is-future': !day.isPast && !day.isToday,
            }"
          >
            <text v-if="day.date" class="calendar-day__num">{{ day.date }}</text>
            <text v-if="day.checked" class="calendar-day__check">✓</text>
          </view>
        </view>
      </gexm-card>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { checkinApi } from '@/api'

const userStore = useUserStore()
const loading = ref(true)
const checkedToday = ref(false)
const continuousDays = ref(0)
const totalDays = ref(0)
const rewards = ref([
  { days: 1, icon: '🎁', desc: '10积分' },
  { days: 3, icon: '🎊', desc: '30积分' },
  { days: 7, icon: '💎', desc: '100积分' },
  { days: 15, icon: '🌟', desc: '200积分' },
  { days: 30, icon: '👑', desc: '500积分' },
])

const weekdays = ['日', '一', '二', '三', '四', '五', '六']
const now = new Date()
const currentYear = ref(now.getFullYear())
const currentMonth = ref(now.getMonth() + 1)

const calendarDays = computed(() => {
  const days = []
  const firstDay = new Date(currentYear.value, currentMonth.value - 1, 1)
  const lastDay = new Date(currentYear.value, currentMonth.value, 0)
  const startWeekDay = firstDay.getDay()
  const totalDaysInMonth = lastDay.getDate()

  for (let i = 0; i < startWeekDay; i++) {
    days.push({ date: null, checked: false, isToday: false, isPast: false })
  }

  for (let i = 1; i <= totalDaysInMonth; i++) {
    const date = new Date(currentYear.value, currentMonth.value - 1, i)
    const today = new Date()
    const isToday = date.toDateString() === today.toDateString()
    const isPast = date < today || isToday
    days.push({ date: i, checked: false, isToday, isPast })
  }

  return days
})

onMounted(() => {
  if (!userStore.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }
})

onShow(() => {
  if (userStore.isLoggedIn) {
    fetchCheckinStatus()
  }
})

async function fetchCheckinStatus() {
  loading.value = true
  try {
    const data = await checkinApi.getCheckinStatus()
    checkedToday.value = data.checkedToday || false
    continuousDays.value = data.continuousDays || 0
    totalDays.value = data.totalDays || 0
  } catch (e) {
    console.error('Fetch checkin status error:', e)
  } finally {
    loading.value = false
  }
}

async function handleCheckin() {
  if (checkedToday.value) return
  try {
    await checkinApi.doCheckin()
    uni.showToast({ title: '签到成功', icon: 'success' })
    checkedToday.value = true
    continuousDays.value++
    totalDays.value++
  } catch (e) {
    console.error('Checkin error:', e)
  }
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
.checkin-page {
  min-height: 100vh;
  background: $bg-color-page;
}

.checkin-content {
  padding: $spacing-base;
}

.checkin-header {
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  border-radius: $border-radius-lg;
  padding: $spacing-lg;
  text-align: center;
  margin-bottom: $spacing-base;
}

.checkin-btn {
  width: 200rpx;
  height: 200rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 0 auto $spacing-md;

  &__icon {
    font-size: 80rpx;
    margin-bottom: $spacing-xs;
  }

  &__text {
    font-size: $font-size-base;
    color: #fff;
    font-weight: 600;
  }

  &.is-checked {
    background: rgba(103, 194, 58, 0.3);

    .checkin-btn__icon {
      font-size: 100rpx;
      color: #fff;
    }
  }
}

.checkin-stats {
  display: flex;
  justify-content: center;
}

.checkin-stat {
  padding: 0 $spacing-xl;

  &__num {
    display: block;
    font-size: 48rpx;
    font-weight: bold;
    color: #fff;
  }

  &__label {
    font-size: $font-size-sm;
    color: rgba(255, 255, 255, 0.8);
    margin-top: 8rpx;
  }
}

.reward-card {
  margin-bottom: $spacing-base;
}

.reward-list {
  display: flex;
  flex-wrap: wrap;
}

.reward-item {
  width: 33.33%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $spacing-md 0;
  border: 2rpx solid $border-color-lighter;
  border-radius: $border-radius-sm;
  margin: $spacing-xs;
  background: $bg-color-gray-light;

  &.is-active {
    border-color: $success-color;
    background: rgba(103, 194, 58, 0.05);
  }

  &__days {
    font-size: $font-size-xs;
    color: $text-color-placeholder;
    margin-bottom: $spacing-xs;
  }

  &__icon {
    font-size: 48rpx;
    margin-bottom: $spacing-xs;
  }

  &__desc {
    font-size: $font-size-xs;
    color: $text-color-secondary;
  }
}

.calendar-card {
  margin-bottom: $spacing-base;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $spacing-md;

  &__btn {
    font-size: $font-size-xl;
    color: $text-color-secondary;
    padding: 0 $spacing-sm;
  }

  &__title {
    font-size: $font-size-md;
    font-weight: 600;
    color: $text-color;
  }
}

.calendar-weekdays {
  display: flex;
  margin-bottom: $spacing-sm;
}

.calendar-weekday {
  flex: 1;
  text-align: center;
  font-size: $font-size-sm;
  color: $text-color-placeholder;
}

.calendar-days {
  display: flex;
  flex-wrap: wrap;
}

.calendar-day {
  width: 14.28%;
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;

  &__num {
    font-size: $font-size-base;
    color: $text-color;
  }

  &__check {
    position: absolute;
    bottom: 4rpx;
    font-size: 20rpx;
    color: $success-color;
  }

  &.is-empty {
    pointer-events: none;
  }

  &.is-past {
    .calendar-day__num {
      color: $text-color-placeholder;
    }
  }

  &.is-checked {
    .calendar-day__num {
      color: $success-color;
      font-weight: 600;
    }

    background: rgba(103, 194, 58, 0.1);
    border-radius: 50%;
  }

  &.is-today {
    .calendar-day__num {
      color: $primary-color;
      font-weight: bold;
    }
  }

  &.is-future {
    .calendar-day__num {
      color: $text-color-secondary;
    }
  }
}
</style>
