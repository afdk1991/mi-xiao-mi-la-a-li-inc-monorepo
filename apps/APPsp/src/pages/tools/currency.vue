<template>
  <view class="page">
    <view class="card">
      <view class="row">
        <text class="label">金额</text>
        <input v-model="amount" class="input" type="digit" placeholder="输入金额" />
      </view>
      <view class="row">
        <text class="label">从</text>
        <picker :range="currencies" range-key="name" @change="(e: any) => fromIdx = Number(e.detail.value)">
          <view class="picker">{{ currencies[fromIdx].flag }} {{ currencies[fromIdx].name }}</view>
        </picker>
      </view>
      <view class="row">
        <text class="label">到</text>
        <picker :range="currencies" range-key="name" @change="(e: any) => toIdx = Number(e.detail.value)">
          <view class="picker">{{ currencies[toIdx].flag }} {{ currencies[toIdx].name }}</view>
        </picker>
      </view>
    </view>

    <view class="result-card">
      <text class="amount">{{ parsed }} {{ currencies[fromIdx].code }}</text>
      <text class="arrow">=></text>
      <text class="out">{{ converted.toFixed(2) }} {{ currencies[toIdx].code }}</text>
      <text class="rate">1 {{ currencies[fromIdx].code }} = {{ rate.toFixed(4) }} {{ currencies[toIdx].code }}</text>
    </view>
    <text class="hint">汇率为演示用固定值，实时汇率请以银行牌价为准</text>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

interface Currency { code: string; name: string; flag: string; rate: number; }
// 以人民币为基准的参考汇率
const currencies: Currency[] = [
  { code: 'CNY', name: '人民币', flag: '🇨🇳', rate: 1 },
  { code: 'USD', name: '美元', flag: '🇺🇸', rate: 0.138 },
  { code: 'EUR', name: '欧元', flag: '🇪🇺', rate: 0.128 },
  { code: 'JPY', name: '日元', flag: '🇯🇵', rate: 21.2 },
  { code: 'HKD', name: '港币', flag: '🇭🇰', rate: 1.08 },
  { code: 'GBP', name: '英镑', flag: '🇬🇧', rate: 0.109 },
  { code: 'KRW', name: '韩元', flag: '🇰🇷', rate: 185.4 },
  { code: 'THB', name: '泰铢', flag: '🇹🇭', rate: 4.85 },
];

const amount = ref('100');
const fromIdx = ref(0);
const toIdx = ref(1);

const parsed = computed(() => parseFloat(amount.value) || 0);
const rate = computed(() => currencies[toIdx.value].rate / currencies[fromIdx.value].rate);
const converted = computed(() => parsed.value * rate.value);
</script>

<style scoped>
.page { padding: 16rpx 24rpx 40rpx; }
.card { background: #fff; border-radius: 16rpx; padding: 0 24rpx; margin-bottom: 24rpx; }
.row { display: flex; align-items: center; padding: 28rpx 0; border-bottom: 1rpx solid #f5f5f5; }
.row:last-child { border-bottom: none; }
.label { width: 100rpx; font-size: 26rpx; color: #999; }
.input { flex: 1; font-size: 30rpx; }
.picker { font-size: 28rpx; color: #222; }
.result-card { background: linear-gradient(135deg, #FF8A65, #FF5A1F); border-radius: 16rpx; padding: 40rpx 24rpx; text-align: center; }
.amount { color: rgba(255,255,255,.9); font-size: 28rpx; display: block; }
.arrow { color: rgba(255,255,255,.6); font-size: 24rpx; display: block; margin: 12rpx 0; }
.out { color: #fff; font-size: 48rpx; font-weight: 700; display: block; }
.rate { color: rgba(255,255,255,.85); font-size: 22rpx; display: block; margin-top: 16rpx; }
.hint { text-align: center; color: #bbb; font-size: 20rpx; margin-top: 24rpx; display: block; }
</style>
