<template>
  <view v-if="show" class="sku-selector" @click="handleClose">
    <view class="sku-mask" :class="{ 'sku-mask--visible': show }" />
    <view class="sku-content" :class="{ 'sku-content--visible': show }" @click.stop>
      <view class="sku-header">
        <image class="sku-image" :src="productImage" mode="aspectFill" lazy-load />
        <view class="sku-info">
          <view class="sku-price">
            <text class="price-symbol">¥</text>
            <text class="price-value">{{ formatPrice(currentPrice) }}</text>
            <text v-if="originalPrice && currentPrice !== originalPrice" class="price-original">
              ¥{{ formatPrice(originalPrice) }}
            </text>
          </view>
          <text class="sku-selected">{{ selectedSpecsText }}</text>
          <text class="sku-stock">库存 {{ currentStock }} 件</text>
        </view>
        <view class="sku-close" @click="handleClose">
          <text class="close-icon">✕</text>
        </view>
      </view>

      <scroll-view class="sku-body" scroll-y :scroll-with-animation="true">
        <view v-for="(group, groupIndex) in specGroups" :key="group.name" class="spec-group">
          <text class="spec-group-name">{{ group.name }}</text>
          <view class="spec-list">
            <view
              v-for="(spec, specIndex) in group.values"
              :key="spec.name || spec.value"
              class="spec-item"
              :class="{
                'spec-item--active': isSpecSelected(groupIndex, spec),
                'spec-item--disabled': isSpecDisabled(groupIndex, spec),
              }"
              @click="selectSpec(groupIndex, spec)"
              @touchstart="handleSpecTouchStart(groupIndex, spec)"
              @touchend="handleSpecTouchEnd"
            >
              <text>{{ spec.name || spec.value }}</text>
            </view>
          </view>
        </view>

        <view class="quantity-section">
          <text class="quantity-label">购买数量</text>
          <view class="quantity-selector">
            <view
              class="quantity-btn quantity-btn--minus"
              :class="{ 'quantity-btn--disabled': quantity <= 1 }"
              @click="decreaseQuantity"
            >
              <text>−</text>
            </view>
            <view class="quantity-input-wrap">
              <text class="quantity-value">{{ quantity }}</text>
            </view>
            <view
              class="quantity-btn quantity-btn--plus"
              :class="{ 'quantity-btn--disabled': quantity >= currentStock }"
              @click="increaseQuantity"
            >
              <text>+</text>
            </view>
          </view>
        </view>
      </scroll-view>

      <view class="sku-footer">
        <view
          class="footer-btn footer-btn--cart"
          :class="{ 'footer-btn--disabled': !canAddToCart }"
          @click="handleAddToCart"
        >
          <text>加入购物车</text>
        </view>
        <view
          class="footer-btn footer-btn--buy"
          :class="{ 'footer-btn--disabled': !canBuyNow }"
          @click="handleBuyNow"
        >
          <text>立即购买</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps({
  product: {
    type: Object,
    default: () => ({}),
  },
  skus: {
    type: Array,
    default: () => [],
  },
  show: {
    type: Boolean,
    default: false,
  },
  defaultQuantity: {
    type: Number,
    default: 1,
  },
})

const emit = defineEmits(['close', 'addToCart', 'buyNow'])

const selectedSpecs = ref({})
const quantity = ref(1)
const touchedSpec = ref(null)

watch(
  () => props.show,
  (val) => {
    if (val) {
      nextTick(() => {
        selectedSpecs.value = {}
        quantity.value = Math.max(
          1,
          Math.min(props.defaultQuantity || 1, props.product.stock || 999)
        )
      })
    }
  }
)

watch(
  () => props.defaultQuantity,
  (val) => {
    if (val && props.show) {
      quantity.value = Math.max(1, Math.min(val, currentStock.value))
    }
  }
)

const productImage = computed(() => {
  const currentSku = currentSkuInfo.value
  if (currentSku && currentSku.image) {
    return currentSku.image
  }
  return props.product.image || props.product.cover || props.product.main_image || ''
})

const currentPrice = computed(() => {
  const currentSku = currentSkuInfo.value
  if (currentSku && currentSku.price !== undefined) {
    return currentSku.price
  }
  return props.product.price || '0.00'
})

