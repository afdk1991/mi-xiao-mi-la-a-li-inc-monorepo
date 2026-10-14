<template>
  <view class="page">
    <view v-if="items.length === 0" class="empty">
      <text class="empty-icon">🛒</text>
      <text class="empty-text">购物车还是空的</text>
      <view class="go-shop" @tap="goShop">去逛逛</view>
    </view>

    <template v-else>
      <view v-for="it in items" :key="it.id" class="row">
        <view class="check" :class="{ on: it.checked }" @tap="toggle(it)"></view>
        <view class="thumb" :style="{ background: it.color }">
          <text class="thumb-emoji">{{ it.emoji || '🛍️' }}</text>
        </view>
        <view class="detail">
          <text class="title">{{ it.title }}</text>
          <text class="spec">规格：{{ it.spec }}</text>
          <view class="bottom">
            <text class="price">¥{{ it.price }}</text>
            <view class="stepper">
              <text class="step" @tap="dec(it)">－</text>
              <text class="num">{{ it.count }}</text>
              <text class="step" @tap="inc(it)">＋</text>
            </view>
          </view>
        </view>
        <text class="del" @tap="remove(it)">🗑</text>
      </view>

      <view class="footer">
        <view class="all-check" @tap="toggleAll">
          <view class="check" :class="{ on: allChecked }"></view>
          <text class="all-text">全选</text>
        </view>
        <view class="total">
          <text class="total-label">合计：</text>
          <text class="total-price">¥{{ totalPrice.toFixed(2) }}</text>
        </view>
        <view class="checkout" :class="{ disabled: !checkedCount }" @tap="checkout">结算({{ checkedCount }})</view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { cartStore, type CartItem } from '../../store/cart';
import { userStore } from '../../store/user';

const items = computed(() => cartStore.state.items);
const totalPrice = computed(() => cartStore.checkedPrice.value);
const checkedCount = computed(() => cartStore.checkedCount.value);
const allChecked = computed(() => items.value.length > 0 && items.value.every((i) => i.checked));

onShow(() => { /* 依赖响应式，无需手动刷新 */ });

function toggle(it: CartItem) {
  cartStore.setChecked(it.id, !it.checked);
}
function toggleAll() {
  cartStore.toggleAll(!allChecked.value);
}
function inc(it: CartItem) { cartStore.changeCount(it.id, 1); }
function dec(it: CartItem) { cartStore.changeCount(it.id, -1); }
function remove(it: CartItem) {
  uni.showModal({
    title: '提示',
    content: '确定删除该商品？',
    success: (r) => { if (r.confirm) cartStore.remove(it.id); },
  });
}
function goShop() {
  uni.switchTab({ url: '/pages/index/index' });
}
function checkout() {
  if (!checkedCount.value) return;
  if (!userStore.state.user.isLoggedIn) {
    uni.navigateTo({
      url: '/pages/login/login?redirect=' + encodeURIComponent('/pages/order/confirm'),
    });
    return;
  }
  uni.navigateTo({ url: '/pages/order/confirm' });
}
</script>

<style scoped>
.page { padding: 16rpx 24rpx 160rpx; min-height: 100vh; }
.empty { text-align: center; padding: 200rpx 0; }
.empty-icon { font-size: 96rpx; display: block; }
.empty-text { color: #999; font-size: 28rpx; display: block; margin: 24rpx 0; }
.go-shop { display: inline-block; padding: 16rpx 48rpx; background: #FF5A1F; color: #fff; border-radius: 36rpx; font-size: 26rpx; }
.row { background: #fff; border-radius: 16rpx; padding: 20rpx; display: flex; align-items: center; gap: 16rpx; margin-bottom: 16rpx; }
.check { width: 36rpx; height: 36rpx; border-radius: 50%; border: 2rpx solid #ccc; flex-shrink: 0; }
.check.on { background: #FF5A1F; border-color: #FF5A1F; position: relative; }
.check.on::after { content: '✓'; color: #fff; font-size: 24rpx; position: absolute; left: 8rpx; top: 2rpx; }
.thumb { width: 140rpx; height: 140rpx; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.thumb-emoji { font-size: 64rpx; line-height: 1; }
.detail { flex: 1; display: flex; flex-direction: column; }
.title { font-size: 26rpx; color: #222; line-height: 1.3; }
.spec { font-size: 22rpx; color: #999; margin-top: 6rpx; }
.bottom { display: flex; justify-content: space-between; align-items: center; margin-top: 12rpx; }
.price { color: #FF5A1F; font-size: 32rpx; font-weight: 700; }
.stepper { display: flex; align-items: center; gap: 16rpx; }
.step { width: 44rpx; height: 44rpx; line-height: 40rpx; text-align: center; background: #f2f3f5; border-radius: 8rpx; font-size: 28rpx; color: #555; }
.num { font-size: 26rpx; min-width: 40rpx; text-align: center; }
.del { font-size: 32rpx; padding: 0 8rpx; }
.footer { position: fixed; left: 0; right: 0; bottom: 0; height: 100rpx; background: #fff; display: flex; align-items: center; padding: 0 24rpx; gap: 16rpx; border-top: 1rpx solid #eee; }
.all-check { display: flex; align-items: center; gap: 10rpx; }
.all-text { font-size: 26rpx; color: #333; }
.total { flex: 1; text-align: right; padding-right: 16rpx; }
.total-label { font-size: 24rpx; color: #666; }
.total-price { color: #FF5A1F; font-size: 36rpx; font-weight: 700; }
.checkout { background: linear-gradient(135deg, #FF8A65, #FF5A1F); color: #fff; padding: 0 48rpx; height: 80rpx; line-height: 80rpx; border-radius: 40rpx; font-size: 28rpx; font-weight: 600; }
.checkout.disabled { opacity: .5; }
</style>
