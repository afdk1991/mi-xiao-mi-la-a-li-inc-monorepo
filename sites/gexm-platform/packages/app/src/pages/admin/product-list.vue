<template>
  <view class="admin-page">
    <gexm-nav-bar title="商品管理" />

    <view class="admin-content">
      <view class="filter-bar">
        <gexm-input v-model="keyword" placeholder="搜索商品名称" class="search-input" />
        <picker
          mode="selector"
          :range="categoryOptions"
          range-key="name"
          @change="onCategoryChange"
        >
          <view class="picker-btn">
            {{ selectedCategory ? selectedCategory.name : '全部分类' }}
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
        <picker mode="selector" :range="statusOptions" range-key="label" @change="onStatusChange">
          <view class="picker-btn">
            {{ selectedStatus ? selectedStatus.label : '全部状态' }}
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
        <gexm-button type="primary" @click="loadProducts">搜索</gexm-button>
      </view>

      <view class="action-bar">
        <gexm-button type="primary" @click="goAddProduct">新增商品</gexm-button>
        <gexm-button v-if="selectedIds.length > 0" type="danger" @click="batchDelete">
          批量删除 ({{ selectedIds.length }})
        </gexm-button>
        <gexm-button v-if="selectedIds.length > 0" @click="batchOnSale">
          批量上架 ({{ selectedIds.length }})
        </gexm-button>
        <gexm-button v-if="selectedIds.length > 0" @click="batchOffSale">
          批量下架 ({{ selectedIds.length }})
        </gexm-button>
      </view>

      <gexm-loading v-if="loading" />

      <view v-else-if="products.length === 0" class="empty-state">
        <gexm-empty text="暂无商品数据" />
      </view>

      <scroll-view v-else class="product-list" scroll-y>
        <view
          v-for="product in products"
          :key="product.id"
          class="product-item"
          :class="{ selected: selectedIds.includes(product.id) }"
          @click="toggleSelect(product.id)"
        >
          <view class="checkbox">
            <view v-if="selectedIds.includes(product.id)" class="checked">✓</view>
          </view>
          <image :src="product.main_image" class="product-image" mode="aspectFill" />
          <view class="product-info">
            <text class="product-name">{{ product.name }}</text>
            <text class="product-subtitle">{{ product.subtitle }}</text>
            <view class="product-meta">
              <text class="price">¥{{ product.price }}</text>
              <text class="stock">库存: {{ product.stock }}</text>
              <text :class="['status', product.status]">
                {{ product.status === 'on_sale' ? '上架' : '下架' }}
              </text>
            </view>
          </view>
          <view class="product-actions">
            <gexm-button size="small" @click.stop="editProduct(product)">编辑</gexm-button>
            <gexm-button
              size="small"
              :type="product.status === 'on_sale' ? 'warning' : 'primary'"
              @click.stop="toggleStatus(product)"
            >
              {{ product.status === 'on_sale' ? '下架' : '上架' }}
            </gexm-button>
            <gexm-button size="small" type="danger" @click.stop="deleteProduct(product)">
              删除
            </gexm-button>
          </view>
        </view>
      </scroll-view>

      <gexm-pagination
        v-if="total > 0"
        :current="page"
        :total="total"
        :pageSize="pageSize"
        @change="onPageChange"
      />
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { adminApi } from '@/api/admin'
import categoryApi from '@/api/category'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const loading = ref(false)
const products = ref([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const keyword = ref('')
const selectedCategoryId = ref('')
const selectedStatusValue = ref('')
const selectedIds = ref([])
const categories = ref([])

const statusOptions = [
  { value: 'on_sale', label: '上架' },
  { value: 'off_sale', label: '下架' },
]

const categoryOptions = computed(() => [{ id: '', name: '全部分类' }, ...categories.value])

const selectedCategory = computed(() =>
  categoryOptions.value.find((c) => c.id === selectedCategoryId.value)
)

const selectedStatus = computed(() =>
  statusOptions.find((s) => s.value === selectedStatusValue.value)
)

onMounted(() => {
  if (!checkAdminPermission()) return
  loadCategories()
  loadProducts()
})

function checkAdminPermission() {
  if (!userStore.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' })
    return false
  }
  if (userStore.role !== 'admin') {
    uni.showToast({ title: '需要管理员权限', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
    return false
  }
  return true
}

async function loadCategories() {
  try {
    const res = await categoryApi.getCategoryTree()
    categories.value = res.data || []
  } catch (e) {
    console.error('加载分类失败', e)
  }
}

async function loadProducts() {
  loading.value = true
  try {
    const params = {
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value,
      categoryId: selectedCategoryId.value,
      status: selectedStatusValue.value,
    }
    const res = await adminApi.getProducts(params)
    products.value = res.data || []
    total.value = res.total || 0
  } catch (e) {
    console.error('加载商品失败', e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function onPageChange(newPage) {
  page.value = newPage
  loadProducts()
}

function onCategoryChange(e) {
  const index = e.detail.value
  selectedCategoryId.value = categoryOptions.value[index].id
  page.value = 1
  loadProducts()
}

function onStatusChange(e) {
  const index = e.detail.value
  selectedStatusValue.value = statusOptions[index].value
  page.value = 1
  loadProducts()
}

function toggleSelect(id) {
  const index = selectedIds.value.indexOf(id)
  if (index > -1) {
    selectedIds.value.splice(index, 1)
  } else {
    selectedIds.value.push(id)
  }
}

function goAddProduct() {
  uni.navigateTo({ url: '/pages/admin/product-edit' })
}

function editProduct(product) {
  uni.navigateTo({ url: `/pages/admin/product-edit?id=${product.id}` })
}

async function toggleStatus(product) {
  const newStatus = product.status === 'on_sale' ? 'off_sale' : 'on_sale'
  try {
    await adminApi.updateProductStatus(product.id, newStatus)
    product.status = newStatus
    uni.showToast({ title: '更新成功', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '更新失败', icon: 'none' })
  }
}

async function deleteProduct(product) {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除商品「${product.name}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await adminApi.deleteProduct(product.id)
          loadProducts()
          uni.showToast({ title: '删除成功', icon: 'success' })
        } catch (e) {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    },
  })
}

async function batchDelete() {
  uni.showModal({
    title: '批量删除',
    content: `确定要删除选中的 ${selectedIds.value.length} 个商品吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await adminApi.batchDeleteProducts(selectedIds.value)
          selectedIds.value = []
          loadProducts()
          uni.showToast({ title: '删除成功', icon: 'success' })
        } catch (e) {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    },
  })
}

async function batchOnSale() {
  try {
    await adminApi.batchUpdateProductStatus(selectedIds.value, 'on_sale')
    selectedIds.value = []
    loadProducts()
    uni.showToast({ title: '批量上架成功', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

async function batchOffSale() {
  try {
    await adminApi.batchUpdateProductStatus(selectedIds.value, 'off_sale')
    selectedIds.value = []
    loadProducts()
    uni.showToast({ title: '批量下架成功', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
.admin-page {
  min-height: 100vh;
  background: #f5f7fa;
}

.admin-content {
  padding: 16rpx;
}

.filter-bar {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
  flex-wrap: wrap;
}

.search-input {
  flex: 1;
  min-width: 300rpx;
}

.picker-btn {
  padding: 0 24rpx;
  height: 72rpx;
  line-height: 72rpx;
  background: #fff;
  border-radius: 8rpx;
  font-size: 28rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
  border: 1rpx solid #e0e0e0;
}

.picker-arrow {
  font-size: 20rpx;
  color: #999;
}

.action-bar {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
  flex-wrap: wrap;
}

.product-list {
  height: calc(100vh - 400rpx);
}

.product-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background: #fff;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
  border: 2rpx solid transparent;

  &.selected {
    border-color: #409eff;
  }
}

.checkbox {
  width: 48rpx;
  height: 48rpx;
  border: 2rpx solid #d9d9d9;
  border-radius: 8rpx;
  margin-right: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  .checked {
    width: 100%;
    height: 100%;
    background: #409eff;
    color: #fff;
    font-size: 24rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6rpx;
  }
}

.product-image {
  width: 160rpx;
  height: 160rpx;
  border-radius: 8rpx;
  margin-right: 20rpx;
}

.product-info {
  flex: 1;
  min-width: 0;
}

.product-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-subtitle {
  font-size: 24rpx;
  color: #999;
  display: block;
  margin-bottom: 12rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-meta {
  display: flex;
  gap: 16rpx;
  align-items: center;
}

.price {
  font-size: 32rpx;
  font-weight: 600;
  color: #ff4d4f;
}

.stock {
  font-size: 24rpx;
  color: #666;
}

.status {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 4rpx;

  &.on_sale {
    background: #f6ffed;
    color: #52c41a;
  }

  &.off_sale {
    background: #fff2f0;
    color: #ff4d4f;
  }
}

.product-actions {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.empty-state {
  padding: 100rpx 0;
}
</style>
