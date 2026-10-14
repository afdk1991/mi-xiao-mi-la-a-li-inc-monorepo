<template>
  <view class="pagination">
    <gexm-button size="small" :disabled="current <= 1" @click="handlePrev">上一页</gexm-button>

    <view class="page-info">
      <text>第 {{ current }} 页</text>
      <text class="total">/ {{ totalPages }} 页</text>
    </view>

    <gexm-button size="small" :disabled="current >= totalPages" @click="handleNext">
      下一页
    </gexm-button>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  current: {
    type: Number,
    default: 1,
  },
  total: {
    type: Number,
    default: 0,
  },
  pageSize: {
    type: Number,
    default: 20,
  },
})

const emit = defineEmits(['change'])

const totalPages = computed(() => {
  if (props.total <= 0) return 1
  return Math.ceil(props.total / props.pageSize)
})

function handlePrev() {
  if (props.current > 1) {
    emit('change', props.current - 1)
  }
}

function handleNext() {
  if (props.current < totalPages.value) {
    emit('change', props.current + 1)
  }
}
</script>

<style lang="scss" scoped>
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  padding: 24rpx 0;
}

.page-info {
  font-size: 26rpx;
  color: #666;

  .total {
    color: #999;
  }
}
</style>
