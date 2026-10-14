<template>
  <view class="profile-page">
    <view class="profile-header">
      <view class="profile-user" @click="handleUserClick">
        <view v-if="userStore.isLoggedIn" class="profile-user__info">
          <image v-if="userStore.avatar" class="profile-avatar" :src="userStore.avatar" />
          <view v-else class="profile-avatar profile-avatar--default">
            <text>{{ (userStore.nickname || userStore.username || 'G').charAt(0) }}</text>
          </view>
          <view class="profile-user__text">
            <text class="profile-nickname">{{ userStore.nickname || userStore.username }}</text>
            <text class="profile-user__desc">查看个人信息</text>
          </view>
        </view>
        <view v-else class="profile-user__login">
          <view class="profile-avatar profile-avatar--default">
            <text>👤</text>
          </view>
          <view class="profile-user__text">
            <text class="profile-login-text">登录 / 注册</text>
            <text class="profile-user__desc">登录后享更多权益</text>
          </view>
        </view>
        <text class="profile-arrow">›</text>
      </view>

      <view class="profile-stats">
        <view class="profile-stat-item">
          <text class="profile-stat-num">0</text>
          <text class="profile-stat-label">关注</text>
        </view>
        <view class="profile-stat-item">
          <text class="profile-stat-num">0</text>
          <text class="profile-stat-label">粉丝</text>
        </view>
        <view class="profile-stat-item">
          <text class="profile-stat-num">0</text>
          <text class="profile-stat-label">获赞</text>
        </view>
      </view>
    </view>

    <view class="profile-content">
      <view class="order-section">
        <view class="section-header">
          <text class="section-title">我的订单</text>
          <view class="section-more" @click="goOrderList('')">
            <text class="section-more__text">查看全部</text>
            <text class="section-more__arrow">›</text>
          </view>
        </view>
        <view class="order-tabs">
          <view class="order-tab" @click="goOrderList('pending_payment')">
            <view class="order-tab__icon">💳</view>
            <text class="order-tab__text">待付款</text>
          </view>
          <view class="order-tab" @click="goOrderList('pending_shipment')">
            <view class="order-tab__icon">📦</view>
            <text class="order-tab__text">待发货</text>
          </view>
          <view class="order-tab" @click="goOrderList('shipped')">
            <view class="order-tab__icon">🚚</view>
            <text class="order-tab__text">待收货</text>
          </view>
          <view class="order-tab" @click="goOrderList('completed')">
            <view class="order-tab__icon">⭐</view>
            <text class="order-tab__text">待评价</text>
          </view>
          <view class="order-tab" @click="goOrderList('refund')">
            <view class="order-tab__icon">↩️</view>
            <text class="order-tab__text">退款/售后</text>
          </view>
          <view class="order-tab" @click="goFlashSaleOrders">
            <view class="order-tab__icon">⚡</view>
            <text class="order-tab__text">秒杀订单</text>
          </view>
        </view>
      </view>

      <view class="menu-section">
        <gexm-list-item icon="👑" title="会员中心" arrow @click="goMemberCenter" />
        <gexm-list-item icon="🎫" title="优惠券" arrow @click="goCoupon" />
        <gexm-list-item icon="📅" title="每日签到" arrow @click="goCheckin" />
        <gexm-list-item icon="📩" title="站内信" arrow @click="goInbox" />
      </view>

      <view class="menu-section">
        <gexm-list-item icon="⚡" title="限时秒杀" arrow @click="goFlashSale" />
        <gexm-list-item icon="✏️" title="编辑资料" arrow @click="goEditProfile" />
        <gexm-list-item icon="📍" title="收货地址" arrow @click="goAddress" />
        <gexm-list-item icon="❤️" title="我的收藏" arrow @click="goFavorite" />
      </view>

      <view class="menu-section">
        <gexm-list-item
          v-if="userStore.role === 'admin'"
          icon="🛠️"
          title="管理后台"
          arrow
          @click="goAdminDashboard"
        />
        <gexm-list-item icon="📊" title="数据仪表盘" arrow @click="goDashboard" />
        <gexm-list-item icon="💬" title="客服中心" arrow @click="goService" />
        <gexm-list-item icon="📝" title="意见反馈" arrow @click="goFeedback" />
        <gexm-list-item icon="⚙️" title="设置" arrow @click="goSettings" />
      </view>

      <view v-if="userStore.isLoggedIn" class="logout-section">
        <gexm-button type="danger" plain block @click="handleLogout">退出登录</gexm-button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { authApi } from '@/api'

const userStore = useUserStore()

onShow(() => {})

function handleUserClick() {
  if (userStore.isLoggedIn) {
    uni.navigateTo({ url: '/pages/edit-profile/edit-profile' })
  } else {
    uni.navigateTo({ url: '/pages/login/login' })
  }
}

function goEditProfile() {
  if (!userStore.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }
  uni.navigateTo({ url: '/pages/edit-profile/edit-profile' })
}

