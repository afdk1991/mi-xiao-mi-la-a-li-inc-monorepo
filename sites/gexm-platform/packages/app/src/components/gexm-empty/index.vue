<template>
  <view class="gexm-empty">
    <view class="gexm-empty__image">
      <text class="gexm-empty__icon">📭</text>
    </view>
    <text class="gexm-empty__text">{{ description }}</text>
    <gexm-button v-if="showButton" size="small" type="primary" @click="handleClick">
      {{ buttonText }}
    </gexm-button>
  </view>
</template>

<script setup>
defineProps({
  description: {
    type: String,
    default: '暂无数据',
  },
  showButton: Boolean,
  buttonText: {
    type: String,
    default: '重新加载',
  },
})

const emit = defineEmits(['click'])

function handleClick() {
  emit('click')
}
</script>

<style lang="scss" scoped>
.gexm-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: $spacing-xl 0;

  &__image {
    margin-bottom: $spacing-base;
  }

  &__icon {
    font-size: 120rpx;
    opacity: 0.5;
  }

  &__text {
    font-size: $font-size-base;
    color: $text-color-placeholder;
    margin-bottom: $spacing-md;
  }
}
</style>
