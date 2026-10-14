<template>
  <view class="about-page">
    <gexm-nav-bar title="关于我们" />

    <view class="about-content">
      <view class="about-logo-section">
        <view class="about-logo">G</view>
        <text class="about-name">Gexm</text>
        <text class="about-version">v1.0.0</text>
      </view>

      <gexm-card title="产品介绍" class="about-card">
        <text class="about-text">
          Gexm 是一款全平台应用系统，采用 uni-app 跨平台技术栈， 实现
          iOS、Android、小程序（微信/支付宝/百度/抖音）、H5、 PC
          桌面端等多端覆盖，为用户提供统一的使用体验。
        </text>
      </gexm-card>

      <gexm-card title="核心特性" class="about-card">
        <view class="about-feature">
          <view class="about-feature-item">
            <text class="about-feature-icon">📱</text>
            <text class="about-feature-text">多端适配</text>
          </view>
          <view class="about-feature-item">
            <text class="about-feature-icon">🔄</text>
            <text class="about-feature-text">数据同步</text>
          </view>
          <view class="about-feature-item">
            <text class="about-feature-icon">🔔</text>
            <text class="about-feature-text">消息推送</text>
          </view>
          <view class="about-feature-item">
            <text class="about-feature-icon">🔒</text>
            <text class="about-feature-text">安全可靠</text>
          </view>
        </view>
      </gexm-card>

      <gexm-card title="技术栈" class="about-card">
        <gexm-list-item icon="⚡" title="前端框架" value="Vue 3 + uni-app" :clickable="false" />
        <gexm-list-item icon="🗄️" title="后端服务" value="Express.js + SQLite" :clickable="false" />
        <gexm-list-item icon="💻" title="桌面端" value="Electron" :clickable="false" />
        <gexm-list-item icon="📦" title="状态管理" value="Pinia" :clickable="false" />
      </gexm-card>
    </view>
  </view>
</template>

<script setup></script>

<style lang="scss" scoped>
.about-page {
  min-height: 100vh;
  background: $bg-color-page;
}

.about-content {
  padding: 24rpx;
}

.about-logo-section {
  text-align: center;
  padding: 60rpx 0 48rpx;
}

.about-logo {
  width: 160rpx;
  height: 160rpx;
  background: linear-gradient(135deg, $primary-color 0%, #66b1ff 100%);
  border-radius: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24rpx;
  font-size: 80rpx;
  font-weight: bold;
  color: #fff;
  box-shadow: 0 8rpx 32rpx rgba(64, 158, 255, 0.3);
}

.about-name {
  display: block;
  font-size: 40rpx;
  font-weight: bold;
  color: $text-color;
}

.about-version {
  font-size: 26rpx;
  color: $text-color-secondary;
  margin-top: 8rpx;
}

.about-card {
  margin-bottom: 24rpx;
}

.about-text {
  font-size: 28rpx;
  color: $text-color-secondary;
  line-height: 1.8;
}

.about-feature {
  display: flex;
  flex-wrap: wrap;

  &-item {
    width: 50%;
    display: flex;
    align-items: center;
    padding: 16rpx 0;
  }

  &-icon {
    font-size: 40rpx;
    margin-right: 16rpx;
  }

  &-text {
    font-size: 28rpx;
    color: $text-color;
  }
}
</style>