function goOrderList(status) {
  if (!userStore.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }
  const url = status ? `/pages/order/order-list?status=${status}` : '/pages/order/order-list'
  uni.navigateTo({ url })
}

function goAddress() {
  if (!userStore.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }
  uni.navigateTo({ url: '/pages/address/address-list' })
}

function goFavorite() {
  if (!userStore.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }
  uni.navigateTo({ url: '/pages/favorites/favorites' })
}

function goNotifications() {
  uni.navigateTo({ url: '/pages/notifications/notifications' })
}

function goService() {
  uni.navigateTo({ url: '/pages/chat/ai-chat' })
}

function goFeedback() {
  uni.navigateTo({ url: '/pages/mine/feedback' })
}

function goAbout() {
  uni.navigateTo({ url: '/pages/about/about' })
}

function goSettings() {
  uni.navigateTo({ url: '/pages/settings/settings' })
}

function goMemberCenter() {
  if (!userStore.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }
  uni.navigateTo({ url: '/pages/member/member-center' })
}

function goCoupon() {
  if (!userStore.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }
  uni.navigateTo({ url: '/pages/coupon/coupon-mine' })
}

function goCheckin() {
  if (!userStore.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }
  uni.navigateTo({ url: '/pages/checkin/checkin' })
}

function goInbox() {
  if (!userStore.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }
  uni.navigateTo({ url: '/pages/inbox/inbox-list' })
}

function goFlashSale() {
  uni.navigateTo({ url: '/pages/flash-sale/flash-sale' })
}

function goFlashSaleOrders() {
  if (!userStore.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }
  uni.navigateTo({ url: '/pages/flash-sale/flash-sale-orders' })
}

function goDashboard() {
  uni.navigateTo({ url: '/pages/admin/dashboard' })
}

function goAdminDashboard() {
  if (!userStore.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }
  if (userStore.role !== 'admin') {
    uni.showToast({ title: '需要管理员权限', icon: 'none' })
    return
  }
  uni.navigateTo({ url: '/pages/admin/dashboard' })
}

async function handleLogout() {
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await authApi.logout()
        } catch (e) {
          console.error('Logout api error:', e)
        }
        userStore.logout()
        uni.showToast({ title: '已退出登录', icon: 'success' })
      }
    },
  })
}
</script>

<style lang="scss" scoped>
.profile-page {
  min-height: 100vh;
  background: $bg-color-page;
}

.profile-header {
  background: linear-gradient(135deg, $primary-color 0%, #66b1ff 100%);
  padding: 60rpx 32rpx 48rpx;
  color: #fff;
}

.profile-user {
  display: flex;
  align-items: center;

  &__info,
  &__login {
    display: flex;
    align-items: center;
    flex: 1;
  }

  &__text {
    flex: 1;
    margin-left: 24rpx;
    display: flex;
    flex-direction: column;
  }

  &__desc {
    font-size: 24rpx;
    opacity: 0.8;
    margin-top: 8rpx;
  }
}

.profile-avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(255, 255, 255, 0.5);
  flex-shrink: 0;

  &--default {
    background: rgba(255, 255, 255, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 48rpx;
    font-weight: bold;
  }
}

.profile-nickname {
  font-size: 40rpx;
  font-weight: bold;
}

.profile-login-text {
  font-size: 36rpx;
  font-weight: 600;
}

.profile-arrow {
  font-size: 40rpx;
  opacity: 0.8;
}

.profile-stats {
  display: flex;
  margin-top: 40rpx;

  &-item {
    flex: 1;
    text-align: center;
  }

  &-num {
    display: block;
    font-size: 40rpx;
    font-weight: bold;
  }

  &-label {
    font-size: 24rpx;
    opacity: 0.8;
    margin-top: 8rpx;
  }
}

.profile-content {
  padding: 24rpx;
  margin-top: -24rpx;
}

.order-section {
  background: #fff;
  border-radius: 16rpx;
  margin-bottom: 24rpx;
  overflow: hidden;
  box-shadow: $shadow-sm;
  padding: $spacing-base;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-base;
}

.section-title {
  font-size: $font-size-md;
  font-weight: 600;
  color: $text-color;
}

.section-more {
  display: flex;
  align-items: center;

  &__text {
    font-size: $font-size-sm;
    color: $text-color-secondary;
  }

  &__arrow {
    font-size: $font-size-base;
    color: $text-color-placeholder;
    margin-left: 4rpx;
  }
}

.order-tabs {
  display: flex;
  justify-content: space-around;
}

.order-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $spacing-sm 0;

  &__icon {
    font-size: 56rpx;
    margin-bottom: 8rpx;
  }

  &__text {
    font-size: $font-size-sm;
    color: $text-color-secondary;
  }
}

.menu-section {
  background: #fff;
  border-radius: 16rpx;
  margin-bottom: 24rpx;
  overflow: hidden;
  box-shadow: $shadow-sm;
}

.logout-section {
  margin-top: 48rpx;
}
</style>
