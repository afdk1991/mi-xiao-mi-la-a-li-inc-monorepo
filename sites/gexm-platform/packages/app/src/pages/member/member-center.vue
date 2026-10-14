<template>
  <view class="member-center-page">
    <gexm-nav-bar title="会员中心" />
    <gexm-loading v-if="loading" />
    <view v-else class="member-content">
      <view class="member-header">
        <view class="member-header__bg" />
        <view class="member-card">
          <view class="member-card__level">
            <text class="member-card__level-icon">{{ memberLevel.icon }}</text>
            <text class="member-card__level-name">{{ memberLevel.name }}</text>
          </view>
          <text class="member-card__nickname">{{ userStore.nickname || userStore.username }}</text>
          <view class="member-card__progress">
            <view class="member-card__progress-bar">
              <view class="member-card__progress-fill" :style="{ width: progressPercent + '%' }" />
            </view>
            <text class="member-card__progress-text">
              {{ growthValue }}/{{ nextLevel.growth }}
              <text class="member-card__progress-hint">成长值</text>
            </text>
          </view>
        </view>
      </view>

      <view class="member-stats">
        <view class="member-stat-item" @click="goPointsLogs">
          <text class="member-stat-item__num">{{ pointsBalance }}</text>
          <text class="member-stat-item__label">积分余额</text>
        </view>
        <view class="member-stat-item" @click="goMyCoupons">
          <text class="member-stat-item__num">{{ couponCount }}</text>
          <text class="member-stat-item__label">优惠券</text>
        </view>
        <view class="member-stat-item">
          <text class="member-stat-item__num">{{ memberLevel.discount }}折</text>
          <text class="member-stat-item__label">专属折扣</text>
        </view>
      </view>

      <gexm-card title="会员权益" class="benefits-card">
        <view class="benefits-list">
          <view v-for="benefit in benefits" :key="benefit.id" class="benefit-item">
            <text class="benefit-item__icon">{{ benefit.icon }}</text>
            <view class="benefit-item__content">
              <text class="benefit-item__name">{{ benefit.name }}</text>
              <text class="benefit-item__desc">{{ benefit.description }}</text>
            </view>
          </view>
        </view>
      </gexm-card>

      <view class="menu-section">
        <gexm-list-item icon="📊" title="积分明细" arrow @click="goPointsLogs" />
        <gexm-list-item icon="🎁" title="我的优惠券" arrow @click="goMyCoupons" />
        <gexm-list-item icon="🎫" title="领取优惠券" arrow @click="goCouponCenter" />
        <gexm-list-item icon="📜" title="会员协议" arrow @click="goAgreement" />
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { useCouponStore } from '@/store/coupon'
import { memberApi } from '@/api'

const userStore = useUserStore()
const couponStore = useCouponStore()
const loading = ref(true)
const memberLevel = ref({ name: '普通会员', icon: '⭐', discount: 9.9 })
const pointsBalance = ref(0)
const growthValue = ref(0)
const nextLevel = ref({ name: '白银会员', growth: 1000 })
const benefits = ref([])

const couponCount = computed(() => couponStore.myCoupons.length)
const progressPercent = computed(() =>
  Math.min(100, (growthValue.value / nextLevel.value.growth) * 100)
)

onMounted(() => {
  if (!userStore.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }
})

onShow(() => {
  if (userStore.isLoggedIn) {
    fetchMemberData()
  }
})

async function fetchMemberData() {
  loading.value = true
  try {
    const [level, points, growth, benefitsData, next] = await Promise.all([
      memberApi.getMemberLevel(),
      memberApi.getPointsBalance(),
      memberApi.getGrowthValue(),
      memberApi.getMemberBenefits(),
      memberApi.getNextLevelInfo(),
    ])
    memberLevel.value = level || memberLevel.value
    pointsBalance.value = points || 0
    growthValue.value = growth || 0
    benefits.value = benefitsData || []
    nextLevel.value = next || nextLevel.value

    await couponStore.fetchMyCoupons()
  } catch (e) {
    console.error('Fetch member data error:', e)
  } finally {
    loading.value = false
  }
}

