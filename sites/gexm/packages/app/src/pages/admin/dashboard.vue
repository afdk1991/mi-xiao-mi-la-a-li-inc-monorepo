<template>
  <view class="dashboard-page">
    <gexm-nav-bar title="数据仪表盘" />
    <gexm-loading v-if="loading" />
    <view v-else class="dashboard-content">
      <view class="stats-grid">
        <view class="stat-card stat-card--sales">
          <view class="stat-card__icon">💰</view>
          <view class="stat-card__info">
            <text class="stat-card__value">¥{{ dashboardData.salesAmount }}</text>
            <text class="stat-card__label">销售总额</text>
          </view>
          <view
            class="stat-card__trend"
            :class="dashboardData.salesTrend >= 0 ? 'is-up' : 'is-down'"
          >
            <text>
              {{ dashboardData.salesTrend >= 0 ? '+' : '' }}{{ dashboardData.salesTrend }}%
            </text>
          </view>
        </view>
        <view class="stat-card stat-card--orders">
          <view class="stat-card__icon">📦</view>
          <view class="stat-card__info">
            <text class="stat-card__value">{{ dashboardData.orderCount }}</text>
            <text class="stat-card__label">订单数量</text>
          </view>
          <view
            class="stat-card__trend"
            :class="dashboardData.orderTrend >= 0 ? 'is-up' : 'is-down'"
          >
            <text>
              {{ dashboardData.orderTrend >= 0 ? '+' : '' }}{{ dashboardData.orderTrend }}%
            </text>
          </view>
        </view>
        <view class="stat-card stat-card--users">
          <view class="stat-card__icon">👥</view>
          <view class="stat-card__info">
            <text class="stat-card__value">{{ dashboardData.userCount }}</text>
            <text class="stat-card__label">用户数量</text>
          </view>
          <view
            class="stat-card__trend"
            :class="dashboardData.userTrend >= 0 ? 'is-up' : 'is-down'"
          >
            <text>{{ dashboardData.userTrend >= 0 ? '+' : '' }}{{ dashboardData.userTrend }}%</text>
          </view>
        </view>
        <view class="stat-card stat-card--conversion">
          <view class="stat-card__icon">📈</view>
          <view class="stat-card__info">
            <text class="stat-card__value">{{ dashboardData.conversionRate }}%</text>
            <text class="stat-card__label">转化率</text>
          </view>
          <view
            class="stat-card__trend"
            :class="dashboardData.conversionTrend >= 0 ? 'is-up' : 'is-down'"
          >
            <text>
              {{ dashboardData.conversionTrend >= 0 ? '+' : ''
              }}{{ dashboardData.conversionTrend }}%
            </text>
          </view>
        </view>
      </view>

      <gexm-card title="订单趋势" class="chart-card">
        <view class="trend-chart">
          <view class="trend-chart__bars">
            <view
              v-for="(item, index) in dashboardData.orderTrendData"
              :key="index"
              class="trend-bar"
            >
              <view class="trend-bar__value">{{ item.count }}</view>
              <view class="trend-bar__bar" :style="{ height: getBarHeight(item.count) + '%' }" />
              <view class="trend-bar__label">{{ item.day }}</view>
            </view>
          </view>
        </view>
      </gexm-card>

      <gexm-card title="商品排行" class="product-rank-card">
        <view class="product-rank">
          <view
            v-for="(product, index) in dashboardData.topProducts"
            :key="product.id"
            class="product-rank-item"
          >
            <view class="product-rank-item__rank" :class="getRankClass(index)">
              {{ index + 1 }}
            </view>
            <image class="product-rank-item__image" :src="product.image" mode="aspectFill" />
            <view class="product-rank-item__info">
              <text class="product-rank-item__name">{{ product.name }}</text>
              <text class="product-rank-item__sales">销量: {{ product.sales }}</text>
            </view>
            <text class="product-rank-item__amount">¥{{ product.amount }}</text>
          </view>
        </view>
      </gexm-card>

      <gexm-card title="用户增长" class="user-growth-card">
        <view class="growth-list">
          <view v-for="(item, index) in dashboardData.userGrowth" :key="index" class="growth-item">
            <text class="growth-item__label">{{ item.label }}</text>
            <view class="growth-item__progress">
              <view class="growth-item__fill" :style="{ width: item.percent + '%' }" />
            </view>
            <text class="growth-item__value">{{ item.value }}</text>
          </view>
        </view>
      </gexm-card>

      <view class="quick-actions">
        <gexm-button type="primary" block @click="goProductList">商品管理</gexm-button>
        <gexm-button type="default" block @click="goOrderList">订单管理</gexm-button>
        <gexm-button type="default" block @click="goOrderStatistics">订单统计</gexm-button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { adminApi } from '@/api'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const loading = ref(true)
const dashboardData = ref({
  salesAmount: 0,
  salesTrend: 0,
  orderCount: 0,
  orderTrend: 0,
  userCount: 0,
  userTrend: 0,
  conversionRate: 0,
  conversionTrend: 0,
  orderTrendData: [],
  topProducts: [],
  userGrowth: [],
})

onMounted(() => {
  if (!checkAdminPermission()) return
  fetchDashboardData()
})

onShow(() => {
  if (!checkAdminPermission()) return
  fetchDashboardData()
})

