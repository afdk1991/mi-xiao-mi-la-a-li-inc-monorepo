<template>
  <view class="page" v-if="order">
    <view class="status-banner" :class="order.status">
      <text class="status-text">{{ statusText(order.status) }}</text>
      <text class="status-sub" v-if="order.status === 'pending_pay'">请在 15 分钟内完成支付</text>
      <text class="status-sub" v-else-if="order.status === 'shipped'">商家已发货，请耐心等待</text>
    </view>

    <view class="card">
      <view class="addr-row">
        <text class="label">收货地址</text>
        <view v-if="order.address" class="addr-info">
          <text class="a-user">{{ order.address.name }} {{ order.address.phone }}</text>
          <text class="a-detail">{{ order.address.region }} {{ order.address.detail }}</text>
        </view>
        <text v-else class="a-empty">未填写</text>
      </view>
    </view>

    <view class="card">
      <view v-for="it in order.items" :key="it.productId + it.spec" class="row">
        <view class="thumb" :style="{ background: it.color }">
          <text class="thumb-emoji">{{ it.emoji || '🛍️' }}</text>
        </view>
        <view class="info">
          <text class="title">{{ it.title }}</text>
          <text class="spec">{{ it.spec }} × {{ it.count }}</text>
        </view>
        <text class="price">¥{{ (it.price * it.count).toFixed(2) }}</text>
      </view>
    </view>

    <view class="card">
      <view class="kv"><text>订单编号</text><text>{{ order.id }}</text></view>
      <view class="kv"><text>下单时间</text><text>{{ formatTime(order.createdAt) }}</text></view>
      <view class="kv"><text>支付方式</text><text>在线支付（演示）</text></view>
      <view class="kv total"><text>实付款</text><text class="pay">¥{{ order.totalPrice.toFixed(2) }}</text></view>
    </view>

    <view class="footer" v-if="order.status === 'pending_pay'">
      <view class="btn ghost" @tap="cancel">取消订单</view>
      <view class="btn primary" @tap="pay">立即支付</view>
    </view>
    <view class="footer" v-else-if="order.status === 'shipped'">
      <view class="btn primary" @tap="confirm">确认收货</view>
    </view>
  </view>
  <view v-else class="loading">订单不存在</view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { userStore, type Order, type OrderStatus } from '../../store/user';

const order = ref<Order | null>(null);

onLoad((q) => {
  const id = q?.id;
  order.value = userStore.state.orders.find((o) => o.id === id) || null;
});

function statusText(s: OrderStatus) {
  return { pending_pay: '待付款', paid: '待发货', shipped: '待收货', done: '已完成', refund: '退款中' }[s];
}
function formatTime(ts: number) {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function pay() {
  if (!order.value) return;
  userStore.updateOrderStatus(order.value.id, 'paid');
  uni.showToast({ title: '支付成功', icon: 'success' });
}
function confirm() {
  if (!order.value) return;
  uni.showModal({
    title: '确认收货',
    content: '已收到商品？',
    success: (r) => {
      if (r.confirm) {
        userStore.updateOrderStatus(order.value!.id, 'done');
        uni.showToast({ title: '已完成', icon: 'success' });
      }
    },
  });
}
function cancel() {
  if (!order.value) return;
  uni.showModal({
    title: '取消订单',
    content: '确定取消该订单？',
    success: (r) => {
      if (r.confirm) {
        userStore.removeOrder(order.value!.id);
        // 若当前页是下单后重定向进来的（无上一页），回退会失败，改为跳订单列表
        if (getCurrentPages().length > 1) {
          uni.navigateBack();
        } else {
          uni.redirectTo({ url: '/pages/order/list' });
        }
      }
    },
  });
}
</script>

<style scoped>
.page { padding: 16rpx 24rpx 160rpx; }
.loading { text-align: center; color: #999; padding: 200rpx 0; }
.status-banner { border-radius: 16rpx; padding: 40rpx 24rpx; margin-bottom: 16rpx; }
.status-banner.pending_pay { background: linear-gradient(135deg, #FF8A65, #FF5A1F); }
.status-banner.paid { background: linear-gradient(135deg, #64B5F6, #1E88E5); }
.status-banner.shipped { background: linear-gradient(135deg, #81C784, #43A047); }
.status-banner.done { background: linear-gradient(135deg, #BDBDBD, #757575); }
.status-text { color: #fff; font-size: 36rpx; font-weight: 700; display: block; }
.status-sub { color: rgba(255,255,255,.9); font-size: 24rpx; margin-top: 8rpx; display: block; }
.card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.addr-row { display: flex; }
.label { font-size: 26rpx; color: #999; width: 140rpx; }
.addr-info { flex: 1; display: flex; flex-direction: column; }
.a-user { font-size: 28rpx; color: #222; font-weight: 600; }
.a-detail { font-size: 24rpx; color: #666; margin-top: 8rpx; }
.a-empty { flex: 1; font-size: 26rpx; color: #999; }
.row { display: flex; align-items: center; gap: 16rpx; padding: 10rpx 0; }
.thumb { width: 90rpx; height: 90rpx; border-radius: 10rpx; display: flex; align-items: center; justify-content: center; }
.thumb-emoji { font-size: 44rpx; line-height: 1; }
.info { flex: 1; }
.title { font-size: 26rpx; color: #222; display: block; }
.spec { font-size: 22rpx; color: #999; margin-top: 6rpx; display: block; }
.price { font-size: 26rpx; color: #333; }
.kv { display: flex; justify-content: space-between; font-size: 26rpx; color: #555; padding: 10rpx 0; }
.kv.total { margin-top: 12rpx; padding-top: 16rpx; border-top: 1rpx solid #f0f0f0; font-weight: 600; }
.pay { color: #FF5A1F; font-size: 32rpx; font-weight: 700; }
.footer { position: fixed; left: 0; right: 0; bottom: 0; height: 100rpx; background: #fff; display: flex; justify-content: flex-end; align-items: center; gap: 16rpx; padding: 0 24rpx; border-top: 1rpx solid #eee; }
.btn { padding: 0 40rpx; height: 76rpx; line-height: 76rpx; border-radius: 38rpx; font-size: 26rpx; }
.btn.primary { background: linear-gradient(135deg, #FF8A65, #FF5A1F); color: #fff; }
.btn.ghost { background: #fff; color: #666; border: 1rpx solid #ddd; }
</style>
