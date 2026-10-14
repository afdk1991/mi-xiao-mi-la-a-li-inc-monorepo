<template>
  <view class="gexm-product-card" @click="goDetail">
    <gexm-image-lazy
      class="gexm-product-card__image"
      :src="productImage"
      mode="aspectFill"
      shape="round"
      :lazy="true"
      :aspect-ratio="'1 / 1'"
      error-image="/static/images/placeholder.svg"
    />
    <view class="gexm-product-card__info">
      <text class="gexm-product-card__name">{{ productName }}</text>
      <view class="gexm-product-card__meta">
        <view class="gexm-product-card__price">
          <text class="gexm-product-card__price-symbol">¥</text>
          <text class="gexm-product-card__price-value">{{ displayPrice }}</text>
        </view>
        <text class="gexm-product-card__sales">已售 {{ salesCount }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  product: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['click'])

const productImage = computed(() => {
  return (
    props.product.main_image ||
    props.product.image ||
    props.product.cover_image ||
    '/static/images/placeholder.svg'
  )
})

const productName = computed(() => {
  return props.product.name || props.product.title || ''
})

const displayPrice = computed(() => {
  const price = props.product.price || props.product.sale_price || 0
  return Number(price).toFixed(2)
})

const salesCount = computed(() => {
  return props.product.sales_count || props.product.sales || 0
})

function goDetail() {
  emit('click')
  uni.navigateTo({
    url: `/pages/product/detail?id=${props.product.id}`,
  })
}
</script>

<style lang="scss" scoped>
.gexm-product-card {
  background: $bg-color-white;
  border-radius: $radius-lg;
  overflow: hidden;
  box-shadow: $shadow-sm;
  transition: all $duration-base $ease-out;

  // 悬浮状态
  &:hover {
    box-shadow: $shadow-md;
    transform: translateY(-2rpx);
  }

  // 点击状态
  &:active {
    opacity: 0.95;
    transform: scale(0.98);
    box-shadow: $shadow-xs;
  }

  &__image {
    width: 100%;
    aspect-ratio: 1 / 1;
    display: block;
    background: $gray-100;
  }

  &__info {
    padding: $spacing-4;
  }

  &__name {
    font-size: $font-size-sm;
    color: $text-color-primary;
    line-height: $line-height-snug;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    min-height: 2 * $font-size-sm * $line-height-snug;
  }

  &__meta {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    margin-top: $spacing-3;
    gap: $spacing-2;
  }

  &__price {
    display: flex;
    align-items: baseline;
    color: $color-danger;
  }

  &__price-symbol {
    font-size: $font-size-xs;
    font-weight: $font-weight-medium;
    margin-right: 2rpx;
  }

  &__price-value {
    font-size: $font-size-lg;
    font-weight: $font-weight-bold;
    letter-spacing: -0.5rpx;
  }

  &__sales {
    font-size: $font-size-xs;
    color: $text-color-tertiary;
    white-space: nowrap;
  }
}

// ===================================
// 响应式适配
// ===================================

// 小屏幕优化 (< 375px)
@media screen and (max-width: #{$breakpoint-sm - 1px}) {
  .gexm-product-card {
    &__info {
      padding: $spacing-3;
    }

    &__name {
      font-size: $font-size-xs;
      min-height: 2 * $font-size-xs * $line-height-snug;
      -webkit-line-clamp: 2;
    }

    &__price-value {
      font-size: $font-size-md;
    }

    &__sales {
      font-size: 18rpx;
    }
  }
}

// 平板及以上 (> 768px)
@media screen and (min-width: $breakpoint-lg) {
  .gexm-product-card {
    &__info {
      padding: $spacing-5;
    }

    &__name {
      font-size: $font-size-base;
      min-height: 2 * $font-size-base * $line-height-snug;
    }

    &__price-value {
      font-size: $font-size-xl;
    }
  }
}
</style>
