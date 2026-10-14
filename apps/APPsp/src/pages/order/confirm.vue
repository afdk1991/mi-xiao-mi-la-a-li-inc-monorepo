<template>
  <view class="page">
    <!-- 地址 -->
    <view class="addr" @tap="chooseAddr">
      <template v-if="address">
        <view class="addr-main">
          <text class="addr-user">{{ address.name }} {{ address.phone }}</text>
          <text class="addr-detail">{{ address.region }} {{ address.detail }}</text>
        </view>
      </template>
      <template v-else>
        <text class="addr-empty">点击选择收货地址</text>
      </template>
      <text class="arrow">›</text>
    </view>

    <!-- 商品 -->
    <view class="card">
      <view v-for="it in items" :key="it.id" class="row">
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

    <!-- 优惠券 -->
    <view class="card line" @tap="chooseCoupon">
      <text class="line-name">优惠券</text>
      <text class="line-value">{{ couponText }}</text>
      <text class="arrow">›</text>
    </view>
    <view class="card line">
      <text class="line-name">配送方式</text>
      <text class="line-value">快递 · 包邮</text>
    </view>

    <!-- 金额 -->
    <view class="card">
      <view class="amount-row"><text>商品金额</text><text>¥{{ goodsPrice.toFixed(2) }}</text></view>
      <view class="amount-row"><text>运费</text><text class="free">免运费</text></view>
      <view class="amount-row" v-if="discount > 0"><text>优惠抵扣</text><text class="free">-¥{{ discount.toFixed(2) }}</text></view>
      <view class="amount-row total"><text>实付款</text><text class="pay">¥{{ payPrice.toFixed(2) }}</text></view>
    </view>

    <view class="footer">
      <view class="pay-bar">
        <text class="pay-label">合计：</text>
        <text class="pay-price">¥{{ payPrice.toFixed(2) }}</text>
      </view>
      <view class="submit" @tap="submit">提交订单</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { cartStore } from '../../store/cart';
import { userStore, type Address, type Coupon } from '../../store/user';

const items = computed(() => cartStore.state.items.filter((i) => i.checked));
const address = ref<Address | null>(userStore.defaultAddress.value);
const usedCoupon = ref<Coupon | null>(null);

const goodsPrice = computed(() => items.value.reduce((s, i) => s + i.price * i.count, 0));
const discount = computed(() => {
  if (!usedCoupon.value) return 0;
  if (goodsPrice.value < usedCoupon.value.threshold) return 0;
  if (isExpired(usedCoupon.value)) return 0;
  return usedCoupon.value.amount;
});
const payPrice = computed(() => Math.max(0, goodsPrice.value - discount.value));
/** 过期判定：expire 为 YYYY-MM-DD，当天结束前仍可用 */
function isExpired(c: Coupon): boolean {
  const end = new Date(`${c.expire}T23:59:59`);
  if (Number.isNaN(end.getTime())) return false;
  return end.getTime() < Date.now();
}

const couponText = computed(() => {
  const c = usedCoupon.value;
  if (!c) return '选择优惠券';
  // 未达门槛时不展示抵扣金额，避免「显示减 10 但实际没减」
  if (goodsPrice.value < c.threshold) return `${c.title}（未满${c.threshold}元，暂不可用）`;
  return `-¥${c.amount}（${c.title}）`;
});

onShow(() => {
  // 优先展示本次在地址列表里选中的地址，否则回落到默认地址
  address.value = userStore.pendingAddress.value || userStore.defaultAddress.value;
});

function chooseAddr() {
  uni.navigateTo({ url: '/pages/address/list?select=1' });
}

