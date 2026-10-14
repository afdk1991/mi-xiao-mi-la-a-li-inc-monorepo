/** * 对话输入框组件 * 支持文本输入、发送按钮、更多操作按钮 */
<template>
  <view class="chat-input-container">
    <!-- 输入区域 -->
    <view class="input-area">
      <!-- 更多按钮 -->
      <view class="more-btn" @click="handleMore">
        <text class="more-icon">➕</text>
      </view>

      <!-- 输入框 -->
      <view class="input-wrapper">
        <textarea
          class="input-field"
          :value="inputValue"
          :placeholder="placeholder"
          :maxlength="maxLength"
          auto-height
          :show-confirm-bar="false"
          :adjust-position="true"
          aria-label="消息输入框"
          @input="handleInput"
          @focus="handleFocus"
          @blur="handleBlur"
        ></textarea>
      </view>

      <!-- 发送按钮 -->
      <view
        class="send-btn"
        :class="{ 'send-btn-active': canSend }"
        role="button"
        aria-label="发送消息"
        @click="handleSend"
      >
        <text class="send-text">发送</text>
      </view>
    </view>

    <!-- 更多操作面板 -->
    <view v-if="showMorePanel" class="more-panel">
      <view class="more-item" @click="handleAction('image')">
        <view class="more-item-icon">📷</view>
        <text class="more-item-text">图片</text>
      </view>
      <view class="more-item" @click="handleAction('file')">
        <view class="more-item-icon">📁</view>
        <text class="more-item-text">文件</text>
      </view>
      <view class="more-item" @click="handleAction('location')">
        <view class="more-item-icon">📍</view>
        <text class="more-item-text">位置</text>
      </view>
    </view>

    <!-- 安全区域 -->
    <view class="safe-area-bottom" :style="{ height: safeAreaHeight }" />
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  placeholder: {
    type: String,
    default: '输入消息...',
  },
  maxLength: {
    type: Number,
    default: 500,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['send', 'more', 'action', 'focus', 'blur'])

// 输入内容
const inputValue = ref('')

// 更多面板显示状态
const showMorePanel = ref(false)

// 安全区域高度
const safeAreaHeight = ref('32rpx')

// 是否可以发送
const canSend = computed(() => {
  return inputValue.value.trim().length > 0 && !props.disabled
})

// 处理输入
function handleInput(e) {
  inputValue.value = e.detail.value
}

// 处理发送
function handleSend() {
  if (!canSend.value) return

  const content = inputValue.value.trim()
  emit('send', content)

  // 清空输入
  inputValue.value = ''
  showMorePanel.value = false
}

// 处理更多按钮
function handleMore() {
  showMorePanel.value = !showMorePanel.value
  emit('more')
}

// 处理更多操作
function handleAction(action) {
  emit('action', action)
  showMorePanel.value = false
}

// 处理聚焦
function handleFocus(e) {
  emit('focus', e)

  // 获取系统安全区域高度
  const systemInfo = uni.getSystemInfoSync()
  safeAreaHeight.value = systemInfo.safeAreaInsets?.bottom + 'px' || '32rpx'
}

// 处理失焦
function handleBlur(e) {
  emit('blur', e)
}

// 暴露方法
defineExpose({
  focus: () => {
    // 聚焦输入框（需要通过ref操作）
  },
  clear: () => {
    inputValue.value = ''
  },
})
</script>

<style lang="scss" scoped>
.chat-input-container {
  background: #f5f7fa;
  border-top: 1rpx solid #ebeef5;
}

.input-area {
  display: flex;
  align-items: flex-end;
  padding: 16rpx 24rpx;
  background: #fff;
}

.more-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  .more-icon {
    font-size: 36rpx;
    color: #606266;
  }
}

.input-wrapper {
  flex: 1;
  margin: 0 16rpx;
  background: #f5f7fa;
  border-radius: 24rpx;
  padding: 12rpx 24rpx;
  min-height: 72rpx;
  max-height: 240rpx;
}

.input-field {
  width: 100%;
  font-size: 30rpx;
  line-height: 1.5;
  color: #303133;
  min-height: 48rpx;
}

.send-btn {
  width: 120rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #c0c4cc;
  border-radius: 24rpx;
  flex-shrink: 0;

  .send-text {
    font-size: 28rpx;
    color: #fff;
  }

  &.send-btn-active {
    background: $uni-color-primary;

    .send-text {
      color: #fff;
    }
  }
}

.more-panel {
  display: flex;
  padding: 24rpx;
  background: #fff;
  border-top: 1rpx solid #ebeef5;
}

.more-item {
  width: 25%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16rpx;

  .more-item-icon {
    width: 96rpx;
    height: 96rpx;
    background: #f5f7fa;
    border-radius: 24rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 40rpx;
  }

  .more-item-text {
    font-size: 24rpx;
    color: #606266;
    margin-top: 12rpx;
  }
}

.safe-area-bottom {
  background: #fff;
}
</style>
