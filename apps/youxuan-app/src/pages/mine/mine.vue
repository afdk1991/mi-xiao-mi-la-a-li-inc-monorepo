<template>
  <view class="page">
    <view class="profile">
      <view class="avatar" :style="{ background: user.avatarColor }">{{ user.isLoggedIn ? user.nick.slice(0, 1) : '优' }}</view>
      <view class="info">
        <text class="nick">{{ user.isLoggedIn ? user.nick : '未登录' }}</text>
        <text class="sig">{{ user.isLoggedIn ? user.phone : '点击登录，同步你的订单与收藏' }}</text>
      </view>
      <view v-if="!user.isLoggedIn" class="login-btn" @tap="onLogin">登录</view>
    </view>

    <view class="order-card">
      <view class="order-head">
        <text class="order-title">我的订单</text>
        <text class="order-more" @tap="goOrders('all')">全部 ›</text>
      </view>
      <view class="order-states">
        <view class="state" @tap="goOrders('pending_pay')">
          <view class="state-icon">
            💰
            <text v-if="counts.pending_pay" class="badge">{{ counts.pending_pay }}</text>
          </view>
          <text class="state-name">待付款</text>
        </view>
        <view class="state" @tap="goOrders('paid')">
          <view class="state-icon">
            📦
            <text v-if="counts.paid" class="badge">{{ counts.paid }}</text>
          </view>
          <text class="state-name">待发货</text>
        </view>
        <view class="state" @tap="goOrders('shipped')">
          <view class="state-icon">
            🚚
            <text v-if="counts.shipped" class="badge">{{ counts.shipped }}</text>
          </view>
          <text class="state-name">待收货</text>
        </view>
        <view class="state" @tap="goOrders('done')">
          <view class="state-icon">
            ⭐
            <text v-if="counts.done" class="badge">{{ counts.done }}</text>
          </view>
          <text class="state-name">已完成</text>
        </view>
        <view class="state" @tap="goOrders('refund')">
          <view class="state-icon">↩️</view>
          <text class="state-name">退款</text>
        </view>
      </view>
    </view>

    <view class="menu-card">
      <view v-for="m in menus" :key="m.key" class="menu-row" @tap="onMenu(m)">
        <text class="menu-icon">{{ m.icon }}</text>
        <text class="menu-name">{{ m.name }}</text>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <view class="version">{{ APP_INFO.name }} APP v{{ APP_INFO.version }} · Android</view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { userStore } from '../../store/user';
import { APP_INFO } from '../../config';

const user = ref(userStore.state.user);
const counts = ref({ pending_pay: 0, paid: 0, shipped: 0, done: 0, refund: 0 });

const menus = [
  { key: 'address', name: '收货地址', icon: '📍' },
  { key: 'coupon', name: '优惠券', icon: '🎫' },
  { key: 'favorite', name: '我的收藏', icon: '❤️' },
  { key: 'service', name: '客服中心', icon: '🎧' },
  { key: 'setting', name: '设置', icon: '⚙️' },
  { key: 'about', name: '关于我们', icon: 'ℹ️' },
];

onShow(() => {
  user.value = userStore.state.user;
  counts.value = {
    pending_pay: userStore.orderCountByStatus('pending_pay'),
    paid: userStore.orderCountByStatus('paid'),
    shipped: userStore.orderCountByStatus('shipped'),
    done: userStore.orderCountByStatus('done'),
    refund: userStore.orderCountByStatus('refund'),
  };
});

function onLogin() {
  if (user.value.isLoggedIn) {
    uni.showActionSheet({
      itemList: ['查看订单', '退出登录'],
      success: (r) => {
        if (r.tapIndex === 0) uni.navigateTo({ url: '/pages/order/list' });
        else if (r.tapIndex === 1) userStore.logout();
      },
    });
    return;
  }
  uni.navigateTo({ url: '/pages/login/login' });
}

function goOrders(status: string) {
  const target = `/pages/order/list?status=${status}`;
  if (!userStore.state.user.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login?redirect=' + encodeURIComponent(target) });
    return;
  }
  uni.navigateTo({ url: target });
}

function onMenu(m: { key: string; name: string }) {
  const map: Record<string, string> = {
    address: '/pages/address/list',
    coupon: '/pages/coupon/coupon',
    favorite: '/pages/favorite/favorite',
    service: '/pages/service/service',
    setting: '/pages/setting/setting',
    about: '/pages/about/about',
  };
  const target = map[m.key];
  if (!target) return;
  if (['address', 'coupon', 'favorite'].includes(m.key) && !userStore.state.user.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login?redirect=' + encodeURIComponent(target) });
    return;
  }
  uni.navigateTo({ url: target });
}
</script>

<style scoped>
.page { padding: 16rpx 24rpx 40rpx; }
.profile { background: #fff; border-radius: 20rpx; padding: 32rpx 24rpx; display: flex; align-items: center; gap: 20rpx; margin-bottom: 20rpx; }
.avatar { width: 100rpx; height: 100rpx; border-radius: 50%; color: #fff; font-size: 44rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.info { flex: 1; display: flex; flex-direction: column; }
.nick { font-size: 32rpx; color: #222; font-weight: 700; }
.sig { font-size: 22rpx; color: #999; margin-top: 8rpx; }
.login-btn { background: #FF5A1F; color: #fff; font-size: 24rpx; padding: 10rpx 28rpx; border-radius: 28rpx; }
.order-card { background: #fff; border-radius: 20rpx; padding: 24rpx; margin-bottom: 20rpx; }
.order-head { display: flex; justify-content: space-between; margin-bottom: 20rpx; }
.order-title { font-size: 28rpx; color: #222; font-weight: 600; }
.order-more { font-size: 24rpx; color: #999; }
.order-states { display: flex; justify-content: space-between; }
.state { display: flex; flex-direction: column; align-items: center; }
.state-icon { position: relative; font-size: 40rpx; }
.badge { position: absolute; top: -8rpx; right: -14rpx; background: #FF3B30; color: #fff; font-size: 18rpx; min-width: 28rpx; height: 28rpx; line-height: 28rpx; border-radius: 14rpx; text-align: center; padding: 0 6rpx; }
.state-name { font-size: 22rpx; color: #666; margin-top: 8rpx; }
.menu-card { background: #fff; border-radius: 20rpx; padding: 0 24rpx; }
.menu-row { display: flex; align-items: center; padding: 28rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.menu-row:last-child { border-bottom: none; }
.menu-icon { font-size: 32rpx; margin-right: 16rpx; }
.menu-name { flex: 1; font-size: 28rpx; color: #333; }
.menu-arrow { color: #ccc; font-size: 32rpx; }
.version { text-align: center; color: #bbb; font-size: 22rpx; margin-top: 40rpx; }
</style>