function chooseCoupon() {
  const usable = userStore.state.coupons.filter(
    (c) => c.received && !isExpired(c) && c.threshold <= goodsPrice.value,
  );
  if (!usable.length) {
    uni.showToast({ title: '暂无可使用优惠券', icon: 'none' });
    return;
  }
  const itemsStr = usable.map((c) => `${c.title} 满${c.threshold}减${c.amount}`);
  uni.showActionSheet({
    itemList: itemsStr,
    success: (r) => {
      usedCoupon.value = usable[r.tapIndex];
    },
  });
}

function submit() {
  if (!address.value) {
    uni.showToast({ title: '请先选择收货地址', icon: 'none' });
    return;
  }
  if (!items.value.length) {
    uni.showToast({ title: '购物车无选中商品', icon: 'none' });
    return;
  }
  // emoji 必须显式带上：订单行独立持久化，拿不到购物车行，缺少则历史订单退回占位图
  const orderItems = items.value.map((i) => ({
    productId: i.productId,
    title: i.title,
    price: i.price,
    color: i.color,
    spec: i.spec,
    count: i.count,
    emoji: i.emoji,
  }));
  const order = userStore.createOrder(orderItems, payPrice.value, address.value);
  cartStore.clearChecked();
  userStore.clearPendingAddress();

  uni.showModal({
    title: '下单成功',
    content: `订单号 ${order.id}\n应付 ¥${payPrice.value.toFixed(2)}（演示支付）`,
    confirmText: '模拟支付',
    success: (r) => {
      if (r.confirm) {
        userStore.updateOrderStatus(order.id, 'paid');
        uni.redirectTo({ url: `/pages/order/detail?id=${order.id}` });
      } else {
        uni.redirectTo({ url: '/pages/order/list' });
      }
    },
  });
}
</script>

<style scoped>
.page { padding: 16rpx 24rpx 160rpx; }
.addr { background: #fff; border-radius: 16rpx; padding: 24rpx; display: flex; align-items: center; margin-bottom: 16rpx; }
.addr-main { flex: 1; display: flex; flex-direction: column; }
.addr-user { font-size: 30rpx; color: #222; font-weight: 600; }
.addr-detail { font-size: 24rpx; color: #666; margin-top: 8rpx; }
.addr-empty { flex: 1; font-size: 28rpx; color: #999; }
.arrow { color: #ccc; font-size: 36rpx; }
.card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.row { display: flex; align-items: center; gap: 16rpx; padding: 12rpx 0; }
.thumb { width: 100rpx; height: 100rpx; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; }
.thumb-emoji { font-size: 48rpx; line-height: 1; }
.info { flex: 1; display: flex; flex-direction: column; }
.title { font-size: 26rpx; color: #222; }
.spec { font-size: 22rpx; color: #999; margin-top: 6rpx; }
.price { font-size: 28rpx; color: #FF5A1F; font-weight: 600; }
.line { display: flex; align-items: center; }
.line-name { font-size: 28rpx; color: #333; }
.line-value { flex: 1; text-align: right; font-size: 26rpx; color: #666; margin-right: 12rpx; }
.amount-row { display: flex; justify-content: space-between; font-size: 26rpx; color: #555; padding: 8rpx 0; }
.amount-row.total { margin-top: 12rpx; padding-top: 16rpx; border-top: 1rpx solid #f0f0f0; font-weight: 600; color: #222; }
.free { color: #FF5A1F; }
.pay { color: #FF5A1F; font-size: 34rpx; font-weight: 700; }
.footer { position: fixed; left: 0; right: 0; bottom: 0; height: 100rpx; background: #fff; display: flex; align-items: center; padding: 0 24rpx; border-top: 1rpx solid #eee; }
.pay-bar { flex: 1; }
.pay-label { font-size: 24rpx; color: #666; }
.pay-price { color: #FF5A1F; font-size: 36rpx; font-weight: 700; }
.submit { background: linear-gradient(135deg, #FF8A65, #FF5A1F); color: #fff; padding: 0 56rpx; height: 80rpx; line-height: 80rpx; border-radius: 40rpx; font-size: 28rpx; font-weight: 600; }
</style>
