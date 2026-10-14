<template>
  <view class="simple-page">
    <view class="page-header">
      <text class="page-title">Gexm 商城</text>
    </view>
    <view class="page-content">
      <view class="content-card">
        <text class="card-title">欢迎使用 Gexm</text>
        <text class="card-desc">全平台应用系统</text>
      </view>
      <view class="content-grid">
        <view class="grid-item">
          <text class="grid-icon">🏠</text>
          <text class="grid-label">首页</text>
        </view>
        <view class="grid-item">
          <text class="grid-icon">📦</text>
          <text class="grid-label">分类</text>
        </view>
        <view class="grid-item">
          <text class="grid-icon">🛒</text>
          <text class="grid-label">购物车</text>
        </view>
        <view class="grid-item">
          <text class="grid-icon">👤</text>
          <text class="grid-label">我的</text>
        </view>
      </view>
    </view>
    <view class="page-footer">
      <text class="footer-text">— Gexm Platform —</text>
    </view>
  </view>
</template>

<script setup>
console.log('Simple test page loaded')
</script>

<style lang="scss" scoped>
.simple-page {
  min-height: 100vh;
  background-color: #f5f7fa;
}

.page-header {
  background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
  padding: 60rpx 40rpx;
  text-align: center;
}

.page-title {
  font-size: 48rpx;
  font-weight: 700;
  color: #ffffff;
}

.page-content {
  padding: 40rpx;
}

.content-card {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 40rpx;
  text-align: center;
  margin-bottom: 40rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
}

.card-title {
  display: block;
  font-size: 36rpx;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 16rpx;
}

.card-desc {
  display: block;
  font-size: 28rpx;
  color: #6b7280;
}

.content-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 24rpx;
}

.grid-item {
  width: calc(50% - 12rpx);
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 40rpx;
  text-align: center;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.grid-icon {
  display: block;
  font-size: 64rpx;
  margin-bottom: 16rpx;
}

.grid-label {
  display: block;
  font-size: 28rpx;
  color: #374151;
}

.page-footer {
  text-align: center;
  padding: 40rpx;
}

.footer-text {
  font-size: 24rpx;
  color: #9ca3af;
  letter-spacing: 2rpx;
}
</style>