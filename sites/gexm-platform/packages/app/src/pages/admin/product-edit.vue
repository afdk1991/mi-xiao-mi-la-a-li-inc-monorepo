<template>
  <view class="edit-page">
    <gexm-nav-bar :title="isEdit ? '编辑商品' : '新增商品'" :showBack="true" />

    <scroll-view class="edit-content" scroll-y>
      <view class="form-item">
        <text class="label">商品名称 *</text>
        <gexm-input v-model="form.name" placeholder="请输入商品名称" />
      </view>

      <view class="form-item">
        <text class="label">商品副标题</text>
        <gexm-input v-model="form.subtitle" placeholder="请输入商品副标题" />
      </view>

      <view class="form-item">
        <text class="label">商品分类</text>
        <picker
          mode="selector"
          :range="categoryOptions"
          range-key="name"
          @change="onCategoryChange"
        >
          <view class="picker-value">
            {{ selectedCategory ? selectedCategory.name : '请选择分类' }}
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>

      <view class="form-item">
        <text class="label">商品价格 *</text>
        <view class="price-input">
          <text class="price-symbol">¥</text>
          <gexm-input v-model="form.price" type="digit" placeholder="0.00" />
        </view>
      </view>

      <view class="form-item">
        <text class="label">原价</text>
        <view class="price-input">
          <text class="price-symbol">¥</text>
          <gexm-input v-model="form.original_price" type="digit" placeholder="0.00" />
        </view>
      </view>

      <view class="form-item">
        <text class="label">库存</text>
        <gexm-input v-model="form.stock" type="number" placeholder="请输入库存数量" />
      </view>

      <view class="form-item">
        <text class="label">商品图片</text>
        <view class="image-upload">
          <view v-if="form.main_image" class="uploaded-image" @click="uploadMainImage">
            <image :src="form.main_image" mode="aspectFill" />
            <text class="reupload">点击更换</text>
          </view>
          <view v-else class="upload-btn" @click="uploadMainImage">
            <text class="upload-icon">+</text>
            <text>上传主图</text>
          </view>
        </view>
      </view>

      <view class="form-item">
        <text class="label">商品状态</text>
        <view class="status-selector">
          <view
            :class="['status-option', { active: form.status === 'on_sale' }]"
            @click="form.status = 'on_sale'"
          >
            上架
          </view>
          <view
            :class="['status-option', { active: form.status === 'off_sale' }]"
            @click="form.status = 'off_sale'"
          >
            下架
          </view>
        </view>
      </view>

      <view class="form-item">
        <text class="label">商品描述</text>
        <textarea
          v-model="form.description"
          class="desc-textarea"
          placeholder="请输入商品描述"
        ></textarea>
      </view>

      <view class="submit-area">
        <gexm-button type="primary" size="large" @click="submitForm">
          {{ isEdit ? '保存修改' : '创建商品' }}
        </gexm-button>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { adminApi } from '@/api/admin'
import categoryApi from '@/api/category'
import { uploadApi } from '@/api/upload'

const isEdit = ref(false)
const productId = ref('')
const loading = ref(false)
const categories = ref([])

const form = ref({
  name: '',
  subtitle: '',
  category_id: '',
  main_image: '',
  images: '[]',
  price: '',
  original_price: '',
  stock: '100',
  description: '',
  status: 'on_sale',
  sort_order: '0',
  skus: '[]',
})

const categoryOptions = computed(() => categories.value)

const selectedCategory = computed(() =>
  categoryOptions.value.find((c) => c.id === form.value.category_id)
)

onMounted(() => {
  loadCategories()
  loadProduct()
})

async function loadCategories() {
  try {
    const res = await categoryApi.getCategoryTree()
    categories.value = res.data || []
  } catch (e) {
    console.error('加载分类失败', e)
  }
}