function goPointsLogs() {
  uni.navigateTo({ url: '/pages/member/points-logs' })
}

function goMyCoupons() {
  uni.navigateTo({ url: '/pages/coupon/coupon-mine' })
}

function goCouponCenter() {
  uni.navigateTo({ url: '/pages/coupon/coupon-list' })
}

function goAgreement() {
  uni.showToast({ title: '功能开发中', icon: 'none' })
}
</script>

<style lang="scss" scoped>
.member-center-page {
  min-height: 100vh;
  background: $bg-color-page;
}
.member-content {
  padding-bottom: $spacing-lg;
}
.member-header {
  position: relative;
  padding: 0 0 48rpx;
}
.member-header__bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 320rpx;
  background: linear-gradient(135deg, #ffd700 0%, #ffb700 100%);
}
.member-card {
  position: relative;
  margin: $spacing-base;
  padding: $spacing-md;
  background: #fff;
  border-radius: $border-radius-lg;
  box-shadow: $shadow-lg;
  margin-top: $spacing-lg;
}
.member-card__level {
  display: flex;
  align-items: center;
  margin-bottom: $spacing-sm;
}
.member-card__level-icon {
  font-size: 40rpx;
  margin-right: $spacing-xs;
}
.member-card__level-name {
  font-size: $font-size-lg;
  font-weight: bold;
  color: $text-color;
}
.member-card__nickname {
  font-size: $font-size-md;
  color: $text-color-secondary;
  display: block;
  margin-bottom: $spacing-md;
}
.member-card__progress {
  background: $bg-color-gray;
  border-radius: 100rpx;
  padding: $spacing-sm $spacing-base;
}
.member-card__progress-bar {
  height: 16rpx;
  background: #e8e8e8;
  border-radius: 8rpx;
  overflow: hidden;
}
.member-card__progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ffd700 0%, #ffb700 100%);
  border-radius: 8rpx;
  transition: width 0.3s ease;
}
.member-card__progress-text {
  display: block;
  text-align: right;
  font-size: $font-size-xs;
  color: $text-color-secondary;
  margin-top: $spacing-xs;
}
.member-card__progress-hint {
  margin-left: $spacing-xs;
  color: $text-color-placeholder;
}
.member-stats {
  display: flex;
  margin: 0 $spacing-base;
  background: #fff;
  border-radius: $border-radius-md;
  box-shadow: $shadow-sm;
  padding: $spacing-md 0;
}
.member-stat-item {
  flex: 1;
  text-align: center;
}
.member-stat-item__num {
  display: block;
  font-size: 40rpx;
  font-weight: bold;
  color: $text-color;
}
.member-stat-item__label {
  font-size: $font-size-sm;
  color: $text-color-secondary;
  margin-top: 8rpx;
}
.benefits-card {
  margin: $spacing-base;
}
.benefits-list {
  display: flex;
  flex-wrap: wrap;
}
.benefit-item {
  width: 50%;
  display: flex;
  align-items: flex-start;
  padding: $spacing-sm 0;
}
.benefit-item__icon {
  font-size: 48rpx;
  margin-right: $spacing-sm;
  flex-shrink: 0;
}
.benefit-item__content {
  flex: 1;
  min-width: 0;
}
.benefit-item__name {
  font-size: $font-size-base;
  font-weight: 600;
  color: $text-color;
  display: block;
}
.benefit-item__desc {
  font-size: $font-size-xs;
  color: $text-color-placeholder;
  margin-top: 4rpx;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.menu-section {
  background: #fff;
  border-radius: $border-radius-md;
  margin: $spacing-base;
  overflow: hidden;
  box-shadow: $shadow-sm;
}
</style>
