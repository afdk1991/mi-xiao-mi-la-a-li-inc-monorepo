<template>
  <view class="address-section">
    <view v-if="currentAddress" class="address-card" @click="goAddress">
      <text class="address-card__icon">📍</text>
      <view class="address-card__info">
        <view class="address-card__top">
          <text class="address-card__name">{{ currentAddress.name }}</text>
          <text class="address-card__phone">{{ currentAddress.phone }}</text>
        </view>
        <text class="address-card__detail">{{ currentAddress.fullAddress }}</text>
      </view>
      <text class="address-card__arrow">›</text>
    </view>
    <view v-else class="address-empty" @click="goAddress">
      <text class="address-empty__icon">+</text>
      <text class="address-empty__text">请添加收货地址</text>
      <text class="address-empty__arrow">›</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { useAddressStore } from '@/store/address'

const addressStore = useAddressStore()

const currentAddress = addressStore.currentAddress

function goAddress() {
  uni.navigateTo({ url: '/pages/address/address-list?select=1' })
}
</script>

<style lang="scss" scoped>
.address-section {
  margin: $spacing-base;
}

.address-card {
  display: flex;
  align-items: center;
  background: $bg-color-white;
  padding: $spacing-base;
  border-radius: $border-radius-lg;
  box-shadow: $shadow-sm;

  &__icon {
    font-size: 48rpx;
    margin-right: $spacing-base;
  }

  &__info {
    flex: 1;
    min-width: 0;
  }

  &__top {
    display: flex;
    align-items: center;
    margin-bottom: 8rpx;
  }

  &__name {
    font-size: $font-size-base;
    font-weight: 600;
    color: $text-color;
    margin-right: $spacing-base;
  }

  &__phone {
    font-size: $font-size-sm;
    color: $text-color-secondary;
  }

  &__detail {
    font-size: $font-size-sm;
    color: $text-color-secondary;
    line-height: 1.4;
  }

  &__arrow {
    font-size: $font-size-lg;
    color: $text-color-placeholder;
    margin-left: $spacing-sm;
  }
}

.address-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  background: $bg-color-white;
  padding: $spacing-lg $spacing-base;
  border-radius: $border-radius-lg;
  box-shadow: $shadow-sm;

  &__icon {
    font-size: 40rpx;
    margin-right: $spacing-sm;
  }

  &__text {
    flex: 1;
    font-size: $font-size-base;
    color: $text-color-placeholder;
  }

  &__arrow {
    font-size: $font-size-lg;
    color: $text-color-placeholder;
  }
}
</style>
