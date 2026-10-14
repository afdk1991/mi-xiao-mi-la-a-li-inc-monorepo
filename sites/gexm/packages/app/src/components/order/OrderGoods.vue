<template>
  <view class="goods-card gexm-card">
    <view class="goods-list">
      <view v-for="item in selectedItems" :key="item.id" class="goods-item">
        <gexm-image-lazy
          class="goods-item__image"
          :src="item.mainImage || '/static/images/placeholder.svg'"
          mode="aspectFill"
          shape="round"
          :lazy="true"
          error-image="/static/images/placeholder.svg"
        />
        <view class="goods-item__info">
          <text class="goods-item__name">{{ item.name }}</text>
          <text class="goods-item__spec">{{ item.specsText }}</text>
          <view class="goods-item__bottom">
            <text class="goods-item__price">¥{{ item.price }}</text>
            <text class="goods-item__count">×{{ item.quantity }}</text>
          </view>
        </view>
      </view>
    </view>
    <view class="goods-summary">
      <text class="goods-summary__text">共 {{ selectedItems.length }} 件商品</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { useCartStore } from '@/store/cart'

const cartStore = useCartStore()

const selectedItems = cartStore.selectedItems
</script>

<style lang="scss" scoped>
.goods-card {
  margin: 0 $spacing-base $spacing-base;
}

.goods-list {
  padding: 0;
}

.goods-item {
  display: flex;
  padding: $spacing-base 0;
  border-bottom: 1rpx solid $border-color-lighter;

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  &:first-child {
    padding-top: 0;
  }

  &__image {
    width: 160rpx;
    height: 160rpx;
    border-radius: $border-radius-base;
    background: $bg-color;
    flex-shrink: 0;
  }

  &__info {
    flex: 1;
    margin-left: $spacing-base;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  &__name {
    font-size: $font-size-base;
    color: $text-color;
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  &__spec {
    font-size: $font-size-xs;
    color: $text-color-placeholder;
    margin-top: 8rpx;
  }

  &__bottom {
    margin-top: auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__price {
    font-size: $font-size-base;
    color: $danger-color;
    font-weight: 500;
  }

  &__count {
    font-size: $font-size-sm;
    color: $text-color-placeholder;
  }
}

.goods-summary {
  text-align: right;
  padding-top: $spacing-sm;
  margin-top: $spacing-sm;
  border-top: 1rpx solid $border-color-lighter;

  &__text {
    font-size: $font-size-sm;
    color: $text-color-secondary;
  }
}
</style>