async function loadProduct() {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = currentPage.$page?.options || currentPage.options || {}

  if (options.id) {
    isEdit.value = true
    productId.value = options.id
    try {
      const res = await adminApi.getProductDetail(options.id)
      const product = res.data
      form.value = {
        name: product.name || '',
        subtitle: product.subtitle || '',
        category_id: product.category_id || '',
        main_image: product.main_image || '',
        images: product.images || '[]',
        price: String(product.price || ''),
        original_price: String(product.original_price || ''),
        stock: String(product.stock || '100'),
        description: product.description || '',
        status: product.status || 'on_sale',
        sort_order: String(product.sort_order || '0'),
        skus: product.skus || '[]',
      }
    } catch (e) {
      console.error('加载商品失败', e)
      uni.showToast({ title: '加载失败', icon: 'none' })
    }
  }
}

function onCategoryChange(e) {
  const index = e.detail.value
  form.value.category_id = categoryOptions.value[index].id
}

async function uploadMainImage() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      const tempFilePath = res.tempFilePaths[0]
      try {
        const uploadRes = await uploadApi.upload(tempFilePath)
        form.value.main_image = uploadRes.data.url
      } catch (e) {
        uni.showToast({ title: '上传失败', icon: 'none' })
      }
    },
  })
}

async function submitForm() {
  if (!form.value.name.trim()) {
    uni.showToast({ title: '请输入商品名称', icon: 'none' })
    return
  }
  if (!form.value.price) {
    uni.showToast({ title: '请输入商品价格', icon: 'none' })
    return
  }

  loading.value = true
  try {
    const data = {
      ...form.value,
      price: parseFloat(form.value.price),
      original_price: form.value.original_price ? parseFloat(form.value.original_price) : undefined,
      stock: parseInt(form.value.stock, 10) || 0,
      sort_order: parseInt(form.value.sort_order, 10) || 0,
    }

    if (isEdit.value) {
      await adminApi.updateProduct(productId.value, data)
    } else {
      await adminApi.createProduct(data)
    }

    uni.showToast({ title: isEdit.value ? '更新成功' : '创建成功', icon: 'success' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.edit-page {
  min-height: 100vh;
  background: #f5f7fa;
}

.edit-content {
  height: calc(100vh - 88rpx);
  padding: 24rpx;
}

.form-item {
  background: #fff;
  padding: 24rpx;
  margin-bottom: 24rpx;
  border-radius: 12rpx;
}

.label {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
  margin-bottom: 16rpx;
  display: block;
}

.picker-value {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20rpx;
  height: 80rpx;
  background: #f5f7fa;
  border-radius: 8rpx;
  font-size: 28rpx;
  color: #666;
}

.picker-arrow {
  font-size: 20rpx;
  color: #999;
}

.price-input {
  display: flex;
  align-items: center;
}

.price-symbol {
  font-size: 32rpx;
  color: #333;
  margin-right: 12rpx;
}

.image-upload {
  margin-top: 16rpx;
}

.uploaded-image {
  position: relative;
  width: 200rpx;
  height: 200rpx;
  border-radius: 8rpx;
  overflow: hidden;

  image {
    width: 100%;
    height: 100%;
  }

  .reupload {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(0, 0, 0, 0.5);
    color: #fff;
    font-size: 22rpx;
    text-align: center;
    padding: 8rpx 0;
  }
}

.upload-btn {
  width: 200rpx;
  height: 200rpx;
  border: 2rpx dashed #d9d9d9;
  border-radius: 8rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;

  .upload-icon {
    font-size: 48rpx;
    color: #999;
  }

  text {
    font-size: 24rpx;
    color: #999;
  }
}

.status-selector {
  display: flex;
  gap: 24rpx;
  margin-top: 16rpx;
}

.status-option {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  text-align: center;
  border-radius: 8rpx;
  font-size: 28rpx;
  background: #f5f7fa;
  color: #666;

  &.active {
    background: #409eff;
    color: #fff;
  }
}

.desc-textarea {
  width: 100%;
  height: 200rpx;
  padding: 20rpx;
  background: #f5f7fa;
  border-radius: 8rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.submit-area {
  padding: 24rpx 0 48rpx;
}
</style>
