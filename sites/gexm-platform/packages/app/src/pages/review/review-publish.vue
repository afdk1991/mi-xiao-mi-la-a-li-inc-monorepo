<template>
  <view class="review-publish-page">
    <gexm-nav-bar title="发表评价" />

    <scroll-view class="review-content" scroll-y>
      <view class="product-info card">
        <image class="product-image" :src="product.image || product.cover" mode="aspectFill" />
        <view class="product-detail">
          <text class="product-name">{{ product.name || product.title || '' }}</text>
          <text class="product-sku">{{ product.skuName || product.specs || '' }}</text>
        </view>
      </view>

      <view class="rating-section card">
        <text class="section-title">商品评分</text>
        <view class="rating-stars">
          <text
            v-for="star in 5"
            :key="star"
            class="star-icon"
            :class="{ 'star-icon--active': star <= rating }"
            @click="setRating(star)"
          >
            ★
          </text>
          <text class="rating-text">{{ ratingText }}</text>
        </view>
      </view>

      <view class="content-section card">
        <text class="section-title">评价内容</text>
        <textarea
          v-model="content"
          class="content-input"
          placeholder="分享您的使用体验，帮助更多小伙伴~"
          placeholder-class="content-placeholder"
          :maxlength="500"
          auto-height
        ></textarea>
        <text class="content-count">{{ content.length }}/500</text>
      </view>

      <view class="images-section card">
        <text class="section-title">上传图片（最多6张）</text>
        <view class="image-list">
          <view v-for="(img, index) in images" :key="index" class="image-item">
            <image class="image-preview" :src="img" mode="aspectFill" />
            <view class="image-delete" @click="deleteImage(index)">
              <text class="delete-icon">✕</text>
            </view>
          </view>
          <view v-if="images.length < 6" class="image-upload" @click="chooseImage">
            <text class="upload-icon">+</text>
            <text class="upload-text">上传图片</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <view class="submit-bar">
      <gexm-button type="primary" size="large" block :loading="submitting" @click="handleSubmit">
        提交评价
      </gexm-button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import reviewApi from '@/api/review'

const product = ref({})
const orderId = ref('')
const skuId = ref('')
const rating = ref(5)
const content = ref('')
const images = ref([])
const submitting = ref(false)

const ratingText = computed(() => {
  const texts = ['', '非常差', '差', '一般', '好', '非常好']
  return texts[rating.value] || ''
})

onLoad((options) => {
  if (options.productId) {
    product.value.id = options.productId
  }
  if (options.orderId) {
    orderId.value = options.orderId
  }
  if (options.skuId) {
    skuId.value = options.skuId
  }
  if (options.productName) {
    product.value.name = decodeURIComponent(options.productName)
  }
  if (options.productImage) {
    product.value.image = decodeURIComponent(options.productImage)
  }
  if (options.skuName) {
    product.value.skuName = decodeURIComponent(options.skuName)
  }
})

function setRating(star) {
  rating.value = star
}

function chooseImage() {
  const remaining = 6 - images.value.length
  uni.chooseImage({
    count: remaining,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      const newImages = res.tempFilePaths || []
      images.value = [...images.value, ...newImages].slice(0, 6)
    },
  })
}

function deleteImage(index) {
  images.value.splice(index, 1)
}

async function uploadImages() {
  if (images.value.length === 0) return []

  const uploadedUrls = []
  for (let i = 0; i < images.value.length; i++) {
    try {
      const result = await uploadSingleImage(images.value[i])
      if (result) {
        uploadedUrls.push(result)
      }
    } catch (e) {
      console.error('Failed to upload image:', e)
    }
  }
  return uploadedUrls
}

function uploadSingleImage(filePath) {
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: '/api/upload',
      filePath: filePath,
      name: 'file',
      success: (res) => {
        try {
          const data = JSON.parse(res.data)
          if (data.url || data.data?.url) {
            resolve(data.url || data.data.url)
          } else {
            reject(new Error('Upload failed'))
          }
        } catch (e) {
          reject(e)
        }
      },
      fail: reject,
    })
  })
}

