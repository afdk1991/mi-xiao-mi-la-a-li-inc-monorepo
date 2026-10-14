<template>
  <view class="detail-page">
    <gexm-nav-bar title="订单详情" :showBack="true" />

    <scroll-view v-if="order" class="detail-content" scroll-y>
      <view class="order-header">
        <view class="order-no-row">
          <text class="order-no">订单号: {{ order.order_no }}</text>
          <text :class="['order-status', order.status]">{{ getStatusLabel(order.status) }}</text>
        </view>
        <text class="create-time">下单时间: {{ formatTime(order.created_at) }}</text>
      </view>

      <view class="section">
        <text class="section-title">收货信息</text>
        <view v-if="order.shipping_address" class="address-info">
          <text class="address-name">
            {{ order.shipping_address.name }} {{ order.shipping_address.phone }}
          </text>
          <text class="address-detail">
            {{ order.shipping_address.province }} {{ order.shipping_address.city }}
            {{ order.shipping_address.district }} {{ order.shipping_address.detail }}
          </text>
        </view>
        <text v-else class="empty-text">暂无收货信息</text>
      </view>

      <view class="section">
        <text class="section-title">商品清单</text>
        <view class="product-list">
          <view v-for="item in order.items" :key="item.id" class="product-item">
            <image
              v-if="item.product_image"
              :src="item.product_image"
              class="product-image"
              mode="aspectFill"
            />
            <view class="product-info">
              <text class="product-name">{{ item.product_name }}</text>
              <text class="product-spec">{{ item.sku_name || '' }}</text>
              <view class="product-meta">
                <text class="product-price">¥{{ item.price }}</text>
                <text class="product-quantity">x{{ item.quantity }}</text>
              </view>
            </view>
            <text class="item-total">¥{{ item.total_price }}</text>
          </view>
        </view>
      </view>

      <view class="section">
        <text class="section-title">订单金额</text>
        <view class="amount-list">
          <view class="amount-row">
            <text class="amount-label">商品总价</text>
            <text class="amount-value">¥{{ order.total_amount }}</text>
          </view>
          <view v-if="order.freight" class="amount-row">
            <text class="amount-label">运费</text>
            <text class="amount-value">¥{{ order.freight }}</text>
          </view>
          <view v-if="order.discount_amount" class="amount-row">
            <text class="amount-label">优惠金额</text>
            <text class="amount-value discount">-¥{{ order.discount_amount }}</text>
          </view>
          <view class="amount-row total">
            <text class="amount-label">实付金额</text>
            <text class="amount-value">¥{{ order.pay_amount || order.total_amount }}</text>
          </view>
        </view>
      </view>

      <view v-if="order.pay_method || order.pay_time" class="section">
        <text class="section-title">支付信息</text>
        <view class="pay-info">
          <view v-if="order.pay_method" class="pay-row">
            <text class="pay-label">支付方式</text>
            <text class="pay-value">{{ getPayMethodLabel(order.pay_method) }}</text>
          </view>
          <view v-if="order.pay_time" class="pay-row">
            <text class="pay-label">支付时间</text>
            <text class="pay-value">{{ formatTime(order.pay_time) }}</text>
          </view>
        </view>
      </view>

      <view v-if="order.remark" class="section">
        <text class="section-title">订单备注</text>
        <text class="remark-text">{{ order.remark }}</text>
      </view>

      <view class="action-area">
        <gexm-button v-if="order.status === 'pending'" type="primary" @click="updateStatus('paid')">
          确认支付
        </gexm-button>
        <gexm-button v-if="order.status === 'paid'" type="primary" @click="updateStatus('shipped')">
          发货
        </gexm-button>
        <gexm-button
          v-if="order.status === 'shipped'"
          type="primary"
          @click="updateStatus('completed')"
        >
          确认完成
        </gexm-button>
        <gexm-button
          v-if="['pending', 'paid'].includes(order.status)"
          type="danger"
          @click="updateStatus('cancelled')"
        >
          取消订单
        </gexm-button>
      </view>
    </scroll-view>

    <gexm-loading v-else />
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { adminApi } from '@/api/admin'

