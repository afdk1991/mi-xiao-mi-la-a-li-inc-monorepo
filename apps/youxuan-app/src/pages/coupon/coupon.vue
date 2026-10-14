<template>
  <view class="page">
    <view v-for="c in list" :key="c.id" class="coupon" :class="{ used: c.received }">
      <view class="left">
        <text class="amount">¥{{ c.amount }}</text>
        <text class="threshold">满{{ c.threshold }}可用</text>
      </view>
      <view class="mid">
        <text class="title">{{ c.title }}</text>
        <text class="expire">有效期至 {{ c.expire }}</text>
      </view>
      <view class="right" @tap="receive(c)">
        {{ c.received ? '已领取' : (isExpired(c) ? '已过期' : '领取') }}
      </view>
    </view>
    <view v-if="!list.length" class="empty">暂无优惠券</view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { userStore, type Coupon } from '../../store/user';

const list = ref<Coupon[]>([]);
onShow(() => { list.value = [...userStore.state.coupons]; });

/** 过期判定：expire 为 YYYY-MM-DD，当天结束前仍可用 */
function isExpired(c: Coupon): boolean {
  const end = new Date(`${c.expire}T23:59:59`);
  if (Number.isNaN(end.getTime())) return false;
  return end.getTime() < Date.now();
}

function receive(c: Coupon) {
  if (c.received) return;
  if (isExpired(c)) {
    uni.showToast({ title: '该券已过期', icon: 'none' });
    return;
  }
  userStore.receiveCoupon(c.id);
  uni.showToast({ title: '领取成功', icon: 'success' });
  list.value = [...userStore.state.coupons];
}
</script>

<style scoped>
.page { padding: 16rpx 24rpx 40rpx; }
.empty { text-align: center; color: #999; padding: 160rpx 0; }
.coupon { display: flex; align-items: center; background: #fff; border-radius: 16rpx; margin-bottom: 16rpx; overflow: hidden; }
.left { width: 200rpx; background: linear-gradient(135deg, #FF8A65, #FF5A1F); color: #fff; padding: 32rpx 0; text-align: center; }
.amount { font-size: 48rpx; font-weight: 700; display: block; }
.threshold { font-size: 20rpx; opacity: .9; }
.mid { flex: 1; padding: 0 24rpx; }
.title { font-size: 28rpx; color: #222; font-weight: 600; display: block; }
.expire { font-size: 22rpx; color: #999; margin-top: 8rpx; display: block; }
.right { padding: 16rpx 28rpx; font-size: 24rpx; color: #FF5A1F; border: 1rpx solid #FF5A1F; border-radius: 28rpx; margin-right: 20rpx; }
.coupon.used .right { color: #bbb; border-color: #ddd; }
</style>
