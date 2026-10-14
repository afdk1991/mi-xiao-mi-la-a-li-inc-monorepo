<template>
  <view class="points-logs-page">
    <gexm-nav-bar title="积分变动记录" />
    <gexm-loading v-if="loading" />
    <gexm-empty v-else-if="logs.length === 0" description="暂无积分变动记录" />
    <view v-else class="logs-list">
      <view v-for="log in logs" :key="log.id" class="log-item">
        <view class="log-item__icon" :class="log.type === 'earn' ? 'is-earn' : 'is-spend'">
          <text>{{ log.type === 'earn' ? '+' : '-' }}</text>
        </view>
        <view class="log-item__content">
          <text class="log-item__title">{{ log.title }}</text>
          <text class="log-item__time">{{ log.createdAt }}</text>
        </view>
        <text class="log-item__amount" :class="log.type === 'earn' ? 'is-earn' : 'is-spend'">
          {{ log.type === 'earn' ? '+' : '-' }}{{ log.points }}
        </text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { memberApi } from '@/api'

const userStore = useUserStore()
const loading = ref(true)
const logs = ref([])

onMounted(() => {
  if (!userStore.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }
})

onShow(() => {
  if (userStore.isLoggedIn) {
    fetchLogs()
  }
})

async function fetchLogs() {
  loading.value = true
  try {
    const data = await memberApi.getPointsLogs()
    logs.value = data || []
  } catch (e) {
    console.error('Fetch points logs error:', e)
    logs.value = []
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.points-logs-page {
  min-height: 100vh;
  background: $bg-color-page;
}

.logs-list {
  padding: $spacing-base;
}

.log-item {
  display: flex;
  align-items: center;
  background: #fff;
  padding: $spacing-base;
  border-radius: $border-radius-md;
  margin-bottom: $spacing-sm;
  box-shadow: $shadow-sm;

  &__icon {
    width: 64rpx;
    height: 64rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: $font-size-md;
    font-weight: bold;
    margin-right: $spacing-base;

    &.is-earn {
      background: rgba(103, 194, 58, 0.1);
      color: $success-color;
    }

    &.is-spend {
      background: rgba(245, 108, 108, 0.1);
      color: $danger-color;
    }
  }

  &__content {
    flex: 1;
  }

  &__title {
    font-size: $font-size-base;
    color: $text-color;
    display: block;
  }

  &__time {
    font-size: $font-size-xs;
    color: $text-color-placeholder;
    margin-top: 8rpx;
    display: block;
  }

  &__amount {
    font-size: $font-size-md;
    font-weight: bold;

    &.is-earn {
      color: $success-color;
    }

    &.is-spend {
      color: $danger-color;
    }
  }
}
</style>
