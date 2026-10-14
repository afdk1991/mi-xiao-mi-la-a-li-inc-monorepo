<template>
  <view class="privacy-page">
    <gexm-nav-bar title="隐私政策" />

    <view class="privacy-content">
      <view class="privacy-card">
        <text class="privacy-title">隐私政策</text>
        <text class="privacy-update">更新日期：2024年1月1日</text>

        <view class="privacy-section">
          <text class="privacy-section-title">一、信息收集</text>
          <text class="privacy-text">
            我们会收集您在使用服务过程中主动提供的信息，包括但不限于：
            账号信息（用户名、邮箱、手机号）、头像、昵称等。
          </text>
        </view>

        <view class="privacy-section">
          <text class="privacy-section-title">二、信息使用</text>
          <text class="privacy-text">
            我们会将收集的信息用于提供、维护和改进我们的服务，
            包括用户身份验证、个性化推荐、客户支持等。
          </text>
        </view>

        <view class="privacy-section">
          <text class="privacy-section-title">三、信息保护</text>
          <text class="privacy-text">
            我们采用业界标准的安全技术和管理措施来保护您的个人信息安全，
            防止信息遭到未经授权的访问、使用或泄露。
          </text>
        </view>

        <view class="privacy-section">
          <text class="privacy-section-title">四、信息共享</text>
          <text class="privacy-text">
            未经您的同意，我们不会向第三方共享您的个人信息， 法律法规要求的情况除外。
          </text>
        </view>

        <view class="privacy-section">
          <text class="privacy-section-title">五、您的权利</text>
          <text class="privacy-text">
            您有权访问、更新或删除您的个人信息，也可以注销账号。 如需帮助，请联系我们的客服团队。
          </text>
        </view>

        <view class="privacy-section">
          <text class="privacy-section-title">六、联系我们</text>
          <text class="privacy-text">
            如果您对本隐私政策有任何疑问，请通过以下方式联系我们： 邮箱：support@gexm.com
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup></script>

<style lang="scss" scoped>
.privacy-page {
  min-height: 100vh;
  background: $bg-color-page;
}

.privacy-content {
  padding: 24rpx;
}

.privacy-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
  box-shadow: $shadow-sm;
}

.privacy-title {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: $text-color;
  text-align: center;
  margin-bottom: 16rpx;
}

.privacy-update {
  display: block;
  font-size: 24rpx;
  color: $text-color-placeholder;
  text-align: center;
  margin-bottom: 32rpx;
}

.privacy-section {
  margin-bottom: 32rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.privacy-section-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: $text-color;
  margin-bottom: 16rpx;
}

.privacy-text {
  font-size: 28rpx;
  color: $text-color-secondary;
  line-height: 1.8;
}
</style>
