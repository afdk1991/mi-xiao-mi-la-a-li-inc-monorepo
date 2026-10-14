<template>
  <view class="page">
    <view class="tabs">
      <text v-for="(t, i) in tabs" :key="t.key" class="tab" :class="{ on: i === cur }" @tap="cur = i">{{ t.label }}</text>
    </view>

    <view v-if="filtered.length === 0" class="empty">
      <text class="empty-icon">📋</text>
      <text class="empty-text">暂无相关订单</text>
    </view>

    <view v-else>
      <view v-for="o in filtered" :key="o.id" class="card" @tap="goDetail(o.id)">
        <view class="head">
          <text class="oid">订单号 {{ o.id }}</text>
          <text class="status" :class="o.status">{{ statusText(o.status) }}</text>
        </view>
        <view v-for="it in o.items" :key="it.productId + it.spec" class="row">
          <view class="thumb" :style="{ background: it.color }">
            <text class="thumb-emoji">{{ it.emoji || '🛍️' }}</text>
          </view>
          <view class="info">
            <text class="title">{{ it.title }}</text>
            <text class="spec">{{ it.spec }} × {{ it.count }}</text>
          </view>
          <text class="price">¥{{ (it.price * it.count).toFixed(2) }}</text>
        </view>
        <view class="foot">
          <text class="count">共 {{ o.items.reduce((s, i) => s + i.count, 0) }} 件</text>
          <text class="total">实付 ¥{{ o.totalPrice.toFixed(2) }}</text>
        </view>
        <view class="actions" @tap.stop>
          <view v-if="o.status === 'pending_pay'" class="btn" @tap="pay(o.id)">去支付</view>
          <view v-if="o.status === 'shipped'" class="btn" @tap="confirm(o.id)">确认收货</view>
          <view v-if="o.status === 'paid'" class="btn ghost" @tap="remind(o.id)">提醒发货</view>
          <view v-if="o.status === 'paid' || o.status === 'shipped'" class="btn ghost" @tap="refund(o.id)">申请退款</view>
          <view class="btn ghost" @tap="del(o.id)">删除订单</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { userStore, type OrderStatus } from '../../store/user';

const tabs: { key: OrderStatus | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending_pay', label: '待付款' },
  { key: 'paid', label: '待发货' },
  { key: 'shipped', label: '待收货' },
  { key: 'done', label: '已完成' },
  { key: 'refund', label: '退款' },
];
const cur = ref(0);
const orders = computed(() => userStore.state.orders);
const filtered = computed(() => {
  const k = tabs[cur.value].key;
  if (k === 'all') return orders.value;
  return orders.value.filter((o) => o.status === k);
});

/** 支持 ?status=xxx 直达指定分组（「我的」页各状态入口依赖此能力） */
onLoad((query) => {
  const s = query?.status as OrderStatus | 'all' | undefined;
  if (!s) return;
  const idx = tabs.findIndex((t) => t.key === s);
  if (idx >= 0) cur.value = idx;
});

function statusText(s: OrderStatus) {
  return { pending_pay: '待付款', paid: '待发货', shipped: '待收货', done: '已完成', refund: '退款中' }[s];
}
function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/order/detail?id=${id}` });
}
function pay(id: string) {
  userStore.updateOrderStatus(id, 'paid');
  uni.showToast({ title: '支付成功（演示）', icon: 'success' });
}
function confirm(id: string) {
  uni.showModal({
    title: '确认收货',
    content: '已收到商品？',
    success: (r) => {
      if (r.confirm) {
        userStore.updateOrderStatus(id, 'done');
        uni.showToast({ title: '已完成', icon: 'success' });
      }
    },
  });
}
function remind(id: string) {
  uni.showToast({ title: '已提醒商家发货', icon: 'none' });
}
function refund(id: string) {
  uni.showModal({
    title: '申请退款',
    content: '确定申请退款？款项将在 1-3 个工作日原路退回。',
    success: (r) => {
      if (r.confirm) {
        userStore.updateOrderStatus(id, 'refund');
        uni.showToast({ title: '退款申请已提交', icon: 'success' });
      }
    },
  });
}
function del(id: string) {
  uni.showModal({
    title: '删除订单',
    content: '确定删除该订单？',
    success: (r) => {
      if (r.confirm) {
        // 走 store 方法，保证删除结果写入本地存储
        userStore.removeOrder(id);
      }
    },
  });
}
</script>

<style scoped>
.page { padding: 16rpx 24rpx 40rpx; }
.tabs { display: flex; background: #fff; border-radius: 16rpx; padding: 8rpx; margin-bottom: 16rpx; overflow-x: auto; white-space: nowrap; }
.tab { flex: 0 0 auto; min-width: 110rpx; text-align: center; font-size: 24rpx; color: #666; padding: 14rpx 16rpx; border-radius: 12rpx; }
.tab.on { background: #FFEDE3; color: #FF5A1F; font-weight: 600; }
.empty { text-align: center; padding: 160rpx 0; }
.empty-icon { font-size: 80rpx; display: block; }
.empty-text { color: #999; font-size: 26rpx; display: block; margin-top: 16rpx; }
.card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.head { display: flex; justify-content: space-between; margin-bottom: 16rpx; }
.oid { font-size: 22rpx; color: #999; }
.status { font-size: 24rpx; }
.status.pending_pay { color: #FF5A1F; }
.status.paid { color: #1E88E5; }
.status.shipped { color: #43A047; }
.status.done { color: #9E9E9E; }
.status.refund { color: #E53935; }
.row { display: flex; align-items: center; gap: 16rpx; padding: 10rpx 0; }
.thumb { width: 90rpx; height: 90rpx; border-radius: 10rpx; display: flex; align-items: center; justify-content: center; }
.thumb-emoji { font-size: 44rpx; line-height: 1; }
.info { flex: 1; }
.title { font-size: 26rpx; color: #222; display: block; }
.spec { font-size: 22rpx; color: #999; margin-top: 6rpx; display: block; }
.price { font-size: 26rpx; color: #333; }
.foot { display: flex; justify-content: flex-end; gap: 16rpx; align-items: center; margin: 12rpx 0; }
.count { font-size: 22rpx; color: #999; }
.total { font-size: 28rpx; color: #222; font-weight: 600; }
.actions { display: flex; justify-content: flex-end; gap: 16rpx; border-top: 1rpx solid #f5f5f5; padding-top: 16rpx; }
.btn { padding: 10rpx 28rpx; border-radius: 28rpx; font-size: 24rpx; background: #FF5A1F; color: #fff; }
.btn.ghost { background: #fff; color: #666; border: 1rpx solid #ddd; }
</style>