function checkAdminPermission() {
  if (!userStore.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' })
    return false
  }
  if (userStore.role !== 'admin') {
    uni.showToast({ title: '需要管理员权限', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
    return false
  }
  return true
}

async function fetchDashboardData() {
  loading.value = true
  try {
    const data = await adminApi.getOrderStatistics({ type: 'dashboard' })
    dashboardData.value = { ...dashboardData.value, ...data }
  } catch (e) {
    console.error('Fetch dashboard data error:', e)
  } finally {
    loading.value = false
  }
}

function getBarHeight(count) {
  const maxCount = Math.max(...dashboardData.value.orderTrendData.map((item) => item.count))
  if (maxCount === 0) return 0
  return (count / maxCount) * 100
}

function getRankClass(index) {
  if (index === 0) return 'is-gold'
  if (index === 1) return 'is-silver'
  if (index === 2) return 'is-bronze'
  return ''
}

function goProductList() {
  uni.navigateTo({ url: '/pages/admin/product-list' })
}

function goOrderList() {
  uni.navigateTo({ url: '/pages/admin/order-list' })
}

function goOrderStatistics() {
  uni.navigateTo({ url: '/pages/admin/order-statistics' })
}
</script>

<style lang="scss" scoped>
.dashboard-page {
  min-height: 100vh;
  background: $bg-color-page;
}

.dashboard-content {
  padding: $spacing-base;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: $spacing-sm;
  margin-bottom: $spacing-base;
}

.stat-card {
  background: #fff;
  border-radius: $border-radius-md;
  padding: $spacing-base;
  box-shadow: $shadow-sm;
  display: flex;
  flex-direction: column;

  &--sales {
    border-left: 6rpx solid $danger-color;
  }

  &--orders {
    border-left: 6rpx solid $primary-color;
  }

  &--users {
    border-left: 6rpx solid $success-color;
  }

  &--conversion {
    border-left: 6rpx solid $warning-color;
  }

  &__icon {
    font-size: 48rpx;
    margin-bottom: $spacing-xs;
  }

  &__info {
    flex: 1;
  }

  &__value {
    display: block;
    font-size: $font-size-lg;
    font-weight: bold;
    color: $text-color;
  }

  &__label {
    font-size: $font-size-xs;
    color: $text-color-placeholder;
    margin-top: 4rpx;
    display: block;
  }

  &__trend {
    font-size: $font-size-xs;
    margin-top: $spacing-xs;

    &.is-up {
      color: $success-color;
    }

    &.is-down {
      color: $danger-color;
    }
  }
}

.chart-card {
  margin-bottom: $spacing-base;
}

.trend-chart {
  padding: $spacing-sm 0;
}

.trend-chart__bars {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  height: 200rpx;
}

.trend-bar {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;

  &__value {
    font-size: $font-size-xs;
    color: $text-color-secondary;
    margin-bottom: $spacing-xs;
  }

  &__bar {
    width: 32rpx;
    background: linear-gradient(180deg, $primary-color 0%, #8ec5fc 100%);
    border-radius: 16rpx 16rpx 0 0;
    transition: height 0.3s ease;
  }

  &__label {
    font-size: 18rpx;
    color: $text-color-placeholder;
    margin-top: $spacing-xs;
  }
}

.product-rank-card {
  margin-bottom: $spacing-base;
}

.product-rank {
  padding: $spacing-sm 0;
}

.product-rank-item {
  display: flex;
  align-items: center;
  padding: $spacing-sm 0;
  border-bottom: 1rpx solid $border-color-lighter;

  &:last-child {
    border-bottom: none;
  }

  &__rank {
    width: 48rpx;
    height: 48rpx;
    border-radius: 50%;
    background: $bg-color-gray;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: $font-size-sm;
    font-weight: bold;
    color: $text-color-secondary;
    margin-right: $spacing-sm;

    &.is-gold {
      background: #ffd700;
      color: #fff;
    }

    &.is-silver {
      background: #c0c0c0;
      color: #fff;
    }

    &.is-bronze {
      background: #cd7f32;
      color: #fff;
    }
  }

  &__image {
    width: 80rpx;
    height: 80rpx;
    border-radius: $border-radius-sm;
    margin-right: $spacing-sm;
  }

  &__info {
    flex: 1;
    min-width: 0;
  }

  &__name {
    font-size: $font-size-sm;
    color: $text-color;
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__sales {
    font-size: $font-size-xs;
    color: $text-color-placeholder;
    margin-top: 4rpx;
    display: block;
  }

  &__amount {
    font-size: $font-size-base;
    font-weight: bold;
    color: $danger-color;
  }
}

.user-growth-card {
  margin-bottom: $spacing-base;
}

.growth-list {
  padding: $spacing-sm 0;
}

.growth-item {
  display: flex;
  align-items: center;
  margin-bottom: $spacing-sm;

  &:last-child {
    margin-bottom: 0;
  }

  &__label {
    width: 120rpx;
    font-size: $font-size-sm;
    color: $text-color-secondary;
    flex-shrink: 0;
  }

  &__progress {
    flex: 1;
    height: 16rpx;
    background: $bg-color-gray;
    border-radius: 8rpx;
    overflow: hidden;
    margin: 0 $spacing-sm;
  }

  &__fill {
    height: 100%;
    background: $primary-color;
    border-radius: 8rpx;
    transition: width 0.3s ease;
  }

  &__value {
    font-size: $font-size-sm;
    color: $text-color;
    font-weight: 600;
    flex-shrink: 0;
    width: 80rpx;
    text-align: right;
  }
}

.quick-actions {
  display: flex;
  gap: $spacing-sm;

  .gexm-button {
    flex: 1;
  }
}
</style>
