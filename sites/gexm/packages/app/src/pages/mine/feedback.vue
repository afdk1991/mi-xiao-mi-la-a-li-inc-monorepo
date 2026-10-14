<template>
  <view class="feedback-page">
    <gexm-nav-bar title="意见反馈" />

    <view class="feedback-content">
      <view class="feedback-form">
        <view class="feedback-section">
          <text class="feedback-label">反馈类型</text>
          <view class="feedback-types">
            <view
              v-for="type in feedbackTypes"
              :key="type.value"
              class="feedback-type-item"
              :class="{ active: form.type === type.value }"
              @click="form.type = type.value"
            >
              <text>{{ type.label }}</text>
            </view>
          </view>
        </view>

        <view class="feedback-section">
          <text class="feedback-label">反馈内容</text>
          <textarea
            v-model="form.content"
            class="feedback-textarea"
            placeholder="请详细描述您遇到的问题或建议..."
            maxlength="500"
            aria-label="反馈内容"
          ></textarea>
          <text class="feedback-count">{{ form.content.length }}/500</text>
        </view>

        <view class="feedback-section">
          <text class="feedback-label">联系方式（选填）</text>
          <gexm-input v-model="form.contact" placeholder="请输入手机号或邮箱" />
        </view>
      </view>

      <gexm-button type="primary" size="large" block :loading="loading" @click="handleSubmit">
        提交反馈
      </gexm-button>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue'

const feedbackTypes = [
  { label: '功能建议', value: 'suggestion' },
  { label: 'Bug反馈', value: 'bug' },
  { label: '体验问题', value: 'experience' },
  { label: '其他', value: 'other' },
]

const form = reactive({
  type: 'suggestion',
  content: '',
  contact: '',
})

const loading = ref(false)

async function handleSubmit() {
  if (!form.content.trim()) {
    uni.showToast({ title: '请输入反馈内容', icon: 'none' })
    return
  }

  if (form.content.length < 10) {
    uni.showToast({ title: '反馈内容至少10个字', icon: 'none' })
    return
  }

  loading.value = true
  try {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    uni.showToast({ title: '提交成功，感谢您的反馈', icon: 'success' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch (err) {
    console.error('Submit feedback failed:', err)
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.feedback-page {
  min-height: 100vh;
  background: $bg-color-page;
}

.feedback-content {
  padding: 24rpx;
}

.feedback-form {
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 32rpx;
  box-shadow: $shadow-sm;
}

.feedback-section {
  margin-bottom: 32rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.feedback-label {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: $text-color;
  margin-bottom: 16rpx;
}

.feedback-types {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.feedback-type-item {
  padding: 12rpx 24rpx;
  background: $bg-color;
  border-radius: 32rpx;
  font-size: 26rpx;
  color: $text-color-secondary;
  border: 1rpx solid transparent;

  &.active {
    background: rgba(64, 158, 255, 0.1);
    color: $primary-color;
    border-color: $primary-color;
  }
}

.feedback-textarea {
  width: 100%;
  height: 240rpx;
  padding: 20rpx;
  background: $bg-color;
  border-radius: 12rpx;
  font-size: 28rpx;
  line-height: 1.6;
}

.feedback-count {
  display: block;
  text-align: right;
  font-size: 24rpx;
  color: $text-color-placeholder;
  margin-top: 8rpx;
}
</style>
