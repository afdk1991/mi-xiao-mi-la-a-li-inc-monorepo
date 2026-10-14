<template>
  <view class="remark-card gexm-card">
    <text class="coupon-row__label">订单备注</text>
    <textarea
      class="remark-input"
      v-model="remark"
      placeholder="选填，请输入订单备注"
      :maxlength="200"
    />
    <text class="remark-count">{{ remark.length }}/200</text>
  </view>
</template>

<script setup lang="ts">
defineModel<{
  remark: string
}>()
</script>

<style lang="scss" scoped>
.remark-card {
  margin: 0 $spacing-base $spacing-base;
}

.remark-input {
  width: 100%;
  min-height: 120rpx;
  font-size: $font-size-sm;
  color: $text-color;
  line-height: 1.6;
  padding: 0;
  background: transparent;
}

.remark-count {
  display: block;
  text-align: right;
  font-size: $font-size-xs;
  color: $text-color-placeholder;
  margin-top: $spacing-xs;
}

.coupon-row__label {
  font-size: $font-size-base;
  color: $text-color;
}
</style>
