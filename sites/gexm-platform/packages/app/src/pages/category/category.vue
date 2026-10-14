<template>
  <view class="category-page">
    <gexm-nav-bar title="商品分类" :showBack="false" />

    <view class="category-search" @click="goSearch">
      <text class="category-search-icon">🔍</text>
      <text class="category-search-placeholder">搜索商品</text>
    </view>

    <view class="category-content">
      <scroll-view class="category-sidebar" scroll-y>
        <view
          v-for="(category, index) in categories"
          :key="category.id"
          class="sidebar-item"
          :class="{ active: currentIndex === index }"
          @click="selectCategory(index, category)"
        >
          <view v-if="currentIndex === index" class="sidebar-indicator" />
          <text class="sidebar-text">{{ category.name }}</text>
        </view>
      </scroll-view>

      <scroll-view class="category-products" scroll-y @scrolltolower="loadMore">
        <view v-if="loading" class="loading-wrap">
          <gexm-loading text="加载中..." />
        </view>
        <view v-else-if="products.length === 0" class="empty-wrap">
          <gexm-empty description="该分类暂无商品" />
        </view>
        <view v-else class="product-grid">
          <gexm-product-card v-for="product in products" :key="product.id" :product="product" />
        </view>
        <view v-if="loadingMore" class="loading-more">
          <gexm-loading text="加载中..." />
        </view>
        <view v-if="!hasMore && products.length > 0" class="no-more">
          <text>没有更多了</text>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useCategoryStore } from '@/store/category'
import { useProductStore } from '@/store/product'

const categoryStore = useCategoryStore()
const productStore = useProductStore()

const loading = ref(false)
const loadingMore = ref(false)
const page = ref(1)
const pageSize = 10
const hasMore = ref(true)
const currentIndex = ref(0)

const products = computed(() => productStore.products)

const categories = computed(() => {
  if (categoryStore.categories.length === 0) {
    return [
      { id: 1, name: '手机数码' },
      { id: 2, name: '电脑办公' },
      { id: 3, name: '家用电器' },
      { id: 4, name: '服饰鞋包' },
      { id: 5, name: '美妆护肤' },
      { id: 6, name: '食品生鲜' },
      { id: 7, name: '图书音像' },
      { id: 8, name: '运动户外' },
    ]
  }
  return categoryStore.categories
})

onMounted(() => {
  loadData()
})

async function loadData() {
  loading.value = true
  try {
    if (categoryStore.categories.length === 0) {
      await categoryStore.fetchCategories().catch(() => {})
    }
    if (categories.value.length > 0) {
      page.value = 1
      hasMore.value = true
      await loadProducts(categories.value[0].id)
    }
  } catch (e) {
    console.error('Load category data failed:', e)
  } finally {
    loading.value = false
  }
}

async function selectCategory(index, category) {
  if (currentIndex.value === index) return
  currentIndex.value = index
  page.value = 1
  hasMore.value = true
  loading.value = true
  try {
    await loadProducts(category.id)
  } catch (e) {
    console.error('Load category products failed:', e)
  } finally {
    loading.value = false
  }
}

async function loadProducts(categoryId) {
  const result = await productStore.fetchProducts({
    page: page.value,
    pageSize,
    categoryId,
  })
  const list = result.data || []
  if (list.length < pageSize) {
    hasMore.value = false
  }
}

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  page.value++
  try {
    const result = await productStore.fetchProducts({
      page: page.value,
      pageSize,
      categoryId: categories.value[currentIndex.value]?.id,
    })
    const list = result.data || []
    if (list.length < pageSize) {
      hasMore.value = false
    }
    if (page.value > 1 && list.length > 0) {
      productStore.products = [...productStore.products, ...list]
    }
  } catch (e) {
    console.error('Load more failed:', e)
  } finally {
    loadingMore.value = false
  }
}

function goSearch() {
  uni.navigateTo({ url: '/pages/product/list' })
}
</script>

<style lang="scss" scoped>
.category-page {
  min-height: 100vh;
  background: $bg-color-page;
  display: flex;
  flex-direction: column;
}

.category-search {
  margin: $spacing-sm $spacing-base;
  height: 64rpx;
  background: $bg-color-white;
  border-radius: 32rpx;
  display: flex;
  align-items: center;
  padding: 0 $spacing-md;
  border: 1rpx solid $border-color-lighter;

  &:active {
    opacity: 0.9;
  }
}

.category-search-icon {
  font-size: 28rpx;
  margin-right: $spacing-xs;
}

.category-search-placeholder {
  font-size: $font-size-sm;
  color: $text-color-placeholder;
}

.category-content {
  flex: 1;
  display: flex;
  overflow: hidden;
  height: 0;
}

.category-sidebar {
  width: 180rpx;
  background: $bg-color-white;
  height: 100%;
}

.sidebar-item {
  position: relative;
  padding: $spacing-md $spacing-sm;
  text-align: center;

  &.active {
    background: $bg-color-page;

    .sidebar-text {
      color: $primary-color;
      font-weight: 600;
    }
  }

  &:active {
    opacity: 0.7;
  }
}

.sidebar-indicator {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 6rpx;
  height: 32rpx;
  background: $primary-color;
  border-radius: 0 3rpx 3rpx 0;
}

.sidebar-text {
  font-size: $font-size-sm;
  color: $text-color-secondary;
}

.category-products {
  flex: 1;
  padding: $spacing-sm;
  height: 100%;
}

.loading-wrap,
.empty-wrap {
  padding: $spacing-xl 0;
}

.product-grid {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-sm;

  :deep(.gexm-product-card) {
    width: calc(50% - 8rpx);
  }
}

.loading-more {
  padding: $spacing-md 0;
}

.no-more {
  text-align: center;
  padding: $spacing-md 0;
  font-size: $font-size-xs;
  color: $text-color-placeholder;
}
</style>