const originalPrice = computed(() => {
  const currentSku = currentSkuInfo.value
  if (currentSku && currentSku.original_price !== undefined) {
    return currentSku.original_price
  }
  return props.product.original_price || ''
})

const currentStock = computed(() => {
  const currentSku = currentSkuInfo.value
  if (currentSku && currentSku.stock !== undefined) {
    return currentSku.stock
  }
  return props.product.stock || 999
})

const specGroups = computed(() => {
  if (props.product.specs && props.product.specs.length > 0) {
    return props.product.specs
  }

  if (props.skus.length > 0 && props.skus[0].specs) {
    const groups = {}
    props.skus.forEach((sku) => {
      if (sku.specs) {
        sku.specs.forEach((spec) => {
          const groupName = spec.name || '规格'
          if (!groups[groupName]) {
            groups[groupName] = { name: groupName, values: [] }
          }
          const exists = groups[groupName].values.find(
            (v) => v.name === spec.value || v.value === spec.value
          )
          if (!exists) {
            groups[groupName].values.push({ name: spec.value, value: spec.value })
          }
        })
      }
    })
    return Object.values(groups)
  }

  return []
})

const currentSkuInfo = computed(() => {
  if (!props.skus || props.skus.length === 0) return null

  const selectedCount = Object.keys(selectedSpecs.value).length
  const totalGroups = specGroups.value.length

  if (selectedCount !== totalGroups) return null

  return props.skus.find((sku) => {
    if (!sku.specs) return false
    return sku.specs.every((spec) => {
      const groupIndex = specGroups.value.findIndex((g) => g.name === (spec.name || '规格'))
      if (groupIndex === -1) return false
      const selected = selectedSpecs.value[groupIndex]
      return selected && (selected.name === spec.value || selected.value === spec.value)
    })
  })
})

const selectedSpecsText = computed(() => {
  const texts = []
  specGroups.value.forEach((group, index) => {
    const selected = selectedSpecs.value[index]
    if (selected) {
      texts.push(selected.name || selected.value)
    }
  })
  return texts.length > 0 ? texts.join(' / ') : '请选择规格'
})

const canAddToCart = computed(() => {
  const totalGroups = specGroups.value.length
  if (totalGroups === 0) return true
  const selectedCount = Object.keys(selectedSpecs.value).length
  return selectedCount === totalGroups && quantity.value > 0 && quantity.value <= currentStock.value
})

const canBuyNow = computed(() => canAddToCart.value)

function formatPrice(price) {
  if (!price) return '0.00'
  const num = parseFloat(price)
  return isNaN(num) ? '0.00' : num.toFixed(2)
}

function isSpecSelected(groupIndex, spec) {
  const selected = selectedSpecs.value[groupIndex]
  if (!selected) return false
  const specValue = spec.name || spec.value
  const selectedValue = selected.name || selected.value
  return selectedValue === specValue
}

function isSpecDisabled(groupIndex, spec) {
  if (props.skus.length === 0) return false

  const tempSelected = { ...selectedSpecs.value, [groupIndex]: spec }
  const otherGroupIndexes = Object.keys(specGroups.value)
    .map(Number)
    .filter((idx) => idx !== groupIndex)

  return !props.skus.some((sku) => {
    if (!sku.specs || (sku.stock !== undefined && sku.stock <= 0)) return false
    return sku.specs.every((skuSpec) => {
      const gIndex = specGroups.value.findIndex((g) => g.name === (skuSpec.name || '规格'))
      if (gIndex === -1) return false
      const sel = tempSelected[gIndex]
      if (!sel) return true
      const selValue = sel.name || sel.value
      return selValue === skuSpec.value
    })
  })
}

function selectSpec(groupIndex, spec) {
  if (isSpecDisabled(groupIndex, spec)) {
    uni.vibrateShort({ type: 'light' })
    return
  }

  uni.vibrateShort({ type: 'medium' })

  if (isSpecSelected(groupIndex, spec)) {
    delete selectedSpecs.value[groupIndex]
  } else {
    selectedSpecs.value = {
      ...selectedSpecs.value,
      [groupIndex]: spec,
    }
  }
}

function handleSpecTouchStart(groupIndex, spec) {
  touchedSpec.value = { groupIndex, spec }
}

function handleSpecTouchEnd() {
  touchedSpec.value = null
}

function decreaseQuantity() {
  if (quantity.value > 1) {
    quantity.value--
    uni.vibrateShort({ type: 'light' })
  }
}

