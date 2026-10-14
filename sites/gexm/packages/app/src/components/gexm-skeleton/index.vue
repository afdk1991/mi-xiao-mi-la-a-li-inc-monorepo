<template>
  <view class="skeleton-container" :class="{ 'skeleton-animated': animated }">
    <view v-if="mode === 'image'" class="skeleton-image" :style="imageStyle">
      <view class="skeleton-image-inner" />
    </view>

    <view v-else-if="mode === 'text'" class="skeleton-text">
      <view
        v-for="(line, index) in lines"
        :key="index"
        class="skeleton-text-line"
        :style="{ width: line.width, height: line.height }"
      />
    </view>

    <view v-else-if="mode === 'card'" class="skeleton-card">
      <view class="skeleton-card-image">
        <view class="skeleton-card-image-inner" />
      </view>
      <view class="skeleton-card-content">
        <view class="skeleton-card-title" />
        <view class="skeleton-card-desc" />
        <view class="skeleton-card-footer">
          <view class="skeleton-card-price" />
          <view class="skeleton-card-tag" />
        </view>
      </view>
    </view>

    <view v-else-if="mode === 'list'" class="skeleton-list">
      <view v-for="i in count" :key="i" class="skeleton-list-item">
        <view class="skeleton-list-image">
          <view class="skeleton-list-image-inner" />
        </view>
        <view class="skeleton-list-content">
          <view class="skeleton-list-title" />
          <view class="skeleton-list-desc" />
          <view class="skeleton-list-meta" />
        </view>
      </view>
    </view>

    <view v-else-if="mode === 'avatar'" class="skeleton-avatar" :style="avatarStyle">
      <view class="skeleton-avatar-inner" />
    </view>

    <view v-else-if="mode === 'custom'" class="skeleton-custom">
      <slot></slot>
    </view>

    <view v-else class="skeleton-rect" :style="rectStyle" />
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  mode: {
    type: String,
    default: 'rect',
    validator: (value) =>
      ['rect', 'image', 'text', 'card', 'list', 'avatar', 'custom'].includes(value),
  },
  animated: {
    type: Boolean,
    default: true,
  },
  lines: {
    type: Array,
    default: () => [
      { width: '100%', height: '24rpx' },
      { width: '80%', height: '20rpx' },
      { width: '60%', height: '20rpx' },
    ],
  },
  count: {
    type: Number,
    default: 3,
  },
  width: {
    type: String,
    default: '100%',
  },
  height: {
    type: String,
    default: '80rpx',
  },
  borderRadius: {
    type: String,
    default: '8rpx',
  },
  size: {
    type: String,
    default: 'normal',
    validator: (value) => ['small', 'normal', 'large'].includes(value),
  },
})

const rectStyle = computed(() => ({
  width: props.width,
  height: props.height,
  borderRadius: props.borderRadius,
}))

const imageStyle = computed(() => ({
  width: props.width,
  height: props.height || '300rpx',
  borderRadius: props.borderRadius,
}))

const avatarStyle = computed(() => {
  const sizeMap = {
    small: '80rpx',
    normal: '120rpx',
    large: '160rpx',
  }
  return {
    width: props.width || sizeMap[props.size],
    height: props.height || sizeMap[props.size],
    borderRadius: '50%',
  }
})
</script>

<style lang="scss" scoped>
.skeleton-container {
  background: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.05) 25%,
    rgba(0, 0, 0, 0.1) 50%,
    rgba(0, 0, 0, 0.05) 75%
  );
  background-size: 200% 100%;
  border-radius: 8rpx;
  overflow: hidden;
}

.skeleton-animated {
  animation: skeletonShimmer 1.5s infinite;
}

@keyframes skeletonShimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.skeleton-rect {
  width: 100%;
  height: 80rpx;
}

.skeleton-image {
  position: relative;
  overflow: hidden;

  .skeleton-image-inner {
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.08);
    border-radius: inherit;
  }
}

.skeleton-text {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 8rpx 0;

  .skeleton-text-line {
    height: 24rpx;
    background: rgba(0, 0, 0, 0.08);
    border-radius: 4rpx;
  }
}

.skeleton-card {
  display: flex;
  padding: 24rpx;
  background: #ffffff;
  border-radius: 16rpx;
  gap: 24rpx;

  .skeleton-card-image {
    width: 200rpx;
    height: 200rpx;
    border-radius: 12rpx;
    overflow: hidden;
    flex-shrink: 0;

    .skeleton-card-image-inner {
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.08);
    }
  }

  .skeleton-card-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 16rpx;
    justify-content: center;

    .skeleton-card-title {
      width: 100%;
      height: 32rpx;
      background: rgba(0, 0, 0, 0.08);
      border-radius: 4rpx;
    }

    .skeleton-card-desc {
      width: 80%;
      height: 24rpx;
      background: rgba(0, 0, 0, 0.06);
      border-radius: 4rpx;
    }

    .skeleton-card-footer {
      display: flex;
      align-items: center;
      gap: 16rpx;
      margin-top: 8rpx;

      .skeleton-card-price {
        width: 120rpx;
        height: 32rpx;
        background: rgba(255, 99, 71, 0.1);
        border-radius: 4rpx;
      }

      .skeleton-card-tag {
        width: 80rpx;
        height: 24rpx;
        background: rgba(0, 0, 0, 0.06);
        border-radius: 12rpx;
      }
    }
  }
}

.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;

  .skeleton-list-item {
    display: flex;
    align-items: center;
    gap: 20rpx;
    padding: 16rpx 0;

    .skeleton-list-image {
      width: 120rpx;
      height: 120rpx;
      border-radius: 12rpx;
      overflow: hidden;
      flex-shrink: 0;

      .skeleton-list-image-inner {
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.08);
      }
    }

    .skeleton-list-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 12rpx;
      min-width: 0;

      .skeleton-list-title {
        width: 100%;
        height: 28rpx;
        background: rgba(0, 0, 0, 0.08);
        border-radius: 4rpx;
      }

      .skeleton-list-desc {
        width: 70%;
        height: 22rpx;
        background: rgba(0, 0, 0, 0.06);
        border-radius: 4rpx;
      }

      .skeleton-list-meta {
        width: 50%;
        height: 20rpx;
        background: rgba(0, 0, 0, 0.05);
        border-radius: 4rpx;
      }
    }
  }
}

.skeleton-avatar {
  position: relative;
  overflow: hidden;

  .skeleton-avatar-inner {
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.08);
    border-radius: 50%;
  }
}

.skeleton-custom {
  width: 100%;
}
</style>
