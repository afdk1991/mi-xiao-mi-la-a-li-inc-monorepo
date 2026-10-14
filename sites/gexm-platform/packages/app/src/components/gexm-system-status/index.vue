<!--
 * 全局底部系统状态栏组件
 * 所属模块：应用全局组件
 * 功能说明：固定在应用底部，展示四项关键运行指标
 *   1. 服务运行状态（健康/异常/未知）
 *   2. 网络连接状态（已连接/未连接）
 *   3. 当前运行平台（H5/微信小程序/鸿蒙App 等）
 *   4. 应用版本号
 * 关键依赖：
 *   - Pinia store（@/store/app）：所有状态均来自 store 集中管理
 *   - Vue Composition API（onMounted/onUnmounted）
 * 设计说明：组件仅做状态订阅与展示，业务逻辑全部下沉至 store，
 *           便于多端复用与单元测试
-->
<template>
  <view class="gexm-system-status" :class="{ 'is-tabbar-page': appStore.isTabBarPage }">
    <view class="gexm-system-status__inner">
      <view class="gexm-system-status__item">
        <view
          class="gexm-system-status__dot"
          :class="`gexm-system-status__dot--${appStore.serviceStatus}`"
        />
        <text
          class="gexm-system-status__value"
          :class="`gexm-system-status__value--${appStore.serviceStatus}`"
        >
          {{ appStore.serviceStatusText }}
        </text>
      </view>

      <view class="gexm-system-status__divider" />

      <view class="gexm-system-status__item">
        <text class="gexm-system-status__label">网络</text>
        <view
          class="gexm-system-status__dot"
          :class="
            appStore.isOnline ? 'gexm-system-status__dot--healthy' : 'gexm-system-status__dot--unhealthy'
          "
        />
        <text
          class="gexm-system-status__value"
          :class="
            appStore.isOnline ? 'gexm-system-status__value--healthy' : 'gexm-system-status__value--unhealthy'
          "
        >
          {{ appStore.networkStatusText }}
        </text>
      </view>

      <view class="gexm-system-status__divider" />

      <view class="gexm-system-status__item">
        <text class="gexm-system-status__label">平台</text>
        <text class="gexm-system-status__value">{{ appStore.platformText }}</text>
      </view>

      <view class="gexm-system-status__divider" />

      <view class="gexm-system-status__item">
        <text class="gexm-system-status__label">版本</text>
        <text class="gexm-system-status__value">{{ appStore.appVersion }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useAppStore } from '@/store/app'

const appStore = useAppStore()

let pageCheckTimer = null

onMounted(() => {
  appStore.checkCurrentPageTabBar()
  pageCheckTimer = setInterval(() => {
    appStore.checkCurrentPageTabBar()
  }, 1500)
})

onUnmounted(() => {
  if (pageCheckTimer) {
    clearInterval(pageCheckTimer)
    pageCheckTimer = null
  }
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

/* ===================== 布局：固定底部状态栏容器 ===================== */
.gexm-system-status {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  z-index: $z-index-fixed;
  background-color: $bg-color-white;
  border-top: 1rpx solid $border-color-light;
  // 移动端浏览器安全区域适配（如 iPhone 底部 Home Indicator）
  // constant() 为旧版 iOS 兼容写法，env() 为 W3C 标准写法，二者并存实现降级
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);

  /* 内部 flex 容器：四项指标横向均分排列 */
  &__inner {
    display: flex;
    align-items: center;
    justify-content: space-around;
    height: 60rpx;
    padding: 0 $spacing-4;
    gap: $spacing-2;
  }

  /* 单项指标容器：flex:1 等分宽度，min-width:0 保证内容可压缩 */
  &__item {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    min-width: 0;
    gap: $spacing-1;
  }

  /* 标签文本（"网络"/"平台"/"版本"）：弱化视觉层级 */
  &__label {
    font-size: $font-size-xs;
    color: $text-color-tertiary;
    white-space: nowrap;
  }

  /* 值文本：超长省略，避免溢出导致换行 */
  &__value {
    font-size: $font-size-xs;
    color: $text-color-secondary;
    font-weight: $font-weight-medium;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    &--healthy {
      color: $color-success;
    }

    &--unhealthy {
      color: $color-danger;
    }

    &--unknown {
      color: $text-color-tertiary;
    }
  }

  /* ===================== 状态点样式与动画 ===================== */
  &__dot {
    width: 8rpx;
    height: 8rpx;
    border-radius: 50%;
    flex-shrink: 0;

    /* 健康：绿色 + 2s 慢脉冲，传递"运行平稳"的视觉感知 */
    &--healthy {
      background-color: $color-success;
      animation: gexm-status-pulse-success 2s infinite;
    }

    /* 异常：红色 + 1s 快脉冲，传递"需关注"的紧迫感 */
    &--unhealthy {
      background-color: $color-danger;
      animation: gexm-status-pulse-danger 1s infinite;
    }

    /* 未知：灰色无动画，表示尚未完成首次检测 */
    &--unknown {
      background-color: $text-color-tertiary;
    }
  }

  /* 分隔线：垂直分隔四项指标 */
  &__divider {
    width: 1rpx;
    height: 60%;
    background-color: $border-color-light;
    flex-shrink: 0;
  }

  /* ===================== tabBar 页面避让 ===================== */
  // tabBar 页面时，底部栏上移避开 tabBar（显示在 tabBar 之上）
  &.is-tabbar-page {
    bottom: $tab-bar-height;
  }
}

// 状态点脉冲动画（正常绿色，缓慢脉冲；异常红色，快速脉冲）
// 通过 box-shadow 的扩散与衰减实现"呼吸"效果
@keyframes gexm-status-pulse-success {
  0% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5);
  }
  70% {
    box-shadow: 0 0 0 6rpx rgba(16, 185, 129, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
  }
}

@keyframes gexm-status-pulse-danger {
  0% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5);
  }
  70% {
    box-shadow: 0 0 0 6rpx rgba(239, 68, 68, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
  }
}

/* ===================== 响应式适配 =====================
 * 仅 H5 端生效；小程序/App 由 rpx 根据屏幕宽度自动缩放，无需媒体查询
 * 断点与 variables.scss 的 $breakpoint-* 保持一致，避免硬编码
 */

// 平板（414px - 767px）：紧凑内边距，避免横向过宽
@media screen and (max-width: #{$breakpoint-lg - 1px}) and (min-width: $breakpoint-md) {
  .gexm-system-status__inner {
    padding: 0 $spacing-3;
  }
}

// 手机（<414px）：高度收紧、间距压缩，适配小屏
@media screen and (max-width: #{$breakpoint-md - 1px}) {
  .gexm-system-status__inner {
    height: 56rpx;
    padding: 0 $spacing-2;
    gap: $spacing-1;
  }

  .gexm-system-status__item {
    gap: 2rpx;
  }
}

// 超小屏（<375px）：隐藏标签，仅显示状态点与值，避免换行
@media screen and (max-width: #{$breakpoint-sm - 1px}) {
  .gexm-system-status__label {
    display: none;
  }

  .gexm-system-status__inner {
    gap: $spacing-1;
  }
}
</style>
