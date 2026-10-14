<template>
  <view class="coupon-list-page">
    <gexm-nav-bar title="优惠券领取中心" />
    <gexm-loading v-if="loading" />
    <gexm-empty v-else-if="coupons.length === 0" description="暂无可用优惠券" />
    <view v-else class="coupon-list">
      <view
        v-for="coupon in coupons"
        :key="coupon.id"
        class="coupon-card"
        @click="handleClaim(coupon)"
      >
        <view class="coupon-card__left">
          <text class="coupon-card__amount">¥{{ coupon.amount }}</text>
          <text class="coupon-card__condition">满{{ coupon.minAmount }}可用</text>
        </view>
        <view class="coupon-card__right">
          <text class="coupon-card__name">{{ coupon.name }}</text>
          <text class="coupon-card__valid">{{ coupon.validPeriod }}</text>
          <gexm-button
            v-if="coupon.canClaim"
            type="primary"
            size="small"
            round
            class="coupon-card__btn"
            :loading="claimingIds.includes(coupon.id)"
            @click.stop="handleClaim(coupon)"
          >
            立即领取
          </gexm-button>
          <text v-else-if="coupon.claimed" class="coupon-card__status">已领取</text>
          <text v-else class="coupon-card__status coupon-card__status--disabled">已抢光</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { couponApi } from '@/api'

const userStore = useUserStore()
const loading = ref(true)
const coupons = ref([])
const claimingIds = ref([])

onMounted(() => {
  if (!userStore.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }
})

onShow(() => {
  if (userStore.isLoggedIn) {
    fetchCoupons()
  }
})

async function fetchCoupons() {
  loading.value = true
  try {
    const data = await couponApi.getAvailable()
    coupons.value = data || []
  } catch (e) {
    console.error('Fetch coupons error:', e)
    coupons.value = []
  } finally {
    loading.value = false
  }
}

async function handleClaim(coupon) {
  if (!coupon.canClaim || claimingIds.value.includes(coupon.id)) return
  claimingIds.value.push(coupon.id)
  try {
    await couponApi.claimCoupon(coupon.id)
    uni.showToast({ title: '领取成功', icon: 'success' })
    coupon.canClaim = false
    coupon.claimed = true
  } catch (e) {
    console.error('Claim coupon error:', e)
  } finally {
    claimingIds.value = claimingIds.value.filter((id) => id !== coupon.id)
  }
}
</script>

<style lang="scss" scoped>
.coupon-list-page {
  min-height: 100vh;
  background: $bg-color-page;
}

.coupon-list {
  padding: $spacing-base;
}

.coupon-card {
  display: flex;
  background: #fff;
  border-radius: $border-radius-md;
  overflow: hidden;
  margin-bottom: $spacing-base;
  box-shadow: $shadow-sm;
  position: relative;

  &__left {
    width: 200rpx;
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: $spacing-md 0;
    flex-shrink: 0;
  }

  &__amount {
    font-size: 56rpx;
    font-weight: bold;
    color: #fff;
    line-height: 1;
  }

  &__condition {
    font-size: 20rpx;
    color: rgba(255, 255, 255, 0.8);
    margin-top: $spacing-xs;
  }

  &__right {
    flex: 1;
    padding: $spacing-base;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background: #fff;
  }

  &__name {
    font-size: $font-size-md;
    font-weight: 600;
    color: $text-color;
  }

  &__valid {
    font-size: $font-size-xs;
    color: $text-color-placeholder;
    margin-top: $spacing-xs;
  }

  &__btn {
    align-self: flex-start;
    margin-top: $spacing-sm;
    padding: 0 32rpx;
  }

  &__status {
    font-size: $font-size-sm;
    color: $success-color;
    margin-top: $spacing-sm;

    &--disabled {
      color: $text-color-placeholder;
    }
  }
}
</style>