const loading = ref(false)
const order = ref(null)

onMounted(() => {
  loadOrder()
})

async function loadOrder() {
  loading.value = true
  try {
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1]
    const options = currentPage.$page?.options || currentPage.options || {}

    if (options.id) {
      const res = await adminApi.getOrderDetail(options.id)
      order.value = res.data
    }
  } catch (e) {
    console.error('加载订单详情失败', e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function getStatusLabel(status) {
  const statusMap = {
    pending: '待付款',
    paid: '已付款',
    shipped: '已发货',
    completed: '已完成',
    cancelled: '已取消',
    refunded: '已退款',
  }
  return statusMap[status] || status
}

function getPayMethodLabel(method) {
  const methodMap = {
    wechat: '微信支付',
    alipay: '支付宝',
    offline: '线下支付',
  }
  return methodMap[method] || method
}

function formatTime(timeStr) {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

async function updateStatus(status) {
  const statusLabel = getStatusLabel(status)
  uni.showModal({
    title: '确认操作',
    content: `确定要将订单状态改为「${statusLabel}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await adminApi.updateOrderStatus(order.value.id, status)
          order.value.status = status
          uni.showToast({ title: '更新成功', icon: 'success' })
        } catch (e) {
          uni.showToast({ title: '更新失败', icon: 'none' })
        }
      }
    },
  })
}
</script>

<style lang="scss" scoped>
.detail-page {
  min-height: 100vh;
  background: #f5f7fa;
}

.detail-content {
  height: calc(100vh - 88rpx);
  padding: 16rpx;
}

.order-header {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.order-no-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.order-no {
  font-size: 28rpx;
  color: #333;
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
}

.create-time {
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

.address-info {
  padding: 16rpx;
  background: #fafafa;
  border-radius: 8rpx;
}

.address-name {
  font-size: 28rpx;
  color: #333;
  display: block;
  margin-bottom: 8rpx;
}

.address-detail {
  font-size: 26rpx;
  color: #666;
  line-height: 1.5;
}

.empty-text {
  font-size: 26rpx;
  color: #999;
}

.product-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.product-item {
  display: flex;
  gap: 16rpx;
}

.product-image {
  width: 160rpx;
  height: 160rpx;
  border-radius: 8rpx;
}

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.product-name {
  font-size: 28rpx;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-spec {
  font-size: 24rpx;
  color: #999;
}

.product-meta {
  display: flex;
  justify-content: space-between;
}

.product-price {
  font-size: 26rpx;
  color: #ff4d4f;
}

.product-quantity {
  font-size: 24rpx;
  color: #999;
}

.item-total {
  font-size: 28rpx;
  font-weight: 600;
  color: #ff4d4f;
}

.amount-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.amount-row {
  display: flex;
  justify-content: space-between;

  &.total {
    padding-top: 16rpx;
    border-top: 1rpx dashed #e0e0e0;

    .amount-label {
      font-weight: 600;
    }

    .amount-value {
      font-size: 32rpx;
      font-weight: 600;
      color: #ff4d4f;
    }
  }
}

.amount-label {
  font-size: 26rpx;
  color: #666;
}

.amount-value {
  font-size: 26rpx;
  color: #333;

  &.discount {
    color: #52c41a;
  }
}

.pay-info {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.pay-row {
  display: flex;
  justify-content: space-between;
}

.pay-label {
  font-size: 26rpx;
  color: #666;
}

.pay-value {
  font-size: 26rpx;
  color: #333;
}

.remark-text {
  font-size: 26rpx;
  color: #333;
  line-height: 1.5;
}

.action-area {
  padding: 24rpx 0 48rpx;
  display: flex;
  gap: 16rpx;
}
</style>
