<template>
  <view class="admin-page">
    <gexm-nav-bar title="订单管理" />

    <view class="admin-content">
      <view class="filter-bar">
        <gexm-input v-model="orderNo" placeholder="搜索订单号" class="search-input" />
        <picker mode="selector" :range="statusOptions" range-key="label" @change="onStatusChange">
          <view class="picker-btn">
            {{ selectedStatus ? selectedStatus.label : '全部状态' }}
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
        <gexm-button type="primary" @click="loadOrders">搜索</gexm-button>
      </view>

      <view class="action-bar">
        <gexm-button type="primary" @click="goStatistics">订单统计</gexm-button>
      </view>

      <gexm-loading v-if="loading" />

      <view v-else-if="orders.length === 0" class="empty-state">
        <gexm-empty text="暂无订单数据" />
      </view>

      <scroll-view v-else class="order-list" scroll-y>
        <view v-for="order in orders" :key="order.id" class="order-item" @click="viewOrder(order)">
          <view class="order-header">
            <text class="order-no">订单号: {{ order.order_no }}</text>
            <text :class="['order-status', order.status]">{{ getStatusLabel(order.status) }}</text>
          </view>
          <view class="order-info">
            <view class="order-items">
              <view
                v-for="item in (order.items || []).slice(0, 2)"
                :key="item.id"
                class="order-item-row"
              >
                <image
                  v-if="item.product_image"
                  :src="item.product_image"
                  class="item-image"
                  mode="aspectFill"
                />
                <view class="item-info">
                  <text class="item-name">{{ item.product_name }}</text>
                  <text class="item-spec">{{ item.sku_name || '' }}</text>
                  <text class="item-price">¥{{ item.price }} x {{ item.quantity }}</text>
                </view>
              </view>
              <text v-if="(order.items || []).length > 2" class="more-items">
                还有 {{ (order.items || []).length - 2 }} 件商品
              </text>
            </view>
            <view class="order-summary">
              <text class="total-label">实付款:</text>
              <text class="total-amount">¥{{ order.pay_amount || order.total_amount }}</text>
            </view>
          </view>
          <view class="order-footer">
            <text class="create-time">{{ formatTime(order.created_at) }}</text>
            <view class="order-actions">
              <gexm-button
                v-if="order.status === 'pending'"
                size="small"
                type="primary"
                @click.stop="updateOrderStatus(order, 'paid')"
              >
                确认支付
              </gexm-button>
              <gexm-button
                v-if="order.status === 'paid'"
                size="small"
                type="primary"
                @click.stop="updateOrderStatus(order, 'shipped')"
              >
                发货
              </gexm-button>
              <gexm-button
                v-if="order.status === 'shipped'"
                size="small"
                @click.stop="updateOrderStatus(order, 'completed')"
              >
                确认完成
              </gexm-button>
              <gexm-button
                v-if="['pending', 'paid'].includes(order.status)"
                size="small"
                type="danger"
                @click.stop="updateOrderStatus(order, 'cancelled')"
              >
                取消订单
              </gexm-button>
            </view>
          </view>
        </view>
      </scroll-view>

      <gexm-pagination
        v-if="total > 0"
        :current="page"
        :total="total"
        :pageSize="pageSize"
        @change="onPageChange"
      />
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { adminApi } from '@/api/admin'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const loading = ref(false)
const orders = ref([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const orderNo = ref('')
const selectedStatusValue = ref('')

const statusOptions = [
  { value: 'pending', label: '待付款' },
  { value: 'paid', label: '已付款' },
  { value: 'shipped', label: '已发货' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
  { value: 'refunded', label: '已退款' },
]

const selectedStatus = computed(() =>
  statusOptions.find((s) => s.value === selectedStatusValue.value)
)

onMounted(() => {
  if (!checkAdminPermission()) return
  loadOrders()
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

async function loadOrders() {
  loading.value = true
  try {
    const params = {
      page: page.value,
      pageSize: pageSize.value,
      orderNo: orderNo.value,
      status: selectedStatusValue.value,
    }
    const res = await adminApi.getOrders(params)
    orders.value = res.data.list || []
    total.value = res.data.total || 0
  } catch (e) {
    console.error('加载订单失败', e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function onPageChange(newPage) {
  page.value = newPage
  loadOrders()
}

function onStatusChange(e) {
  const index = e.detail.value
  selectedStatusValue.value = statusOptions[index].value
  page.value = 1
  loadOrders()
}

function getStatusLabel(status) {
  const option = statusOptions.find((s) => s.value === status)
  return option ? option.label : status
}

function formatTime(timeStr) {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function viewOrder(order) {
  uni.navigateTo({ url: `/pages/admin/order-detail?id=${order.id}` })
}

async function updateOrderStatus(order, status) {
  const statusLabel = getStatusLabel(status)
  uni.showModal({
    title: '确认操作',
    content: `确定要将订单「${order.order_no}」状态改为「${statusLabel}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await adminApi.updateOrderStatus(order.id, status)
          order.status = status
          uni.showToast({ title: '更新成功', icon: 'success' })
        } catch (e) {
          uni.showToast({ title: '更新失败', icon: 'none' })
        }
      }
    },
  })
}

async function goStatistics() {
  uni.navigateTo({ url: '/pages/admin/order-statistics' })
}
</script>

<style lang="scss" scoped>
.admin-page {
  min-height: 100vh;
  background: #f5f7fa;
}

.admin-content {
  padding: 16rpx;
}

.filter-bar {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
  flex-wrap: wrap;
}

.search-input {
  flex: 1;
  min-width: 300rpx;
}

.picker-btn {
  padding: 0 24rpx;
  height: 72rpx;
  line-height: 72rpx;
  background: #fff;
  border-radius: 8rpx;
  font-size: 28rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
  border: 1rpx solid #e0e0e0;
}

.picker-arrow {
  font-size: 20rpx;
  color: #999;
}

.action-bar {
  margin-bottom: 24rpx;
}

.order-list {
  height: calc(100vh - 320rpx);
}

.order-item {
  background: #fff;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
  overflow: hidden;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.order-no {
  font-size: 26rpx;
  color: #666;
}

.order-status {
  font-size: 24rpx;
  padding: 4rpx 12rpx;
  border-radius: 4rpx;

  &.pending {
    background: #fff7e6;
    color: #fa8c16;
  }

  &.paid {
    background: #e6f7ff;
    color: #1890ff;
  }

  &.shipped {
    background: #f6ffed;
    color: #52c41a;
  }

  &.completed {
    background: #f5f5f5;
    color: #999;
  }

  &.cancelled {
    background: #fff2f0;
    color: #ff4d4f;
  }

  &.refunded {
    background: #f9f0ff;
    color: #722ed1;
  }
}

.order-info {
  padding: 20rpx 24rpx;
}

.order-items {
  margin-bottom: 16rpx;
}

.order-item-row {
  display: flex;
  gap: 16rpx;
  margin-bottom: 16rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.item-image {
  width: 120rpx;
  height: 120rpx;
  border-radius: 8rpx;
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.item-name {
  font-size: 28rpx;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-spec {
  font-size: 24rpx;
  color: #999;
}

.item-price {
  font-size: 26rpx;
  color: #ff4d4f;
}

.more-items {
  font-size: 24rpx;
  color: #999;
  display: block;
  margin-top: 8rpx;
}

.order-summary {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8rpx;
}

.total-label {
  font-size: 26rpx;
  color: #666;
}

.total-amount {
  font-size: 32rpx;
  font-weight: 600;
  color: #ff4d4f;
}

.order-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 24rpx;
  background: #fafafa;
}

.create-time {
  font-size: 24rpx;
  color: #999;
}

.order-actions {
  display: flex;
  gap: 12rpx;
}

.empty-state {
  padding: 100rpx 0;
}
</style>
