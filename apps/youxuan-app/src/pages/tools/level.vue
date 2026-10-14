<template>
  <view class="page">
    <view class="circle" :style="circleStyle">
      <view class="bubble" :style="bubbleStyle"></view>
      <view class="cross h"></view>
      <view class="cross v"></view>
    </view>
    <view class="readings">
      <text class="r">X: {{ x.toFixed(2) }}</text>
      <text class="r">Y: {{ y.toFixed(2) }}</text>
      <text class="r">倾角: {{ tilt.toFixed(1) }}°</text>
    </view>
    <view class="status" :class="{ ok: balanced }">{{ balanced ? '✓ 水平' : '调整手机…' }}</view>
    <view v-if="unsupported" class="unsupported">当前环境不支持加速度传感器（H5 需 HTTPS 且浏览器授权）</view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { onUnload } from '@dcloudio/uni-app';

const x = ref(0);
const y = ref(0);
const z = ref(9.8);
const unsupported = ref(false);

const balanced = computed(() => Math.abs(x.value) < 0.05 && Math.abs(y.value) < 0.05);

/** 相对水平面的倾角（度）：以 z 轴为重力主轴 */
const tilt = computed(() => {
  const horiz = Math.sqrt(x.value * x.value + y.value * y.value);
  return (Math.atan2(horiz, Math.abs(z.value)) * 180) / Math.PI;
});

/**
 * rpx → px：uni-app 只在静态样式里把 rpx 编译成响应式单位，
 * 动态内联样式里的 rpx 不会转换，直接写会失效，所以这里手动换算
 */
let unit = 1; // 1rpx = unit px
try {
  const info = uni.getSystemInfoSync();
  unit = (info.windowWidth || 375) / 750;
} catch {
  unit = 0.5;
}
const rpx2px = (v: number) => v * unit;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const bubbleStyle = computed(() => {
  const dx = clamp(x.value * 120, -60, 60);
  const dy = clamp(-y.value * 120, -60, 60);
  return { transform: `translate(${rpx2px(dx)}px, ${rpx2px(dy)}px)` };
});
const circleStyle = computed(() => ({
  borderColor: balanced.value ? '#4CAF50' : '#FF5A1F',
}));

// 传感器必须在页面挂载后再启动：setup 阶段页面实例尚未就绪，
// 部分平台（尤其 App 端）此时调用 startAccelerometer 会直接走 fail，页面静止且无读数
onMounted(() => {
  uni.onAccelerometerChange((res) => {
    x.value = res.x;
    y.value = res.y;
    if (typeof res.z === 'number') z.value = res.z;
  });

  uni.startAccelerometer({
    interval: 'normal',
    fail: () => {
      unsupported.value = true;
    },
  });
});

onUnload(() => {
  uni.stopAccelerometer();
});
</script>

<style scoped>
.page { padding: 60rpx 48rpx; display: flex; flex-direction: column; align-items: center; }
.circle { position: relative; width: 500rpx; height: 500rpx; border-radius: 50%; border: 8rpx solid #FF5A1F; background: #fff; overflow: hidden; }
.bubble { position: absolute; left: 50%; top: 50%; width: 120rpx; height: 120rpx; margin-left: -60rpx; margin-top: -60rpx; border-radius: 50%; background: rgba(255,90,31,.5); transition: transform .08s linear; }
.cross { position: absolute; background: #eee; }
.cross.h { left: 0; right: 0; top: 50%; height: 2rpx; }
.cross.v { top: 0; bottom: 0; left: 50%; width: 2rpx; }
.readings { display: flex; gap: 32rpx; margin-top: 48rpx; }
.r { font-size: 26rpx; color: #666; font-family: monospace; }
.status { margin-top: 32rpx; padding: 12rpx 48rpx; border-radius: 32rpx; background: #f2f3f5; font-size: 28rpx; color: #FF5A1F; }
.status.ok { background: #E8F5E9; color: #4CAF50; }
.unsupported { margin-top: 32rpx; font-size: 22rpx; color: #999; text-align: center; line-height: 1.6; padding: 0 24rpx; }
</style>