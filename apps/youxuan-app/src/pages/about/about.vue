<template>
  <view class="page">
    <view class="logo-block">
      <view class="logo">优</view>
      <text class="app-name">优选</text>
      <text class="version">Version {{ APP_INFO.version }}</text>
    </view>
    <view class="card">
      <view class="row"><text class="k">应用名称</text><text class="v">优选 · 综合商城</text></view>
      <view class="row"><text class="k">技术栈</text><text class="v">uni-app + Vue3 + TS</text></view>
      <view class="row"><text class="k">后端</text><text class="v">腾讯云 CloudBase</text></view>
      <view class="row"><text class="k">客服邮箱</text><text class="v">help@example.com</text></view>
      <view class="row"><text class="k">公司</text><text class="v">优选科技（演示）</text></view>
    </view>
    <text class="copyright">© 2026 YouXuan Inc. 仅供学习演示</text>
  </view>
</template>

<script setup lang="ts">
import { APP_INFO } from '../../config';
</script>

<style scoped>
.page { padding: 80rpx 48rpx; }
.logo-block { text-align: center; margin-bottom: 60rpx; }
.logo { width: 140rpx; height: 140rpx; border-radius: 36rpx; background: linear-gradient(135deg, #FF8A65, #FF5A1F); color: #fff; font-size: 64rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; margin: 0 auto 24rpx; }
.app-name { font-size: 36rpx; color: #222; font-weight: 700; display: block; }
.version { font-size: 24rpx; color: #999; margin-top: 8rpx; display: block; }
.card { background: #fff; border-radius: 16rpx; padding: 0 24rpx; }
.row { display: flex; justify-content: space-between; padding: 28rpx 0; border-bottom: 1rpx solid #f5f5f5; }
.row:last-child { border-bottom: none; }
.k { font-size: 26rpx; color: #999; }
.v { font-size: 26rpx; color: #333; }
.copyright { text-align: center; color: #bbb; font-size: 22rpx; margin-top: 60rpx; display: block; }
</style>