async function handleSubmit() {
  if (rating.value === 0) {
    uni.showToast({ title: '请选择评分', icon: 'none' })
    return
  }

  if (!content.value.trim()) {
    uni.showToast({ title: '请输入评价内容', icon: 'none' })
    return
  }

  submitting.value = true

  try {
    let uploadedImages = []
    if (images.value.length > 0) {
      uploadedImages = await uploadImages()
    }

    await reviewApi.createReview({
      productId: product.value.id,
      orderId: orderId.value,
      skuId: skuId.value,
      rating: rating.value,
      content: content.value.trim(),
      images: uploadedImages,
    })

    uni.showToast({
      title: '评价成功',
      icon: 'success',
      duration: 1500,
    })

    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch (e) {
    console.error('Failed to publish review:', e)
    uni.showToast({ title: '评价失败，请重试', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.review-publish-page {
  min-height: 100vh;
  background: $bg-color-page;
  display: flex;
  flex-direction: column;
}

.review-content {
  flex: 1;
  height: 0;
  padding-bottom: 140rpx;
}

.product-info {
  display: flex;
  align-items: center;
  margin: $spacing-base;
  padding: $spacing-base;
  background: $bg-color-white;
  border-radius: $border-radius-lg;
  box-shadow: $shadow-sm;
}

.product-image {
  width: 160rpx;
  height: 160rpx;
  border-radius: $border-radius-sm;
}

.product-detail {
  flex: 1;
  margin-left: $spacing-sm;
}

.product-name {
  font-size: $font-size-base;
  color: $text-color;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
}

.product-sku {
  display: block;
  font-size: $font-size-sm;
  color: $text-color-placeholder;
  margin-top: $spacing-xs;
}

.rating-section,
.content-section,
.images-section {
  margin: $spacing-base;
  padding: $spacing-base;
  background: $bg-color-white;
  border-radius: $border-radius-lg;
  box-shadow: $shadow-sm;
}

.section-title {
  display: block;
  font-size: $font-size-md;
  font-weight: 600;
  color: $text-color;
  margin-bottom: $spacing-sm;
}

.rating-stars {
  display: flex;
  align-items: center;
}

.star-icon {
  font-size: 64rpx;
  color: $border-color-lighter;
  margin-right: 8rpx;

  &--active {
    color: $warning-color;
  }
}

.rating-text {
  margin-left: $spacing-sm;
  font-size: $font-size-base;
  color: $warning-color;
  font-weight: 500;
}

.content-input {
  width: 100%;
  min-height: 200rpx;
  font-size: $font-size-base;
  color: $text-color;
  line-height: 1.6;
  padding: 0;
}

.content-placeholder {
  color: $text-color-placeholder;
}

.content-count {
  display: block;
  text-align: right;
  font-size: $font-size-sm;
  color: $text-color-placeholder;
  margin-top: $spacing-xs;
}

.image-list {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-sm;
}

.image-item {
  position: relative;
  width: 180rpx;
  height: 180rpx;
}

.image-preview {
  width: 100%;
  height: 100%;
  border-radius: $border-radius-sm;
}

.image-delete {
  position: absolute;
  top: -12rpx;
  right: -12rpx;
  width: 40rpx;
  height: 40rpx;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-icon {
  font-size: 24rpx;
  color: #fff;
}

.image-upload {
  width: 180rpx;
  height: 180rpx;
  border: 2rpx dashed $border-color;
  border-radius: $border-radius-sm;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: $bg-color;

  &:active {
    opacity: 0.8;
  }
}

.upload-icon {
  font-size: 56rpx;
  color: $text-color-placeholder;
  line-height: 1;
}

.upload-text {
  font-size: $font-size-xs;
  color: $text-color-placeholder;
  margin-top: 8rpx;
}

.submit-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: $spacing-sm $spacing-base;
  padding-bottom: calc(#{$spacing-sm} + #{$safe-area-bottom});
  background: $bg-color-white;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.05);
}
</style>
