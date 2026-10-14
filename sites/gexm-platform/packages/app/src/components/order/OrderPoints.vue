<template>
  <view class="points-card gexm-card">
    <view class="points-row">
      <text class="points-row__icon">⭐</text>
      <view class="points-row__info">
        <text class="points-row__label">积分抵扣</text>
        <text class="points-row__balance">可用积分：{{ pointsBalance }}</text>
      </view>
      <switch
        class="points-row__switch"
        :checked="usePoints"
        @change="handlePointsSwitch"
      />
    </view>
    <view v-if="usePoints && pointsBalance > 0" class="points-slider">
      <text class="points-slider__label">抵扣积分</text>
      <input
        class="points-slider__input"
        type="number"
        v-model="pointsToUse"
        :max="pointsBalance"
        :min="0"
      />
      <view class="points-slider__range">
        <text class="points-slider__text">0</text>
        <text class="points-slider__text points-slider__text--value">{{ pointsToUse }}</text>
        <text class="points-slider__text">{{ pointsBalance }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  pointsBalance: number
  usePoints: boolean
  pointsToUse: number
  goodsTotal: number
}>()

const emit = defineEmits<{
  (e: 'update:usePoints', value: boolean): void
  (e: 'update:pointsToUse', value: number): void
}>()

function handlePointsSwitch(e: { detail: { value: boolean } }) {
  emit('update:usePoints', e.detail.value)
}
</script>

<style lang="scss" scoped>
.points-card {
  margin: 0 $spacing-base $spacing-base;
}

.points-row {
  display: flex;
  align-items: center;

  &__icon {
    font-size: 36rpx;
    margin-right: $spacing-sm;
  }

  &__info {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  &__label {
    font-size: $font-size-base;
    color: $text-color;
  }

  &__balance {
    font-size: $font-size-sm;
    color: $text-color-secondary;
    margin-top: 4rpx;
  }

  &__switch {
    margin-left: $spacing-sm;
  }
}

.points-slider {
  margin-top: $spacing-base;
  padding-top: $spacing-base;
  border-top: 1rpx solid $border-color-lighter;

  &__label {
    font-size: $font-size-sm;
    color: $text-color-secondary;
    margin-bottom: $spacing-sm;
  }

  &__input {
    padding: 0;
  }

  &__range {
    display: flex;
    justify-content: space-between;
    margin-top: $spacing-xs;
  }

  &__text {
    font-size: $font-size-xs;
    color: $text-color-placeholder;

    &--value {
      color: $primary-color;
      font-weight: 500;
    }
  }
}
</style>
