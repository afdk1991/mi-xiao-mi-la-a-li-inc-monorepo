<template>
  <view class="stats-page">
    <gexm-nav-bar title="订单统计" :showBack="true" />

    <scroll-view class="stats-content" scroll-y>
      <view class="stats-cards">
        <view class="stat-card">
          <text class="stat-value">{{ statistics.totalOrders }}</text>
          <text class="stat-label">订单总数</text>
        </view>
        <view class="stat-card highlight">
          <text class="stat-value">¥{{ formatAmount(statistics.totalAmount) }}</text>
          <text class="stat-label">销售总额</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ statistics.pendingCount }}</text>
          <text class="stat-label">待付款</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ statistics.paidCount }}</text>
          <text class="stat-label">已付款</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ statistics.shippedCount }}</text>
          <text class="stat-label">已发货</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ statistics.completedCount }}</text>
          <text class="stat-label">已完成</text>
        </view>
      </view>

      <view class="section">
        <text class="section-title">订单状态分布</text>
        <view class="status-dist">
          <view class="dist-item">
            <view class="dist-bar pending" :style="{ width: pendingPercent + '%' }" />
            <view class="dist-info">
              <text class="dist-label">待付款</text>
              <text class="dist-value">{{ statistics.pendingCount }}</text>
            </view>
          </view>
          <view class="dist-item">
            <view class="dist-bar paid" :style="{ width: paidPercent + '%' }" />
            <view class="dist-info">
              <text class="dist-label">已付款</text>
              <text class="dist-value">{{ statistics.paidCount }}</text>
            </view>
          </view>
          <view class="dist-item">
            <view class="dist-bar shipped" :style="{ width: shippedPercent + '%' }" />
            <view class="dist-info">
              <text class="dist-label">已发货</text>
              <text class="dist-value">{{ statistics.shippedCount }}</text>
            </view>
          </view>
          <view class="dist-item">
            <view class="dist-bar completed" :style="{ width: completedPercent + '%' }" />
            <view class="dist-info">
              <text class="dist-label">已完成</text>
              <text class="dist-value">{{ statistics.completedCount }}</text>
            </view>
          </view>
          <view class="dist-item">
            <view class="dist-bar cancelled" :style="{ width: cancelledPercent + '%' }" />
            <view class="dist-info">
              <text class="dist-label">已取消</text>
              <text class="dist-value">{{ statistics.cancelledCount }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="section">
        <text class="section-title">统计说明</text>
        <view class="info-list">
          <text class="info-item">• 销售总额仅统计已付款、已发货和已完成状态的订单</text>
          <text class="info-item">• 统计数据为实时数据，刷新页面可获取最新结果</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { adminApi } from '@/api/admin'

const loading = ref(false)
const statistics = ref({
  totalOrders: 0,
  totalAmount: 0,
  pendingCount: 0,
  paidCount: 0,
  shippedCount: 0,
  completedCount: 0,
  cancelledCount: 0,
})

const totalStatusCount = computed(
  () =>
    statistics.value.pendingCount +
    statistics.value.paidCount +
    statistics.value.shippedCount +
    statistics.value.completedCount +
    statistics.value.cancelledCount
)

const pendingPercent = computed(() =>
  totalStatusCount.value > 0
    ? Math.round((statistics.value.pendingCount / totalStatusCount.value) * 100)
    : 0
)

const paidPercent = computed(() =>
  totalStatusCount.value > 0
    ? Math.round((statistics.value.paidCount / totalStatusCount.value) * 100)
    : 0
)

const shippedPercent = computed(() =>
  totalStatusCount.value > 0
    ? Math.round((statistics.value.shippedCount / totalStatusCount.value) * 100)
    : 0
)

const completedPercent = computed(() =>
  totalStatusCount.value > 0
    ? Math.round((statistics.value.completedCount / totalStatusCount.value) * 100)
    : 0
)

const cancelledPercent = computed(() =>
  totalStatusCount.value > 0
    ? Math.round((statistics.value.cancelledCount / totalStatusCount.value) * 100)
    : 0
)

onMounted(() => {
  loadStatistics()
})

async function loadStatistics() {
  loading.value = true
  try {
    const res = await adminApi.getOrderStatistics()
    statistics.value = res.data
  } catch (e) {
    console.error('加载统计数据失败', e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function formatAmount(amount) {
  if (!amount) return '0.00'
  return parseFloat(amount).toFixed(2)
}
</script>

<style lang="scss" scoped>
.stats-page {
  min-height: 100vh;
  background: #f5f7fa;
}

.stats-content {
  height: calc(100vh - 88rpx);
  padding: 16rpx;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.stat-card {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
  text-align: center;

  &.highlight {
    background: linear-gradient(135deg, #409eff 0%, #667eea 100%);

    .stat-value,
    .stat-label {
      color: #fff;
    }
  }
}

.stat-value {
  font-size: 40rpx;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 8rpx;
}

.stat-label {
  font-size: 24rpx;
  color: #999;
}

.section {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 20rpx;
  display: block;
}

.status-dist {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.dist-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.dist-bar {
  flex: 1;
  height: 24rpx;
  border-radius: 12rpx;
  min-width: 0;

  &.pending {
    background: #fa8c16;
  }

  &.paid {
    background: #1890ff;
  }

  &.shipped {
    background: #52c41a;
  }

  &.completed {
    background: #999;
  }

  &.cancelled {
    background: #ff4d4f;
  }
}

.dist-info {
  width: 120rpx;
  display: flex;
  justify-content: space-between;
}

.dist-label {
  font-size: 24rpx;
  color: #666;
}

.dist-value {
  font-size: 24rpx;
  color: #333;
  font-weight: 500;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.info-item {
  font-size: 24rpx;
  color: #999;
  line-height: 1.5;
}
</style>