function increaseQuantity() {
  if (quantity.value < currentStock.value) {
    quantity.value++
    uni.vibrateShort({ type: 'light' })
  }
}

function handleClose() {
  emit('close')
}

function handleAddToCart() {
  const totalGroups = specGroups.value.length
  if (totalGroups > 0) {
    const selectedCount = Object.keys(selectedSpecs.value).length
    if (selectedCount !== totalGroups) {
      uni.showToast({ title: '请选择完整规格', icon: 'none' })
      return
    }
  }

  if (quantity.value <= 0 || quantity.value > currentStock.value) {
    uni.showToast({ title: '请输入有效数量', icon: 'none' })
    return
  }

  uni.vibrateShort({ type: 'medium' })

  emit('addToCart', {
    sku: currentSkuInfo.value,
    quantity: quantity.value,
    selectedSpecs: { ...selectedSpecs.value },
    product: props.product,
  })
}

function handleBuyNow() {
  const totalGroups = specGroups.value.length
  if (totalGroups > 0) {
    const selectedCount = Object.keys(selectedSpecs.value).length
    if (selectedCount !== totalGroups) {
      uni.showToast({ title: '请选择完整规格', icon: 'none' })
      return
    }
  }

  if (quantity.value <= 0 || quantity.value > currentStock.value) {
    uni.showToast({ title: '请输入有效数量', icon: 'none' })
    return
  }

  uni.vibrateShort({ type: 'medium' })

  emit('buyNow', {
    sku: currentSkuInfo.value,
    quantity: quantity.value,
    selectedSpecs: { ...selectedSpecs.value },
    product: props.product,
  })
}
</script>

<style lang="scss" scoped>
.sku-selector {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  pointer-events: none;

  &--visible {
    pointer-events: auto;
  }
}

.sku-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0);
  transition: background $duration-base $ease-out;
  pointer-events: auto;

  &--visible {
    background: rgba(0, 0, 0, 0.5);
  }
}

.sku-content {
  position: relative;
  width: 100%;
  max-height: 85vh;
  background: $bg-color-white;
  border-radius: $radius-xl $radius-xl 0 0;
  display: flex;
  flex-direction: column;
  transform: translateY(100%);
  transition: transform $duration-base $ease-out;
  pointer-events: auto;
  box-shadow: $shadow-xl;

  &--visible {
    transform: translateY(0);
  }
}

.sku-header {
  display: flex;
  padding: $spacing-base;
  padding-top: calc(#{$spacing-base} + #{$safe-area-top});
  border-bottom: 1rpx solid $border-color-light;
  position: relative;
  background: $bg-color-white;
}

.sku-image {
  width: 200rpx;
  height: 200rpx;
  border-radius: $radius-lg;
  margin-top: -60rpx;
  background: $bg-color;
  position: relative;
  z-index: 2;
  border: 4rpx solid $bg-color-white;
  box-shadow: $shadow-md;
  flex-shrink: 0;
}

.sku-info {
  flex: 1;
  margin-left: $spacing-sm;
  padding-top: $spacing-xs;
  min-width: 0;
}

.sku-price {
  display: flex;
  align-items: baseline;
  gap: $spacing-2;
}

.price-symbol {
  font-size: $font-size-base;
  color: $danger-color;
  font-weight: 600;
}

.price-value {
  font-size: $font-size-2xl;
  color: $danger-color;
  font-weight: bold;
  line-height: $line-height-tight;
}

.price-original {
  font-size: $font-size-sm;
  color: $text-color-placeholder;
  text-decoration: line-through;
}

.sku-selected {
  display: block;
  font-size: $font-size-sm;
  color: $text-color-secondary;
  margin-top: $spacing-xs;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sku-stock {
  display: block;
  font-size: $font-size-xs;
  color: $text-color-placeholder;
  margin-top: 4rpx;
}

.sku-close {
  position: absolute;
  top: $spacing-sm;
  right: $spacing-sm;
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.05);
  border-radius: $radius-full;
  transition: background $duration-fast $ease-out;

  &:active {
    background: rgba(0, 0, 0, 0.1);
  }
}

.close-icon {
  font-size: 32rpx;
  color: $text-color-tertiary;
}

.sku-body {
  flex: 1;
  padding: 0 $spacing-base;
  max-height: 55vh;
  background: $bg-color-page;
}

.spec-group {
  padding: $spacing-base 0;
  border-bottom: 1rpx solid $border-color-lighter;
  background: $bg-color-white;
  margin-bottom: $spacing-2;
  border-radius: $radius-md;

  &:last-child {
    border-bottom: none;
  }
}

.spec-group-name {
  display: block;
  font-size: $font-size-base;
  font-weight: 600;
  color: $text-color;
  margin-bottom: $spacing-sm;
  padding: 0 $spacing-2;
}

.spec-list {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-sm;
  padding: 0 $spacing-2;
}

.spec-item {
  padding: 16rpx 32rpx;
  background: $bg-color;
  border-radius: $radius-md;
  font-size: $font-size-sm;
  color: $text-color-secondary;
  border: 2rpx solid transparent;
  transition: all $duration-fast $ease-out;
  position: relative;
  min-width: 80rpx;
  text-align: center;

  &--active {
    background: $brand-primary-alpha-10;
    color: $primary-color;
    border-color: $primary-color;
    transform: scale(1.02);
  }

  &--disabled {
    opacity: 0.45;
    text-decoration: line-through;
    background: $gray-100;

    &::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 10%;
      right: 10%;
      height: 2rpx;
      background: $gray-400;
      transform: translateY(-50%) rotate(-15deg);
    }
  }

  &:active:not(&--disabled) {
    opacity: 0.85;
    transform: scale(0.98);
  }
}

.quantity-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-base;
  background: $bg-color-white;
  margin-bottom: $spacing-2;
  border-radius: $radius-md;
}

.quantity-label {
  font-size: $font-size-base;
  font-weight: 600;
  color: $text-color;
}

.quantity-selector {
  display: flex;
  align-items: center;
  border: 2rpx solid $border-color-light;
  border-radius: $radius-full;
  overflow: hidden;
  background: $bg-color-white;
}

.quantity-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: $font-size-xl;
  color: $text-color-secondary;
  background: $bg-color;
  transition: all $duration-fast $ease-out;

  &--minus {
    border-right: 1rpx solid $border-color-light;
  }

  &--plus {
    border-left: 1rpx solid $border-color-light;
  }

  &--disabled {
    color: $text-color-disabled;
    background: $gray-50;

    &:active {
      transform: none;
    }
  }

  &:active:not(&--disabled) {
    background: $border-color-light;
    transform: scale(0.95);
  }
}

.quantity-input-wrap {
  width: 100rpx;
  text-align: center;
  padding: 0 $spacing-2;
}

.quantity-value {
  font-size: $font-size-lg;
  color: $text-color;
  font-weight: 600;
  background: $bg-color-white;
}

.sku-footer {
  display: flex;
  padding: $spacing-sm $spacing-base;
  padding-bottom: calc(#{$spacing-sm} + #{$safe-area-bottom});
  border-top: 1rpx solid $border-color-light;
  gap: $spacing-sm;
  background: $bg-color-white;
  position: sticky;
  bottom: 0;
}

.footer-btn {
  flex: 1;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-full;
  font-size: $font-size-base;
  font-weight: 600;
  transition: all $duration-fast $ease-out;

  &--cart {
    background: $brand-primary-alpha-10;
    color: $primary-color;
    border: 2rpx solid $primary-color;
  }

  &--buy {
    background: linear-gradient(135deg, $primary-color 0%, $brand-primary-light 100%);
    color: $color-white;
    box-shadow: 0 4rpx 16rpx rgba(37, 99, 235, 0.3);
  }

  &--disabled {
    opacity: 0.5;
    pointer-events: none;

    &:active {
      transform: none;
    }
  }

  &:active:not(&--disabled) {
    opacity: 0.9;
    transform: scale(0.98);
  }
}

@media screen and (max-width: 320px) {
  .sku-header {
    padding: $spacing-sm;
  }

  .sku-image {
    width: 160rpx;
    height: 160rpx;
    margin-top: -40rpx;
  }

  .sku-info {
    margin-left: $spacing-2;
  }

  .price-value {
    font-size: $font-size-xl;
  }

  .spec-item {
    padding: 12rpx 24rpx;
    font-size: $font-size-xs;
  }
}

@media screen and (min-width: 414px) {
  .sku-content {
    max-height: 80vh;
  }

  .sku-body {
    max-height: 50vh;
  }
}
</style>
